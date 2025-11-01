"use client";

import { useState, useRef } from "react";
import { Upload, X, Camera, Loader2 } from "lucide-react";
import { UploadStatusToast } from "./UploadStatusToast";

interface ImageUploadProps {
  isOpen: boolean;
  onClose: () => void;
}

// バックグラウンド処理の閾値（5件以上）
const BACKGROUND_THRESHOLD = 5;

export function ImageUpload({ isOpen, onClose }: ImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [userName, setUserName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [backgroundJobId, setBackgroundJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    setError(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !userName.trim()) {
      setError("ファイルと投稿者名を入力してください");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // 認証トークンを取得
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        throw new Error('認証情報が見つかりません。再度ログインしてください。');
      }

      // ファイル数が閾値以上の場合、バックグラウンド処理
      if (selectedFiles.length >= BACKGROUND_THRESHOLD) {
        console.log(`[ImageUpload] Starting background upload for ${selectedFiles.length} files`);

        const formData = new FormData();
        selectedFiles.forEach(file => {
          formData.append("files", file);
        });
        formData.append("postedUserName", userName.trim());

        const response = await fetch("/api/upload/initiate", {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'バックグラウンドアップロードの開始に失敗しました');
        }

        console.log('[ImageUpload] Background upload initiated:', data.jobId);

        // バックグラウンドジョブIDを保存
        setBackgroundJobId(data.jobId);

        // フォームをリセットして閉じる
        setSelectedFiles([]);
        setUserName("");
        onClose();

        return;
      }

      // 通常のアップロード処理（5件未満）
      setUploadProgress({ current: 0, total: selectedFiles.length });

      // 各ファイルを順番にアップロード
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress({ current: i + 1, total: selectedFiles.length });

        const formData = new FormData();
        formData.append("file", file);
        formData.append("postedUserName", userName.trim());

        const response = await fetch("/api/media/upload", {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `ファイル ${file.name} のアップロードに失敗しました`);
        }

        console.log(`Upload success (${i + 1}/${selectedFiles.length}):`, data);
      }

      // 成功したらリセットして閉じる
      setSelectedFiles([]);
      setUserName("");
      onClose();

      // ページをリロードして新しい画像を表示
      window.location.reload();
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "アップロードに失敗しました");
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  if (!isOpen) return (
    <>
      {/* バックグラウンドアップロードのトースト通知 */}
      {backgroundJobId && <UploadStatusToast jobId={backgroundJobId} onClose={() => setBackgroundJobId(null)} />}
    </>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-rose-400 to-pink-400 p-2 rounded-xl">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">思い出を追加</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* User Name Input */}
          <div className="mb-4">
            <label htmlFor="user-name" className="block text-sm font-medium text-gray-700 mb-2">
              投稿者名 <span className="text-red-500">*</span>
            </label>
            <input
              id="user-name"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={isUploading}
              placeholder="お名前を入力してください"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* File Input Area */}
          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-rose-200 rounded-xl p-6 sm:p-8 text-center ${
              isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-rose-300 hover:bg-rose-50/50'
            } transition-colors`}
          >
            <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-rose-300 mx-auto mb-3 sm:mb-4" />
            <p className="text-base sm:text-lg font-medium text-gray-700 mb-2">写真・動画を選択</p>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              クリックまたはドラッグ&ドロップで
              <br className="sm:hidden" />
              複数のファイルを一度に選択できます
            </p>
            <p className="text-xs text-gray-400 mt-2">
              画像: JPEG, PNG, GIF, WebP / 動画: MP4, MOV, WebM (最大100MB)
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
          />

          {/* File Count Display */}
          {selectedFiles.length > 0 && (
            <div className={`mt-4 p-4 rounded-xl ${
              selectedFiles.length >= BACKGROUND_THRESHOLD
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-rose-50'
            }`}>
              <div className="flex items-center justify-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  selectedFiles.length >= BACKGROUND_THRESHOLD ? 'bg-blue-400' : 'bg-rose-400'
                }`}></div>
                <p className={`text-sm font-medium ${
                  selectedFiles.length >= BACKGROUND_THRESHOLD ? 'text-blue-700' : 'text-rose-700'
                }`}>
                  {selectedFiles.length}個のファイルを選択中
                </p>
              </div>
              {selectedFiles.length >= BACKGROUND_THRESHOLD && (
                <p className="text-xs text-blue-600 text-center mt-2">
                  ※{BACKGROUND_THRESHOLD}件以上のファイルは<br></br>バックグラウンドでアップロードされます
                </p>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && uploadProgress.total > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <p className="text-sm font-medium text-blue-700">
                  アップロード中... ({uploadProgress.current}/{uploadProgress.total})
                </p>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end p-4 sm:p-6 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            キャンセル
          </button>
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || !userName.trim() || isUploading}
            className="px-6 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                アップロード中...
              </>
            ) : (
              'アップロード'
            )}
          </button>
        </div>
      </div>
      </div>

      {/* バックグラウンドアップロードのトースト通知 */}
      {backgroundJobId && <UploadStatusToast jobId={backgroundJobId} onClose={() => setBackgroundJobId(null)} />}
    </>
  );
}
