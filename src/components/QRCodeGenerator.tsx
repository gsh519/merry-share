'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { QrCode, Download, X } from 'lucide-react';

export function QRCodeGenerator() {
  const [showQR, setShowQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showQR && canvasRef.current) {
      const currentUrl = window.location.href;

      QRCode.toCanvas(
        canvasRef.current,
        currentUrl,
        {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        },
        (error) => {
          if (error) {
            console.error('QRコード生成エラー:', error);
          }
        }
      );

      // ダウンロード用のデータURLを生成
      QRCode.toDataURL(currentUrl, { width: 600, margin: 2 })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('QRコードURL生成エラー:', err));
    }
  }, [showQR]);

  const handleDownload = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.download = 'merry-share-qr.png';
      link.href = qrCodeUrl;
      link.click();
    }
  };

  const modalContent = showQR && mounted ? (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      style={{ position: 'fixed' }}
      onClick={() => setShowQR(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 閉じるボタン */}
        <button
          onClick={() => setShowQR(false)}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* タイトル */}
        <div className="text-center mb-4 pt-2">
          <h2 className="text-xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent mb-2">
            QRコード
          </h2>
          <p className="text-sm text-gray-600">
            このQRコードをスキャンして画像をアップロード
          </p>
        </div>

        {/* QRコード */}
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-gray-50 rounded-xl inline-block">
            <canvas ref={canvasRef} className="max-w-full h-auto" />
          </div>
        </div>

        {/* URL表示 */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 text-center break-all px-2">
            {typeof window !== 'undefined' && window.location.href}
          </p>
        </div>

        {/* ダウンロードボタン */}
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Download className="w-5 h-5" />
          <span className="font-medium">QRコードをダウンロード</span>
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* QRコード表示ボタン */}
      <button
        onClick={() => setShowQR(true)}
        className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-md sm:rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-xs sm:text-sm"
      >
        <QrCode className="w-4 h-4" />
        <span className="font-medium hidden sm:inline">QRコード</span>
      </button>

      {/* QRコードモーダル - Portal経由でbody直下にレンダリング */}
      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
