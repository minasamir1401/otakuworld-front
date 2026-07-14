import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request) {
  try {
    const { path } = await request.json();
    if (!path) {
      return NextResponse.json({ success: false, error: 'Path is required' }, { status: 400 });
    }

    // Capture IP address from headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    let ip = realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : null);

    // Basic IP hash or anonymization for privacy
    if (ip) {
      // Basic anonymization (e.g. keeping only the subnet or simply hash, but simple string mask is fine)
      const ipParts = ip.split('.');
      if (ipParts.length === 4) {
        ip = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0`; // mask last octet
      }
    }

    await prisma.visit.create({
      data: {
        path,
        ip: ip || null
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Tracking Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
