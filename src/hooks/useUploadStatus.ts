import { useState, useEffect, useCallback } from 'react';

export interface UploadJobStatus {
  jobId: string;
  weddingId: string;
  userId: string;
  postedUserName: string;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface UseUploadStatusResult {
  job: UploadJobStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUploadStatus(jobId: string | null, pollingInterval = 2000): UseUploadStatusResult {
  const [job, setJob] = useState<UploadJobStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        throw new Error('認証情報が見つかりません');
      }

      const response = await fetch(`/api/upload/status?jobId=${jobId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ステータスの取得に失敗しました');
      }

      if (data.success) {
        setJob(data.job);
        setError(null);
      } else {
        throw new Error(data.error || 'ステータスの取得に失敗しました');
      }

    } catch (err) {
      console.error('Failed to fetch upload status:', err);
      setError(err instanceof Error ? err.message : 'ステータスの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // 初回読み込み
  useEffect(() => {
    if (jobId) {
      setLoading(true);
      fetchStatus();
    }
  }, [jobId, fetchStatus]);

  // ポーリング（処理中の場合のみ）
  useEffect(() => {
    if (!jobId || !job) return;

    // 処理中の場合のみポーリング
    if (job.status === 'pending' || job.status === 'processing') {
      const intervalId = setInterval(() => {
        fetchStatus();
      }, pollingInterval);

      return () => clearInterval(intervalId);
    }
  }, [jobId, job, pollingInterval, fetchStatus]);

  return {
    job,
    loading,
    error,
    refetch: fetchStatus,
  };
}
