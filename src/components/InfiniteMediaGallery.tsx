"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Download, Play, Heart, CheckSquare, Square, X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import type { Media as PrismaMedia } from "@prisma/client";

type Media = PrismaMedia;

interface InfiniteMediaGalleryProps {
  initialMedia: Media[];
  initialHasMore: boolean;
  weddingId: string;
}

export function InfiniteMediaGallery({
  initialMedia,
  initialHasMore,
  weddingId
}: InfiniteMediaGalleryProps) {
  console.log('[InfiniteMediaGallery] Initialized with:', {
    initialMediaCount: initialMedia.length,
    initialHasMore,
    weddingId,
    initialMedia
  });

  const [medias, setMedias] = useState<Media[]>(initialMedia);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<Media | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(0);
  const [touchStart, setTouchStart] = useState<number>(0);
  const [touchEnd, setTouchEnd] = useState<number>(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const nextPage = page + 1;
      const response = await fetch(`/api/media?page=${nextPage}&wedding_id=${weddingId}`);
      const data = await response.json();

      if (data.media && data.media.length > 0) {
        setMedias((prev) => [...prev, ...data.media]);
        setPage(nextPage);
        setHasMore(data.pagination.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more media:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, weddingId]);

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedMediaIds(new Set());
    }
  };

  const toggleMediaSelection = (mediaId: string) => {
    setSelectedMediaIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(mediaId)) {
        newSet.delete(mediaId);
      } else {
        newSet.add(mediaId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const allMediaIds = medias.map((m) => m.media_id);
    setSelectedMediaIds(new Set(allMediaIds));
  };

  const deselectAll = () => {
    setSelectedMediaIds(new Set());
  };

  const downloadMedia = async (mediaPath: string, fileName: string, mimeType: string, useShareAPI: boolean = true) => {
    const response = await fetch(
      `/api/media/download?url=${encodeURIComponent(mediaPath)}&filename=${encodeURIComponent(fileName)}`
    );

    if (!response.ok) {
      throw new Error('ダウンロードに失敗しました');
    }

    const blob = await response.blob();
    // 正しいMIMEタイプでBlobを作成
    const typedBlob = new Blob([blob], { type: mimeType });

    // モバイルデバイスの判定
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Web Share APIが利用可能な場合（主にモバイル）かつ使用を許可されている場合
    if (useShareAPI && isMobile && navigator.share && navigator.canShare) {
      try {
        const file = new File([typedBlob], fileName, { type: mimeType });

        // canShareでファイル共有がサポートされているか確認
        if (navigator.canShare({ files: [file] })) {
          // 操作方法のアナウンスを表示
          alert('下の「画像を保存」から保存しましょう');

          await navigator.share({
            files: [file],
            title: 'Merry Share',
            text: '写真を保存'
          });
          return;
        }
      } catch (error) {
        // ユーザーがキャンセルした場合はエラーを無視
        if ((error as Error).name === 'AbortError') {
          return;
        }
        // その他のエラーの場合は通常のダウンロードにフォールバック
        console.log('Share API failed, falling back to download:', error);
      }
    }

    // 通常のダウンロード処理（PC、またはShare APIが使えない場合）
    const url = window.URL.createObjectURL(typedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;

    if (isMobile) {
      // モバイルの場合は新しいタブで開く
      link.setAttribute('target', '_blank');
    }

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  const handleBulkDownload = async () => {
    if (selectedMediaIds.size === 0) {
      alert('ダウンロードする画像を選択してください');
      return;
    }

    setIsDownloading(true);
    const selectedMedias = medias.filter((m) => selectedMediaIds.has(m.media_id));

    try {
      for (let i = 0; i < selectedMedias.length; i++) {
        const media = selectedMedias[i];
        const isVideo = media.media_type === 'video';
        const extension = isVideo ? 'mp4' : 'jpg';
        const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';
        const fileName = `merry-share-${media.media_id}.${extension}`;

        try {
          // 一括ダウンロードの場合はWeb Share APIを使用しない
          await downloadMedia(media.media_path, fileName, mimeType, false);
        } catch (error) {
          console.error(`Failed to download ${fileName}:`, error);
          continue;
        }

        // ダウンロード間に少し待機（ブラウザの制限を回避）
        if (i < selectedMedias.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      alert(`${selectedMedias.length}件のダウンロードが完了しました`);
      setSelectionMode(false);
      setSelectedMediaIds(new Set());
    } catch (error) {
      console.error('一括ダウンロードに失敗しました:', error);
      alert('一括ダウンロードに失敗しました');
    } finally {
      setIsDownloading(false);
    }
  };

  const openLightbox = (media: Media) => {
    const index = medias.findIndex((m) => m.media_id === media.media_id);
    setCurrentMediaIndex(index);
    setLightboxMedia(media);
  };

  const closeLightbox = () => {
    setLightboxMedia(null);
  };

  const goToNextMedia = () => {
    if (currentMediaIndex < medias.length - 1) {
      const nextIndex = currentMediaIndex + 1;
      setCurrentMediaIndex(nextIndex);
      setLightboxMedia(medias[nextIndex]);
    }
  };

  const goToPreviousMedia = () => {
    if (currentMediaIndex > 0) {
      const prevIndex = currentMediaIndex - 1;
      setCurrentMediaIndex(prevIndex);
      setLightboxMedia(medias[prevIndex]);
    }
  };

  // タッチイベントハンドラー
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50; // 最小スワイプ距離

    if (distance > minSwipeDistance) {
      // 左にスワイプ → 次の画像
      goToNextMedia();
    } else if (distance < -minSwipeDistance) {
      // 右にスワイプ → 前の画像
      goToPreviousMedia();
    }
  };

  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, hasMore, loading]);

  // キーボード操作
  useEffect(() => {
    if (!lightboxMedia) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        goToPreviousMedia();
      } else if (e.key === 'ArrowRight') {
        goToNextMedia();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxMedia, currentMediaIndex, medias.length]);

  if (medias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 min-h-[calc(100vh-200px)]">
        <Heart className="w-16 h-16 text-rose-300 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">まだ写真がありません</h2>
        <p className="text-gray-500 text-center">素敵な思い出の写真を追加してください</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-4 p-4 max-w-7xl mx-auto">
        {medias.map((item) => (
          <MediaCard
            key={item.media_id}
            media={item}
            selectionMode={selectionMode}
            isSelected={selectedMediaIds.has(item.media_id)}
            onToggleSelection={toggleMediaSelection}
            onMediaClick={openLightbox}
          />
        ))}
      </div>

      {/* 無限スクロールのトリガー */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-rose-200 border-t-rose-400"></div>
        </div>
      )}

      {/* 選択モードボタン（通常時） */}
      {!selectionMode && (
        <button
          onClick={toggleSelectionMode}
          className="fixed bottom-6 left-6 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl z-40 flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          <span className="hidden sm:inline">ダウンロード</span>
        </button>
      )}

      {/* 選択モードツールバー */}
      {selectionMode && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t-2 border-purple-200 px-3 py-4 shadow-2xl">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">
                {selectedMediaIds.size === 0 ? (
                  <span className="text-purple-600">ダウンロードする画像を選択</span>
                ) : (
                  <span className="text-purple-600">{selectedMediaIds.size}件選択中</span>
                )}
              </p>
              <button
                onClick={selectedMediaIds.size === medias.length ? deselectAll : selectAll}
                className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors whitespace-nowrap"
              >
                {selectedMediaIds.size === medias.length ? '全解除' : '全選択'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectionMode}
                className="px-3 py-3 rounded-lg font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 whitespace-nowrap"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <X className="w-5 h-5" />
                  <span className="text-sm">キャンセル</span>
                </span>
              </button>
              <button
                onClick={handleBulkDownload}
                disabled={isDownloading || selectedMediaIds.size === 0}
                className="flex-1 px-3 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg disabled:shadow-none flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-5 h-5" />
                <span className="text-sm">
                  {isDownloading ? 'ダウンロード中...' : `${selectedMediaIds.size > 0 ? `${selectedMediaIds.size}件` : ''}ダウンロード`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 選択モード時のスペース確保 */}
      {selectionMode && <div className="h-20" />}

      {/* ライトボックスモーダル */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 閉じるボタン */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors z-50"
            aria-label="閉じる"
          >
            <X className="w-8 h-8" />
          </button>

          {/* 前の画像ボタン */}
          {currentMediaIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPreviousMedia();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/10 rounded-full transition-colors z-50"
              aria-label="前の画像"
            >
              <ChevronLeft className="w-10 h-10" />
            </button>
          )}

          {/* 次の画像ボタン */}
          {currentMediaIndex < medias.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNextMedia();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/10 rounded-full transition-colors z-50"
              aria-label="次の画像"
            >
              <ChevronRight className="w-10 h-10" />
            </button>
          )}

          {/* メディアコンテンツ */}
          <div
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxMedia.media_type === 'video' ? (
              <video
                src={lightboxMedia.media_path}
                className="max-w-full max-h-[90vh] object-contain"
                controls
                autoPlay
              />
            ) : (
              <Image
                src={lightboxMedia.media_path}
                alt={`メディア ${lightboxMedia.media_id}`}
                width={0}
                height={0}
                sizes="90vw"
                className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
                priority
              />
            )}
          </div>

          {/* 画像情報 */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div>
                <p className="text-lg font-medium">{lightboxMedia.posted_user_name}</p>
                <p className="text-sm text-gray-300">
                  {currentMediaIndex + 1} / {medias.length}
                </p>
              </div>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const isVideo = lightboxMedia.media_type === 'video';
                  const extension = isVideo ? 'mp4' : 'jpg';
                  const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';
                  const fileName = `merry-share-${lightboxMedia.media_id}.${extension}`;

                  try {
                    await downloadMedia(lightboxMedia.media_path, fileName, mimeType);
                  } catch (error) {
                    console.error('ダウンロードに失敗しました:', error);
                    alert('ダウンロードに失敗しました');
                  }
                }}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span>ダウンロード</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MediaCardProps {
  media: Media;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: (mediaId: string) => void;
  onMediaClick: (media: Media) => void;
}

function MediaCard({ media, selectionMode, isSelected, onToggleSelection, onMediaClick }: MediaCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isVideo = media.media_type === 'video';

  const handleDownload = async () => {
    try {
      const extension = isVideo ? 'mp4' : 'jpg';
      const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';
      const fileName = `merry-share-${media.media_id}.${extension}`;

      const response = await fetch(`/api/media/download?url=${encodeURIComponent(media.media_path)}&filename=${encodeURIComponent(fileName)}`);

      if (!response.ok) {
        throw new Error('ダウンロードに失敗しました');
      }

      const blob = await response.blob();
      // 正しいMIMEタイプでBlobを作成
      const typedBlob = new Blob([blob], { type: mimeType });
      const url = window.URL.createObjectURL(typedBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;

      // iOSでの動作を改善するための設定
      link.setAttribute('target', '_blank');

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // URLを少し遅延させて解放（iOSでの問題を回避）
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('ダウンロードに失敗しました:', error);
      alert('ダウンロードに失敗しました');
    }
  };

  const handleCardClick = () => {
    if (selectionMode) {
      onToggleSelection(media.media_id);
    } else {
      onMediaClick(media);
    }
  };

  return (
    <div
      className="relative mb-4 break-inside-avoid group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 ${
          selectionMode ? 'cursor-pointer' : ''
        } ${isSelected ? 'ring-4 ring-purple-500 ring-offset-2' : ''}`}
        onClick={handleCardClick}
      >
        {isVideo ? (
          <div className="relative">
            <video
              src={media.media_path}
              className="w-full h-auto object-cover"
              controls={!selectionMode}
              preload="metadata"
            />
            <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
              <Play className="w-3 h-3" />
              VIDEO
            </div>
          </div>
        ) : (
          <Image
            src={media.media_path}
            alt={`メディア ${media.media_id}`}
            width={0}
            height={0}
            sizes="100vw"
            className="w-full h-auto"
            loading="lazy"
          />
        )}

        {/* 選択モード時のチェックボックス */}
        {selectionMode && (
          <div className="absolute top-3 left-3 z-10">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-110'
                  : 'bg-white/90 text-gray-600 hover:bg-white'
              }`}
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </div>
          </div>
        )}

        {/* 選択された時のオーバーレイ */}
        {isSelected && (
          <div className="absolute inset-0 bg-purple-500/20 pointer-events-none" />
        )}

        {/* ホバー時のダウンロードボタン（選択モードではない時のみ） */}
        {!selectionMode && isHovered && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{media.posted_user_name}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                    aria-label="ダウンロード"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
