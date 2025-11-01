import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseServer } from '@/lib/supabase-server';
import { generatePresignedUrl, generateR2Key } from '@/lib/r2';

// Next.jsのルートセグメント設定
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// アップロード可能なファイル形式
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// 最大ファイルサイズ (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

interface FileRequest {
  name: string;
  type: string;
  size: number;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API /upload/presigned-url] Request received');

    // 認証トークンを取得
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('[API /upload/presigned-url] No authorization header');
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // トークンを検証してユーザー情報を取得
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      console.error('[API /upload/presigned-url] Auth error:', authError);
      return NextResponse.json(
        { success: false, error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    console.log('[API /upload/presigned-url] User authenticated:', user.id);

    // ユーザー情報からwedding_idを取得
    const dbUser = await prisma.user.findUnique({
      where: { user_id: user.id },
      select: { wedding_id: true },
    });

    if (!dbUser) {
      console.error('[API /upload/presigned-url] User not found in database:', user.id);
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が見つかりません' },
        { status: 404 }
      );
    }

    const weddingId = dbUser.wedding_id;
    console.log('[API /upload/presigned-url] Wedding ID:', weddingId);

    // wedding_idが実際に存在するか検証
    const weddingExists = await prisma.wedding.findUnique({
      where: { wedding_id: weddingId },
      select: { wedding_id: true },
    });

    if (!weddingExists) {
      console.error('[API /upload/presigned-url] Wedding not found:', weddingId);
      return NextResponse.json(
        { success: false, error: '結婚式情報が見つかりません' },
        { status: 404 }
      );
    }

    // リクエストボディを取得
    const body = await request.json();
    const { files } = body as { files: FileRequest[] };

    console.log('[API /upload/presigned-url] Files requested:', files.length);

    // バリデーション
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ファイル情報が指定されていません' },
        { status: 400 }
      );
    }

    // 各ファイルのプレサインドURLを生成
    const presignedUrls = [];
    for (const file of files) {
      // ファイル形式チェック
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `ファイル "${file.name}" は対応していないファイル形式です。画像（JPEG, PNG, GIF, WebP）または動画（MP4, MOV, WebM）をアップロードしてください`
          },
          { status: 400 }
        );
      }

      // ファイルサイズチェック
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `ファイル "${file.name}" のサイズが大きすぎます。100MB以下のファイルをアップロードしてください`
          },
          { status: 400 }
        );
      }

      // R2キーを生成（temp フォルダに保存）
      const extension = file.name.split('.').pop() || 'jpg';
      const r2Key = generateR2Key(weddingId, file.name, extension);
      const tempR2Key = `temp/${r2Key}`;

      // プレサインドURLを生成
      const presignedUrl = await generatePresignedUrl(tempR2Key, file.type);

      presignedUrls.push({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        r2Key,
        tempR2Key,
        presignedUrl,
      });
    }

    console.log('[API /upload/presigned-url] Generated presigned URLs:', presignedUrls.length);

    return NextResponse.json({
      success: true,
      presignedUrls,
    });

  } catch (error) {
    console.error('[API /upload/presigned-url] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'プレサインドURLの生成に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
