"use client";

import { useState, useRef } from "react";
import { Upload, X, Camera } from "lucide-react";

interface ImageUploadProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImageUpload({ isOpen, onClose }: ImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleUpload = () => {
    // TODO: Implement actual upload logic
    console.log("Uploading files:", selectedFiles);

    // Clear selections and close modal
    setSelectedFiles([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
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
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* File Input Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-rose-200 rounded-xl p-6 sm:p-8 text-center cursor-pointer hover:border-rose-300 hover:bg-rose-50/50 transition-colors"
          >
            <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-rose-300 mx-auto mb-3 sm:mb-4" />
            <p className="text-base sm:text-lg font-medium text-gray-700 mb-2">写真を選択</p>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              クリックまたはドラッグ&ドロップで
              <br className="sm:hidden" />
              複数の写真を一度に選択できます
            </p>
            <p className="text-xs text-gray-400 mt-2">JPG, PNG, GIF形式に対応</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* File Count Display */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 p-4 bg-rose-50 rounded-xl">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
                <p className="text-sm font-medium text-rose-700">{selectedFiles.length}枚の写真を選択中</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end p-4 sm:p-6 bg-gray-50 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
            キャンセル
          </button>
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0}
            className="px-6 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            アップロード
          </button>
        </div>
      </div>
    </div>
  );
}
