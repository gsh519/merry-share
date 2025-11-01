import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseServer } from '@/lib/supabase-server';
import { qstashClient, QSTASH_CONFIG } from '@/lib/qstash';
import { uploadToR2, generateR2Key } from '@/lib/r2';

// Next.jsのルートセグメント設定
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// ボディサイズの制限を150MBに設定（複数ファイルのアップロードに対応）
export const maxDuration = 60; // 最大実行時間60秒

// アップロード可能なファイル形式
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// 最大ファイルサイズ (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

interface FileMetadata {
  name: string;
  type: string;
  size: number;
  r2Key: string;
  tempR2Key: string; // 一時保存用のキー
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API /upload/initiate] Request received');

    // 認証トークンを取得
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('[API /upload/initiate] No authorization header');
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('[API /upload/initiate] Token received, length:', token.length);

    // トークンを検証してユーザー情報を取得
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      console.error('[API /upload/initiate] Auth error:', authError);
      return NextResponse.json(
        { success: false, error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    console.log('[API /upload/initiate] User authenticated:', user.id);

    // ユーザー情報からwedding_idを取得
    const dbUser = await prisma.user.findUnique({
      where: { user_id: user.id },
      select: { wedding_id: true },
    });

    if (!dbUser) {
      console.error('[API /upload/initiate] User not found in database:', user.id);
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が見つかりません' },
        { status: 404 }
      );
    }

    const weddingId = dbUser.wedding_id;
    console.log('[API /upload/initiate] Wedding ID:', weddingId);

    // wedding_idが実際に存在するか検証
    const weddingExists = await prisma.wedding.findUnique({
      where: { wedding_id: weddingId },
      select: { wedding_id: true },
    });

    if (!weddingExists) {
      console.error('[API /upload/initiate] Wedding not found:', weddingId);
      return NextResponse.json(
        { success: false, error: '結婚式情報が見つかりません' },
        { status: 404 }
      );
    }

    let formData;
    try {
      formData = await request.formData();
    } catch (formDataError) {
      console.error('[API /upload/initiate] Failed to parse FormData:', formDataError);
      return NextResponse.json(
        {
          success: false,
          error: 'リクエストデータの解析に失敗しました',
          details: formDataError instanceof Error ? formDataError.message : 'Unknown error'
        },
        { status: 400 }
      );
    }

    const files = formData.getAll('files') as File[];
    const postedUserName = formData.get('postedUserName') as string;

    console.log('[API /upload/initiate] FormData parsed:', {
      filesCount: files.length,
      postedUserName,
      fileNames: files.map(f => f.name),
      fileSizes: files.map(f => f.size),
    });

    // バリデーション
    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ファイルが選択されていません' },
        { status: 400 }
      );
    }

    if (!postedUserName) {
      return NextResponse.json(
        { success: false, error: '投稿者名が指定されていません' },
        { status: 400 }
      );
    }

    // ファイルのバリデーションとメタデータ準備
    const fileMetadata: FileMetadata[] = [];
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

      // R2キーを生成
      const extension = file.name.split('.').pop() || 'jpg';
      const r2Key = generateR2Key(weddingId, file.name, extension);
      const tempR2Key = `temp/${r2Key}`; // 一時保存用のパス

      // シリアライズ可能なプレーンオブジェクトとして保存
      // ファイル名の特殊文字をサニタイズ
      const sanitizedName = String(file.name).normalize('NFC').replace(/[\x00-\x1F\x7F-\x9F]/g, '');

      fileMetadata.push({
        name: sanitizedName,
        type: String(file.type),
        size: Number(file.size),
        r2Key: String(r2Key),
        tempR2Key: String(tempR2Key),
      });
    }

    console.log('[API /upload/initiate] Uploading files to R2 (temporary storage)...');

    // Step 1: ファイルをR2に一時アップロード（最適化せずにそのまま）
    const uploadPromises = files.map(async (file, index) => {
      try {
        console.log(`[API /upload/initiate] Processing file ${index + 1}/${files.length}: ${file.name}`);
        const buffer = Buffer.from(await file.arrayBuffer());
        const metadata = fileMetadata[index];

        console.log(`[API /upload/initiate] File ${index + 1} buffer size:`, buffer.length);

        // 一時フォルダにアップロード（バックグラウンド処理で最適化してから本番フォルダに移動）
        await uploadToR2(
          buffer,
          metadata.tempR2Key,
          file.type,
          file.size
        );
        console.log(`[API /upload/initiate] File ${index + 1} uploaded successfully`);
        return { success: true };
      } catch (error) {
        console.error(`[API /upload/initiate] Failed to upload file ${index + 1} (${file.name}):`, error);
        if (error instanceof Error) {
          console.error(`[API /upload/initiate] Error stack:`, error.stack);
        }
        throw new Error(`ファイル "${file.name}" のアップロードに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    try {
      await Promise.all(uploadPromises);
      console.log('[API /upload/initiate] All files uploaded to R2 (temp)');
    } catch (uploadError) {
      console.error('[API /upload/initiate] Upload to R2 failed:', uploadError);
      return NextResponse.json(
        {
          success: false,
          error: 'ファイルのアップロードに失敗しました',
          details: uploadError instanceof Error ? uploadError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Step 2: DBにジョブを作成
    console.log('[API /upload/initiate] Creating upload job with metadata:', {
      weddingId,
      userId: user.id,
      postedUserName,
      totalFiles: files.length,
      metadataLength: fileMetadata.length,
      // 最初のファイルのメタデータをサンプルとして出力
      sampleMetadata: fileMetadata[0],
    });

    let uploadJob;
    try {
      uploadJob = await prisma.uploadJob.create({
        data: {
          wedding_id: weddingId,
          user_id: user.id,
          posted_user_name: postedUserName,
          total_files: files.length,
          processed_files: 0,
          failed_files: 0,
          status: 'pending',
          file_metadata: fileMetadata,
        },
      });
      console.log('[API /upload/initiate] Upload job created successfully:', uploadJob.job_id);
    } catch (dbError) {
      console.error('[API /upload/initiate] Database error when creating job:', dbError);
      console.error('[API /upload/initiate] File metadata that caused error:', JSON.stringify(fileMetadata, null, 2));
      throw new Error(`ジョブの作成に失敗しました: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    // Step 3: バックグラウンド処理を開始
    try {
      const requestBody = {
        jobId: uploadJob.job_id,
        weddingId,
        userId: user.id,
        postedUserName,
        fileMetadata,
      };

      // 開発環境では直接処理APIを呼び出す
      if (process.env.NODE_ENV === 'development') {
        console.log('[API /upload/initiate] Development mode: Processing directly');

        // バックグラウンドで処理を実行（awaitせずに非同期で実行）
        fetch(`${QSTASH_CONFIG.baseUrl}/api/process-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }).catch((error) => {
          console.error('[API /upload/initiate] Background processing error:', error);
        });

        console.log('[API /upload/initiate] Job started (development mode):', uploadJob.job_id);
      } else {
        // 本番環境ではQStashを使用
        const processUrl = `${QSTASH_CONFIG.baseUrl}/api/process-image`;

        await qstashClient.publishJSON({
          url: processUrl,
          body: requestBody,
          retries: QSTASH_CONFIG.retries,
        });

        console.log('[API /upload/initiate] Job queued to QStash:', uploadJob.job_id);
      }

      return NextResponse.json({
        success: true,
        jobId: uploadJob.job_id,
        totalFiles: files.length,
        message: 'アップロードを開始しました。バックグラウンドで処理中です。',
      });

    } catch (qstashError) {
      console.error('[API /upload/initiate] QStash error:', qstashError);

      // QStashへの登録に失敗した場合、ジョブをfailedに更新
      await prisma.uploadJob.update({
        where: { job_id: uploadJob.job_id },
        data: {
          status: 'failed',
          error_message: 'バックグラウンド処理の登録に失敗しました',
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'バックグラウンド処理の登録に失敗しました。再度お試しください。'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[API /upload/initiate] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'アップロードの開始に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
