import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAdminConfig } from '@/lib/adminAuth';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    console.log('🔑 محاولة تسجيل دخول الإدارة:', { username, password });
    
    const config = await getAdminConfig();
    console.log('📂 بيانات الدخول المخزنة:', { username: config.username });

    if (username === config.username && password === config.password) {
      console.log('✅ نجاح تسجيل الدخول!');
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
    const config = await getAdminConfig();
    const currentToken = Buffer.from(`${config.username}:${config.password}`).toString('base64');

    if (!authHeader || authHeader !== `Bearer ${currentToken}`) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    const { newUsername, newPassword } = await request.json();
    if (!newUsername || !newPassword) {
      return NextResponse.json({ success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور الجديدة' }, { status: 400 });
    }

    await prisma.appConfig.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        username: newUsername,
        password: newPassword
      },
      update: {
        username: newUsername,
        password: newPassword
      }
    });
    
    const newSessionToken = Buffer.from(`${newUsername}:${newPassword}`).toString('base64');
    return NextResponse.json({ success: true, token: newSessionToken });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
