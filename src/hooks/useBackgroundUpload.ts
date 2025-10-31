import { useState, useEffect, useCallback, useRef } from 'react';
import { serviceWorkerManager } from '@/lib/serviceWorkerManager';

export interface UploadTask {
  id: string;
  fileCount: number; // File count instead of File[] since we can't store File objects
  userName: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: {
    current: number;
    total: number;
  };
  error?: string;
  startedAt: number;
}

interface UploadTaskStorage {
  id: string;
  userName: string;
  fileCount: number;
  status: string;
  progress: { current: number; total: number };
  error?: string;
  startedAt: number;
}

const STORAGE_KEY = 'background_upload_tasks';
const BACKGROUND_THRESHOLD = 5; // 5件以上でバックグラウンド処理

export function useBackgroundUpload() {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const initRef = useRef(false);

  // Service Workerの初期化
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initServiceWorker = async () => {
      const ready = await serviceWorkerManager.register();
      setSwReady(ready);

      if (ready) {
        // Service Workerからのメッセージを受信
        serviceWorkerManager.on('UPLOAD_STARTED', (payload: { id: string }) => {
          setTasks(prev => prev.map(t =>
            t.id === payload.id
              ? { ...t, status: 'uploading' as const }
              : t
          ));
        });

        serviceWorkerManager.on('UPLOAD_PROGRESS', (payload: {
          id: string;
          current: number;
          total: number;
          fileName: string;
        }) => {
          setTasks(prev => prev.map(t =>
            t.id === payload.id
              ? {
                  ...t,
                  progress: { current: payload.current, total: payload.total }
                }
              : t
          ));
          console.log(`Background upload progress (${payload.current}/${payload.total}):`, payload.fileName);
        });

        serviceWorkerManager.on('UPLOAD_COMPLETED', (payload: {
          id: string;
          total: number;
        }) => {
          setTasks(prev => prev.map(t =>
            t.id === payload.id
              ? { ...t, status: 'completed' as const }
              : t
          ));

          // 全タスクが完了したらページをリロード
          setTimeout(() => {
            setTasks(prev => {
              const allCompleted = prev.every(t => t.status === 'completed' || t.status === 'error');
              if (allCompleted && prev.length > 0) {
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              }
              return prev;
            });
          }, 500);
        });

        serviceWorkerManager.on('UPLOAD_ERROR', (payload: {
          id: string;
          error: string;
        }) => {
          setTasks(prev => prev.map(t =>
            t.id === payload.id
              ? { ...t, status: 'error' as const, error: payload.error }
              : t
          ));
        });

        console.log('[useBackgroundUpload] Service Worker initialized');
      } else {
        console.warn('[useBackgroundUpload] Service Worker not available, falling back to normal upload');
      }
    };

    initServiceWorker();

    // Cleanup
    return () => {
      serviceWorkerManager.off('UPLOAD_STARTED');
      serviceWorkerManager.off('UPLOAD_PROGRESS');
      serviceWorkerManager.off('UPLOAD_COMPLETED');
      serviceWorkerManager.off('UPLOAD_ERROR');
    };
  }, []);

  // ストレージからタスクを読み込み
  const loadTasksFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const storedTasks: UploadTaskStorage[] = JSON.parse(stored);
        return storedTasks.map(t => ({
          ...t,
          status: t.status as 'pending' | 'uploading' | 'completed' | 'error',
        }));
      }
    } catch (error) {
      console.error('Failed to load tasks from storage:', error);
    }
    return [];
  }, []);

  // タスクをストレージに保存
  const saveTasksToStorage = useCallback((tasks: UploadTask[]) => {
    try {
      const simplifiedTasks: UploadTaskStorage[] = tasks.map(task => ({
        id: task.id,
        userName: task.userName,
        fileCount: task.fileCount,
        status: task.status,
        progress: task.progress,
        error: task.error,
        startedAt: task.startedAt,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(simplifiedTasks));
    } catch (error) {
      console.error('Failed to save tasks to storage:', error);
    }
  }, []);

  // タスクを追加
  const addTask = useCallback(async (files: File[], userName: string): Promise<boolean> => {
    // 5件未満の場合はバックグラウンド処理しない
    if (files.length < BACKGROUND_THRESHOLD) {
      return false;
    }

    // Service Workerが利用できない場合は通常処理
    if (!swReady) {
      console.warn('[useBackgroundUpload] Service Worker not ready, falling back to normal upload');
      return false;
    }

    try {
      const taskId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      const task: UploadTask = {
        id: taskId,
        fileCount: files.length,
        userName,
        status: 'pending',
        progress: { current: 0, total: files.length },
        startedAt: Date.now(),
      };

      setTasks(prev => [...prev, task]);
      setIsProcessing(true);

      // Service Workerにアップロードタスクを送信
      const started = await serviceWorkerManager.startUpload(taskId, files, userName);

      if (!started) {
        throw new Error('Service Workerへのタスク送信に失敗しました');
      }

      console.log('[useBackgroundUpload] Task added and sent to Service Worker:', taskId);
      return true;

    } catch (error) {
      console.error('[useBackgroundUpload] Failed to add task:', error);
      setIsProcessing(false);
      return false;
    }
  }, [swReady]);

  // タスクをクリア
  const clearTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  // 全タスクをクリア
  const clearAllTasks = useCallback(() => {
    setTasks([]);
    localStorage.removeItem(STORAGE_KEY);
    setIsProcessing(false);
  }, []);

  // タスク変更時にストレージに保存
  useEffect(() => {
    if (tasks.length > 0) {
      saveTasksToStorage(tasks);

      // 処理中のタスクがあるかチェック
      const hasActiveTask = tasks.some(t => t.status === 'pending' || t.status === 'uploading');
      setIsProcessing(hasActiveTask);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setIsProcessing(false);
    }
  }, [tasks, saveTasksToStorage]);

  // 初回マウント時にストレージから復元
  useEffect(() => {
    const storedTasks = loadTasksFromStorage();
    if (storedTasks.length > 0) {
      // 未完了のタスクのみ復元（完了したものは除外）
      const activeTasks = storedTasks.filter(t => t.status !== 'completed');
      if (activeTasks.length > 0) {
        setTasks(activeTasks);
      }
    }
  }, [loadTasksFromStorage]);

  return {
    tasks,
    isProcessing,
    swReady,
    addTask,
    clearTask,
    clearAllTasks,
    threshold: BACKGROUND_THRESHOLD,
  };
}
