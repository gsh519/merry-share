import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/api/auth-middleware';

export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {

    // クエリパラメータからjobIdを取得
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'jobIdが指定されていません' },
        { status: 400 }
      );
    }

    // ジョブの状態を取得
    const job = await prisma.uploadJob.findUnique({
      where: { job_id: jobId },
      select: {
        job_id: true,
        wedding_id: true,
        user_id: true,
        posted_user_name: true,
        total_files: true,
        processed_files: true,
        failed_files: true,
        status: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        completed_at: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'ジョブが見つかりません' },
        { status: 404 }
      );
    }

    // ユーザーが自分のジョブのみアクセスできるようにチェック
    if (job.user_id !== user.dbUser.user_id) {
      return NextResponse.json(
        { success: false, error: 'このジョブにアクセスする権限がありません' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      job: {
        jobId: job.job_id,
        weddingId: job.wedding_id,
        userId: job.user_id,
        postedUserName: job.posted_user_name,
        totalFiles: job.total_files,
        processedFiles: job.processed_files,
        failedFiles: job.failed_files,
        status: job.status,
        errorMessage: job.error_message,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        completedAt: job.completed_at,
      },
    });

  } catch (error) {
    console.error('[API /upload/status] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'ジョブのステータス取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
