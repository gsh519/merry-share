import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const filename = searchParams.get('filename');

    if (!url) {
      return NextResponse.json(
        { error: 'URLが指定されていません' },
        { status: 400 }
      );
    }

    // 外部URLからファイルを取得
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const blob = await response.blob();

    // レスポンスヘッダーを設定してダウンロードを促す
    const headers = new Headers();
    headers.set('Content-Type', blob.type || 'application/octet-stream');
    headers.set(
      'Content-Disposition',
      `attachment; filename="${filename || 'download'}"`
    );

    return new NextResponse(blob, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'ダウンロードに失敗しました' },
      { status: 500 }
    );
  }
}
