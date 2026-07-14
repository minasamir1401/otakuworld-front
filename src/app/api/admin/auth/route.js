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
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    console.log('🔑 محاولة تسجيل دخول الإدارة:', { username, password });
    
    const config = readConfig();
    console.log('📂 بيانات الدخول المخزنة:', config);

    if (username === config.username && password === config.password) {
      console.log('✅ نجاح تسجيل الدخول!');
      // Simple token for verification (in production this would be JWT or session cookie)
      const sessionToken = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      return NextResponse.json({ success: true, token: sessionToken });
    }

    console.log('❌ فشل تسجيل الدخول: تطابق خاطئ!');
    return NextResponse.json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 });
  } catch (error) {
    console.error('💥 خطأ في تسجيل دخول الإدارة:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Change credentials (requires Auth header)
export async function PUT(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const config = readConfig();
    const currentToken = Buffer.from(`${config.username}:${config.password}`).toString('base64');

    if (!authHeader || authHeader !== `Bearer ${currentToken}`) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    const { newUsername, newPassword } = await request.json();
    if (!newUsername || !newPassword) {
      return NextResponse.json({ success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور الجديدة' }, { status: 400 });
    }

    writeConfig({ username: newUsername, password: newPassword });
    
    // Return the new token
    const newSessionToken = Buffer.from(`${newUsername}:${newPassword}`).toString('base64');
    return NextResponse.json({ success: true, token: newSessionToken });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
