import { NextResponse } from 'next/server';

export function middleware(request) {
  const origin = request.headers.get('origin');
  
  // Define allowed origins
  const allowedOrigins = [
    'https://otakuworld.red-gate.tech',
    'http://otakuworld.red-gate.tech',
    'https://otakuworld-api.red-gate.tech',
    'http://otakuworld-api.red-gate.tech'
  ];

  // If the origin is allowed, set CORS headers
  const isAllowedOrigin = allowedOrigins.includes(origin);

  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    
    if (isAllowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else {
      // Fallback
      response.headers.set('Access-Control-Allow-Origin', 'https://otakuworld.red-gate.tech');
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours cache
    
    return response;
  }

  // Handle actual requests
  const response = NextResponse.next();
  
  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    response.headers.set('Access-Control-Allow-Origin', 'https://otakuworld.red-gate.tech');
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
