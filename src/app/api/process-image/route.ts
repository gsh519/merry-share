import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { prisma } from '@/lib/prisma';
import { getFromR2, uploadToR2, deleteFromR2 } from '@/lib/r2';
import { optimizeMediaFromBuffer } from '@/lib/imageOptimizer';
import { revalidatePath } from 'next/cache';

interface FileMetadata {
  name: string;
  type: string;
  size: number;
  r2Key: string;
  tempR2Key: string;
}

interface RequestBody {
  jobId: string;
  weddingId: string;
  userId: string;
  postedUserName: string;
  fileMetadata: FileMetadata[];
}

// アップロード可能なファイル形式
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

async function handler(request: NextRequest) {
  try {
    console.log('[API /process-image] Background job started');

    const body: RequestBody = await request.json();
    const { jobId, weddingId, postedUserName, fileMetadata } = body;

    console.log('[API /process-image] Processing job:', jobId, 'Files:', fileMetadata.length);

    // ジョブのステータスを更新
    await prisma.uploadJob.update({
      where: { job_id: jobId },
      data: {
        status: 'processing',
        updated_at: new Date(),
      },
    });

    let processedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // 各ファイルを処理
    for (let i = 0; i < fileMetadata.length; i++) {
      const file = fileMetadata[i];

      try {
        console.log(`[API /process-image] Processing file ${i + 1}/${fileMetadata.length}: ${file.name}`);

        // Step 1: R2の一時フォルダからファイルを取得
        const tempBuffer = await getFromR2(file.tempR2Key);
        console.log(`[API /process-image] Fetched from temp storage: ${file.tempR2Key}`);

        // Step 2: ファイルを最適化（sharpで画像最適化）
        console.log(`[API /process-image] Optimizing file: ${file.name}`);
        const optimized = await optimizeMediaFromBuffer(tempBuffer, file.type, file.name);
        console.log(`[API /process-image] Optimization complete:`, {
          originalSize: optimized.originalSize,
          optimizedSize: optimized.optimizedSize,
          compressionRatio: `${((1 - optimized.optimizedSize / optimized.originalSize) * 100).toFixed(1)}%`,
        });

        // Step 3: 最適化されたファイルを本番フォルダにアップロード
        // WebPに変換された場合は拡張子を更新
        let finalR2Key = file.r2Key;
        if (optimized.extension && optimized.extension !== `.${file.r2Key.split('.').pop()}`) {
          finalR2Key = file.r2Key.replace(/\.[^.]+$/, optimized.extension);
        }

        const publicUrl = await uploadToR2(
          optimized.buffer,
          finalR2Key,
          optimized.contentType,
          optimized.originalSize
        );
        console.log(`[API /process-image] Uploaded to final storage: ${finalR2Key}`);

        // Step 4: 一時ファイルを削除
        await deleteFromR2(file.tempR2Key);
        console.log(`[API /process-image] Deleted temp file: ${file.tempR2Key}`);

        // Step 5: メディアタイプを判定
        const mediaType = ALLOWED_VIDEO_TYPES.includes(file.type) ? 'video' : 'image';

        // Step 6: DBにメディア情報を保存
        await prisma.media.create({
          data: {
            wedding_id: weddingId,
            posted_user_name: postedUserName,
            media_path: publicUrl,
            media_type: mediaType,
            posted_at: new Date(),
          },
        });

        console.log(`[API /process-image] Media saved to DB: ${file.name}`);

        processedCount++;

        // 進捗を更新
        await prisma.uploadJob.update({
          where: { job_id: jobId },
          data: {
            processed_files: processedCount,
            failed_files: failedCount,
            updated_at: new Date(),
          },
        });

      } catch (error) {
        console.error(`[API /process-image] Failed to process file ${file.name}:`, error);
        failedCount++;
        errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);

        // 一時ファイルの削除を試みる（エラーが発生してもログのみ）
        try {
          await deleteFromR2(file.tempR2Key);
        } catch (deleteError) {
          console.error(`[API /process-image] Failed to delete temp file ${file.tempR2Key}:`, deleteError);
        }

        // 進捗を更新
        await prisma.uploadJob.update({
          where: { job_id: jobId },
          data: {
            processed_files: processedCount,
            failed_files: failedCount,
            updated_at: new Date(),
          },
        });
      }
    }

    // 全ての処理が完了したらジョブを完了に更新
    const finalStatus = failedCount === fileMetadata.length ? 'failed' : 'completed';
    await prisma.uploadJob.update({
      where: { job_id: jobId },
      data: {
        status: finalStatus,
        processed_files: processedCount,
        failed_files: failedCount,
        error_message: errors.length > 0 ? errors.join('\n') : null,
        completed_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log('[API /process-image] Job completed:', {
      jobId,
      status: finalStatus,
      processed: processedCount,
      failed: failedCount,
    });

    // トップページのキャッシュを再検証
    revalidatePath('/', 'page');
    console.log('[API /process-image] Revalidated path: /');

    return NextResponse.json({
      success: true,
      jobId,
      processed: processedCount,
      failed: failedCount,
      status: finalStatus,
    });

  } catch (error) {
    console.error('[API /process-image] Error processing job:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'ジョブの処理に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// QStashの署名検証を有効にする（本番環境用）
// 開発環境では署名検証をスキップ
export const POST = process.env.NODE_ENV === 'production'
  ? verifySignatureAppRouter(handler)
  : handler;
