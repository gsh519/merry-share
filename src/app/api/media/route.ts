import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 12; // 1ページあたりの画像数

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || String(PAGE_SIZE));

    const skip = (page - 1) * limit;

    console.log('[API /media] Fetching media:', { page, limit, skip });

    const [media, totalCount] = await Promise.all([
      prisma.media.findMany({
        take: limit,
        skip: skip,
        orderBy: {
          created_at: 'desc'
        }
      }),
      prisma.media.count()
    ]);

    console.log('[API /media] Success:', { mediaCount: media.length, totalCount });

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