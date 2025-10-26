import { prisma } from "@/lib/prisma";
import { InfiniteMediaGallery } from "./InfiniteMediaGallery";

const PAGE_SIZE = 12;

export async function MediaGallery() {
  try {
    console.log('[MediaGallery] Fetching media from database...');

    // サーバーサイドで最初のページを取得
    const [initialMedia, totalCount] = await Promise.all([
      prisma.media.findMany({
        take: PAGE_SIZE,
        orderBy: {
          created_at: 'desc'
        }
      }),
      prisma.media.count()
    ]);

    console.log('[MediaGallery] Database query result:', {
      mediaCount: initialMedia.length,
      totalCount,
      media: initialMedia
    });

    const hasMore = totalCount > PAGE_SIZE;

    return (
      <InfiniteMediaGallery
        initialMedia={initialMedia}
        initialHasMore={hasMore}
      />
    );
  } catch (error) {
    console.error("[MediaGallery] Error loading media:", error);
    return (
      <div className="flex flex-col items-center justify-center px-4 min-h-[calc(100vh-200px)]">
        <p className="text-red-500">データの読み込みに失敗しました</p>
        <p className="text-sm text-gray-500 mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }
}
