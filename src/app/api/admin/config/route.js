import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword';

async function getConfig() {
  try {
    const config = await prisma.appConfig.findUnique({ where: { id: 'singleton' } });
    return config || { username: ADMIN_USERNAME, password: ADMIN_PASSWORD };
  } catch (e) {
    console.error('Error reading AppConfig from DB:', e.message);
    return { username: ADMIN_USERNAME, password: ADMIN_PASSWORD };
  }
}

// GET current config (cfCookie, userAgent)
export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const currentToken = Buffer.from(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}`).toString('base64');

    if (!authHeader || authHeader !== `Bearer ${currentToken}`) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    const config = await getConfig();

    return NextResponse.json({
      success: true,
      cfCookie: config.cfCookie || '',
      userAgent: config.userAgent || '',
      cfProxy: config.cfProxy || ''
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST update config
export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const currentToken = Buffer.from(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}`).toString('base64');

    if (!authHeader || authHeader !== `Bearer ${currentToken}`) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    const body = await request.json();
    const { cfCookie, userAgent, cfProxy } = body;

    await prisma.appConfig.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        cfCookie: cfCookie || '',
        userAgent: userAgent || '',
        cfProxy: cfProxy || '',
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD
      },
      update: {
        cfCookie: cfCookie || '',
        userAgent: userAgent || '',
        cfProxy: cfProxy || ''
      }
    });

    return NextResponse.json({ success: true, message: 'تم حفظ إعدادات تخطي الحماية بنجاح!' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
