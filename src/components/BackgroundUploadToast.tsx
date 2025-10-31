"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Loader2, Upload } from "lucide-react";
import { UploadTask } from "@/hooks/useBackgroundUpload";

interface BackgroundUploadToastProps {
  tasks: UploadTask[];
  onClearTask: (taskId: string) => void;
}

export function BackgroundUploadToast({ tasks, onClearTask }: BackgroundUploadToastProps) {
  const [visible, setVisible] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // アクティブなタスクがある場合に表示
  useEffect(() => {
    const hasActiveTasks = tasks.some(
      t => t.status === 'pending' || t.status === 'uploading'
    );
    setVisible(hasActiveTasks || tasks.length > 0);
  }, [tasks]);

  if (!visible || tasks.length === 0) return null;

  const getTaskIcon = (task: UploadTask) => {
    switch (task.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
      case 'uploading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />;
      default:
        return <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />;
    }
  };

  const getTaskStatusText = (task: UploadTask) => {
    switch (task.status) {
      case 'completed':
        return 'アップロード完了';
      case 'error':
        return 'アップロードエラー';
      case 'uploading':
        return `アップロード中... (${task.progress.current}/${task.progress.total})`;
      default:
        return '待機中...';
    }
  };

  const getTaskBgColor = (task: UploadTask) => {
    switch (task.status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'uploading':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full space-y-2">
      {tasks.map((task) => {
        const isExpanded = expandedTaskId === task.id;
        const canDismiss = task.status === 'completed' || task.status === 'error';

        return (
          <div
            key={task.id}
            className={`${getTaskBgColor(task)} border rounded-lg shadow-lg p-4 transition-all duration-300`}
          >
            <div className="flex items-start gap-3">
              {getTaskIcon(task)}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {task.userName} さん
                  </p>
                  {canDismiss && (
                    <button
                      onClick={() => onClearTask(task.id)}
                      className="p-1 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                      aria-label="閉じる"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-gray-600 mb-2">
                  {getTaskStatusText(task)}
                </p>

                {/* プログレスバー */}
                {task.status === 'uploading' && (
                  <div className="w-full bg-blue-200 rounded-full h-1.5 mb-2">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${(task.progress.current / task.progress.total) * 100}%`
                      }}
                    />
                  </div>
                )}

                {/* エラーメッセージ */}
                {task.status === 'error' && task.error && (
                  <div className="mt-2">
                    <button
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      className="text-xs text-red-600 hover:text-red-700 underline"
                    >
                      {isExpanded ? '詳細を隠す' : '詳細を表示'}
                    </button>
                    {isExpanded && (
                      <p className="text-xs text-red-600 mt-1 break-words">
                        {task.error}
                      </p>
                    )}
                  </div>
                )}

                {/* 完了メッセージ */}
                {task.status === 'completed' && (
                  <p className="text-xs text-green-600">
                    {task.fileCount}個のファイルをアップロードしました
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
