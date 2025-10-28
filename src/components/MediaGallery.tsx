"use client";

import { useEffect, useState } from "react";
import { InfiniteMediaGallery } from "./InfiniteMediaGallery";
import { useAuth } from "@/contexts/AuthContext";
import type { Media as PrismaMedia } from "@prisma/client";

type Media = PrismaMedia;

const PAGE_SIZE = 12;

export function MediaGallery() {
  const { wedding, isLoading: authLoading } = useAuth();
  const [initialMedia, setInitialMedia] = useState<Media[]>([]);
  const [initialHasMore, setInitialHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!wedding?.id) {
      setError("結婚式情報が見つかりません");
      setLoading(false);
      return;
    }

    const weddingId = String(wedding.id);

    async function fetchInitialMedia() {
      try {
        console.log('[MediaGallery] Fetching media from API...', { weddingId });
        const response = await fetch(`/api/media?page=1&wedding_id=${weddingId}`);

        if (!response.ok) {
          throw new Error('データの読み込みに失敗しました');
        }

        const data = await response.json();

        console.log('[MediaGallery] API response:', {
          weddingId,
          mediaCount: data.media.length,
          totalCount: data.pagination.total,
          media: data.media
        });

        setInitialMedia(data.media);
        setInitialHasMore(data.pagination.hasMore);
      } catch (err) {
        console.error("[MediaGallery] Error loading media:", err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchInitialMedia();
  }, [wedding, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-200 border-t-rose-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-4 min-h-[calc(100vh-200px)]">
        <p className="text-red-500">データの読み込みに失敗しました</p>
        <p className="text-sm text-gray-500 mt-2">{error}</p>
      </div>
    );
  }

  if (!wedding?.id) {
    return (
      <div className="flex flex-col items-center justify-center px-4 min-h-[calc(100vh-200px)]">
        <p className="text-red-500">結婚式情報が見つかりません</p>
      </div>
    );
  }

  return (
    <InfiniteMediaGallery
      initialMedia={initialMedia}
      initialHasMore={initialHasMore}
      weddingId={String(wedding.id)}
    />
  );
}
