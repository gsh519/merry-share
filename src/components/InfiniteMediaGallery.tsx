"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Heart, Download, Calendar, Play } from "lucide-react";
import Image from "next/image";
import type { Media as PrismaMedia } from "@prisma/client";

type Media = PrismaMedia;

interface InfiniteMediaGalleryProps {
  initialMedia: Media[];
  initialHasMore: boolean;
}

export function InfiniteMediaGallery({
  initialMedia,
  initialHasMore
}: InfiniteMediaGalleryProps) {
  const [medias, setMedias] = useState<Media[]>(initialMedia);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const nextPage = page + 1;
      const response = await fetch(`/api/media?page=${nextPage}`);
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
  }, [loading, hasMore, page]);

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
    <div>
      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-4 p-4 max-w-7xl mx-auto">
        {medias.map((item) => (
          <MediaCard key={item.media_id} media={item} />
        ))}
      </div>

      {/* 無限スクロールのトリガー */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-rose-200 border-t-rose-400"></div>
        </div>
      )}

      {!hasMore && medias.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          すべての写真を表示しました
        </div>
      )}
    </div>
  );
}

function MediaCard({ media }: { media: Media }) {
  const [isHovered, setIsHovered] = useState(false);
  const isVideo = media.media_type === 'video';

  return (
    <div
      className="relative mb-4 break-inside-avoid group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300">
        {isVideo ? (
          <div className="relative">
            <video
              src={media.media_path}
              className="w-full h-auto object-cover"
              controls
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

        {isHovered && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-xs text-white/80">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(media.posted_at).toLocaleDateString("ja-JP")}</span>
                  </div>
                  <p className="text-sm font-medium">{media.posted_user_name}</p>
                </div>

                <div className="flex gap-2">
                  <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
                    <Heart className="w-4 h-4" />
                  </button>
                  <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
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
