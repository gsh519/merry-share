import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 12; // 1ページあたりの画像数

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || String(PAGE_SIZE));
    const weddingId = searchParams.get('wedding_id');

    // wedding_idが必須
    if (!weddingId) {
      return NextResponse.json(
        { error: 'wedding_id is required' },
        { status: 400 }
      );
    }

    const skip = (page - 1) * limit;

    console.log('[API /media] Fetching media:', { page, limit, skip, weddingId });

    const [media, totalCount] = await Promise.all([
      prisma.media.findMany({
        where: {
          wedding_id: weddingId
        },
        take: limit,
        skip: skip,
        orderBy: {
          created_at: 'desc'
        }
      }),
      prisma.media.count({
        where: {
          wedding_id: weddingId
        }
      })
    ]);

    console.log('[API /media] Success:', { weddingId, mediaCount: media.length, totalCount });

    return NextResponse.json({
      media: media,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore: skip + media.length < totalCount,
      },
    });
  } catch (error) {
    console.error('[API /media] Error fetching media:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}