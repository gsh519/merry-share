import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Temporarily return empty array until database is set up
    const media: any[] = [];
    
    return NextResponse.json(media);
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    );
  }
}