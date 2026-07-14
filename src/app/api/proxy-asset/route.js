import { NextResponse } from 'next/server';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceUrl = searchParams.get('url');

    if (!resourceUrl || !resourceUrl.startsWith('http')) {
      return new NextResponse('Invalid URL', { status: 400 });
    }

    const response = await fetch(resourceUrl, {
      headers: {
        ...HEADERS,
        'Referer': new URL(resourceUrl).origin + '/',
        'Origin': new URL(resourceUrl).origin,
      },
    });

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('Asset proxy error:', err.message);
    return new NextResponse('Failed', { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}
