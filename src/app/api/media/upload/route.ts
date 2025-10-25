import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, generateR2Key } from '@/lib/r2';
import { prisma } from '@/lib/prisma';
import { optimizeMedia } from '@/lib/imageOptimizer';
import { supabaseServer } from '@/lib/supabase-server';

// アップロード可能なファイル形式
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// 最大ファイルサイズ (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    console.log('[API /media/upload] Request received');

    // 認証トークンを取得
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // トークンを検証してユーザー情報を取得
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      console.error('[API /media/upload] Auth error:', authError);
      return NextResponse.json(
        { success: false, error: '認証に失敗しました' },
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[API /media/upload] ここまでは来てる');

    // ユーザー情報からwedding_idを取得
    const dbUser = await prisma.user.findUnique({
      where: { user_id: user.id },
      select: { wedding_id: true },
    });

    console.log('[API /media/upload] dbUser', dbUser);

    if (!dbUser) {
      console.error('[API /media/upload] User not found in database:', user.id);
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const weddingId = dbUser.wedding_id;

    console.log('[API /media/upload] Wedding ID:', weddingId);

    // wedding_idが実際に存在するか検証
    const weddingExists = await prisma.wedding.findUnique({
      where: { wedding_id: weddingId },
      select: { wedding_id: true },
    });

    if (!weddingExists) {
      console.error('[API /media/upload] Wedding not found:', weddingId);
      return NextResponse.json(
        { success: false, error: '結婚式情報が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const postedUserName = formData.get('postedUserName') as string;

    // バリデーション
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ファイルが選択されていません' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!postedUserName) {
      return NextResponse.json(
        { success: false, error: '投稿者名が指定されていません' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ファイル形式チェック
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '対応していないファイル形式です。画像（JPEG, PNG, GIF, WebP）または動画（MP4, MOV, WebM）をアップロードしてください' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'ファイルサイズが大きすぎます。100MB以下のファイルをアップロードしてください' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[API /media/upload] Uploading file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      weddingId,
      postedUserName,
    });

    // メディアを最適化
    console.log('[API /media/upload] Optimizing media...');
    const optimized = await optimizeMedia(file);
    console.log('[API /media/upload] Optimization complete:', {
      originalSize: optimized.originalSize,
      optimizedSize: optimized.optimizedSize,
      compressionRatio: `${((1 - optimized.optimizedSize / optimized.originalSize) * 100).toFixed(1)}%`,
      savedBytes: optimized.originalSize - optimized.optimizedSize,
    });

    // R2にアップロード
    console.log('[API /media/upload] Generating R2 key...');
    const r2Key = generateR2Key(weddingId, file.name, optimized.extension);
    console.log('[API /media/upload] R2 key generated:', r2Key);

    console.log('[API /media/upload] Uploading to R2...');
    const publicUrl = await uploadToR2(
      optimized.buffer,
      r2Key,
      optimized.contentType,
      optimized.originalSize
    );
    console.log('[API /media/upload] Upload complete:', publicUrl);

    console.log('[API /media/upload] File uploaded to R2:', { r2Key, publicUrl });

    // メディアタイプを判定
    const mediaType = ALLOWED_VIDEO_TYPES.includes(file.type) ? 'video' : 'image';

    // DBにメディア情報を保存
    const media = await prisma.media.create({
      data: {
        wedding_id: weddingId,
        posted_user_name: postedUserName,
        media_path: publicUrl,
        media_type: mediaType,
        posted_at: new Date(),
      },
    });

    console.log('[API /media/upload] Media saved to DB:', { mediaId: media.media_id });

    return NextResponse.json({
      success: true,
      media: {
        id: media.media_id,
        url: publicUrl,
        postedUserName: media.posted_user_name,
        postedAt: media.posted_at,
        mediaType: media.media_type,
      },
    });
  } catch (error) {
    console.error('[API /media/upload] Error uploading media:', error);

    // スタックトレースも出力
    if (error instanceof Error) {
      console.error('[API /media/upload] Error stack:', error.stack);
    }

    // Prisma外部キー制約エラーの詳細なハンドリング
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
      console.error('[API /media/upload] Foreign key constraint error - wedding_id might not exist');
      return NextResponse.json(
        {
          success: false,
          error: '結婚式情報が見つかりません。アカウント設定を確認してください',
        },
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 必ずJSONレスポンスを返す
    return NextResponse.json(
      {
        success: false,
        error: 'アップロードに失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
