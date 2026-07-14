import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    if (!imageUrl) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    // Encode non-ASCII characters (Arabic filenames) in the URL path
    let safeUrl = imageUrl;
    try {
      const parsed = new URL(imageUrl);
      // Re-encode only the pathname to handle Arabic filenames
      parsed.pathname = parsed.pathname.split('/').map(seg => {
        try { return encodeURIComponent(decodeURIComponent(seg)); } catch { return encodeURIComponent(seg); }
      }).join('/');
      safeUrl = parsed.toString();
    } catch {
      safeUrl = imageUrl;
    }

    const response = await fetch(safeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': new URL(safeUrl).origin + '/',
        'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      return NextResponse.redirect(`https://via.placeholder.com/300x400?text=No+Image`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    console.error('Image proxy error:', error.message);
    return NextResponse.redirect(`https://via.placeholder.com/300x400?text=Error`);
  }
}
