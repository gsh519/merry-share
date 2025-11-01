import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseServer } from '@/lib/supabase-server';
import { qstashClient, QSTASH_CONFIG } from '@/lib/qstash';

// Next.jsのルートセグメント設定
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FileMetadata {
  name: string;
  type: string;
  size: number;
  r2Key: string;
  tempR2Key: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API /upload/complete] Request received');

    // 認証トークンを取得
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('[API /upload/complete] No authorization header');
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // トークンを検証してユーザー情報を取得
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      console.error('[API /upload/complete] Auth error:', authError);
      return NextResponse.json(
        { success: false, error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    console.log('[API /upload/complete] User authenticated:', user.id);

    // ユーザー情報からwedding_idを取得
    const dbUser = await prisma.user.findUnique({
      where: { user_id: user.id },
      select: { wedding_id: true },
    });

    if (!dbUser) {
      console.error('[API /upload/complete] User not found in database:', user.id);
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が見つかりません' },
        { status: 404 }
      );
    }

    const weddingId = dbUser.wedding_id;
    console.log('[API /upload/complete] Wedding ID:', weddingId);

    // リクエストボディを取得
    const body = await request.json();
    const { fileMetadata, postedUserName } = body as {
      fileMetadata: FileMetadata[];
      postedUserName: string;
    };

    console.log('[API /upload/complete] Upload complete notification:', {
      filesCount: fileMetadata.length,
      postedUserName,
    });

    // バリデーション
    if (!fileMetadata || fileMetadata.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ファイル情報が指定されていません' },
        { status: 400 }
      );
    }

    if (!postedUserName) {
      return NextResponse.json(
        { success: false, error: '投稿者名が指定されていません' },
        { status: 400 }
      );
    }

    // DBにアップロードジョブを作成
    console.log('[API /upload/complete] Creating upload job...');

    const uploadJob = await prisma.uploadJob.create({
      data: {
        wedding_id: weddingId,
        user_id: user.id,
        posted_user_name: postedUserName,
        total_files: fileMetadata.length,
        processed_files: 0,
        failed_files: 0,
        status: 'pending',
        file_metadata: fileMetadata,
      },
    });

    console.log('[API /upload/complete] Upload job created:', uploadJob.job_id);

    // バックグラウンド処理を開始
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
        console.log('[API /upload/complete] Development mode: Processing directly');

        // バックグラウンドで処理を実行（awaitせずに非同期で実行）
        fetch(`${QSTASH_CONFIG.baseUrl}/api/process-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }).catch((error) => {
          console.error('[API /upload/complete] Background processing error:', error);
        });

        console.log('[API /upload/complete] Job started (development mode):', uploadJob.job_id);
      } else {
        // 本番環境ではQStashを使用
        const processUrl = `${QSTASH_CONFIG.baseUrl}/api/process-image`;

        await qstashClient.publishJSON({
          url: processUrl,
          body: requestBody,
          retries: QSTASH_CONFIG.retries,
        });

        console.log('[API /upload/complete] Job queued to QStash:', uploadJob.job_id);
      }

      return NextResponse.json({
        success: true,
        jobId: uploadJob.job_id,
        totalFiles: fileMetadata.length,
        message: 'アップロードが完了しました。バックグラウンドで処理中です。',
      });

    } catch (qstashError) {
      console.error('[API /upload/complete] QStash error:', qstashError);

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
    console.error('[API /upload/complete] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'アップロード完了処理に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
