import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const configPath = './admin_config.json';

function readConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {}
  return { username: 'admin', password: 'adminpassword' };
}

function writeConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

// GET current config (cfCookie, userAgent)
export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const config = readConfig();
    const currentToken = Buffer.from(`${config.username}:${config.password}`).toString('base64');

    if (!authHeader || authHeader !== `Bearer ${currentToken}`) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      cfCookie: config.cfCookie || '',
      userAgent: config.userAgent || ''
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST update config
export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const config = readConfig();
    const currentToken = Buffer.from(`${config.username}:${config.password}`).toString('base64');

    if (!authHeader || authHeader !== `Bearer ${currentToken}`) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    const body = await request.json();
    const { cfCookie, userAgent } = body;

    config.cfCookie = cfCookie || '';
    config.userAgent = userAgent || '';

    const saved = writeConfig(config);
    if (!saved) {
      return NextResponse.json({ success: false, error: 'فشل حفظ الإعدادات على السيرفر' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'تم حفظ إعدادات تخطي الحماية بنجاح!' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
