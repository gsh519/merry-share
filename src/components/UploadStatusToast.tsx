"use client";

import { useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { useUploadStatus } from "@/hooks/useUploadStatus";

interface UploadStatusToastProps {
  jobId: string;
  onClose: () => void;
}

export function UploadStatusToast({ jobId, onClose }: UploadStatusToastProps) {
  const { job, loading, error } = useUploadStatus(jobId, 2000);

  // 完了したら自動的にページをリロード
  useEffect(() => {
    if (job?.status === 'completed') {
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [job?.status]);

  if (loading && !job) {
    return null; // 初回ロード中は表示しない
  }

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-md">
        <div className="bg-white rounded-lg shadow-xl border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">エラーが発生しました</p>
              <p className="text-sm text-gray-600 mt-1">{error}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const progress = job.totalFiles > 0 ? (job.processedFiles / job.totalFiles) * 100 : 0;
  const isProcessing = job.status === 'pending' || job.status === 'processing';
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          {/* アイコン */}
          {isProcessing && <Loader2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5 animate-spin" />}
          {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />}
          {isFailed && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}

          {/* コンテンツ */}
          <div className="flex-1 min-w-0">
            {/* タイトル */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="font-medium text-gray-900">
                {isProcessing && 'アップロード中...'}
                {isCompleted && 'アップロード完了'}
                {isFailed && 'アップロード失敗'}
              </p>
              {!isProcessing && (
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>

            {/* 進捗情報 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{job.postedUserName}</span>
                <span>
                  {job.processedFiles} / {job.totalFiles} ファイル
                </span>
              </div>

              {/* プログレスバー */}
              {isProcessing && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              )}

              {/* エラーメッセージ */}
              {job.failedFiles > 0 && (
                <p className="text-xs text-red-600">
                  {job.failedFiles}個のファイルが失敗しました
                </p>
              )}

              {job.errorMessage && (
                <p className="text-xs text-red-600 break-words">
                  {job.errorMessage}
                </p>
              )}

              {/* 完了メッセージ */}
              {isCompleted && (
                <p className="text-xs text-green-600">
                  ページを更新しています...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
