import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import fs from 'fs';
import path from 'path';

const configPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'admin_config.json');

function readConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {}
  return { username: 'admin', password: 'adminpassword' };
}

function validateAuth(request) {
  const authHeader = request.headers.get('Authorization');
  const config = readConfig();
  const currentToken = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  return authHeader === `Bearer ${currentToken}`;
}

export async function GET(request) {
  try {
    if (!validateAuth(request)) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 15;
    const skip = (page - 1) * limit;

    let whereClause = {};
    if (q) {
      whereClause = {
        OR: [
          { title: { contains: q } },
          { arabicTitle: { contains: q } }
        ]
      };
    }

    const animes = await prisma.anime.findMany({
      where: whereClause,
      take: limit,
      skip: skip,
      orderBy: { createdAt: 'desc' }
    });

    const totalCount = await prisma.anime.count({ where: whereClause });

    return NextResponse.json({ success: true, animes, totalCount, page, totalPages: Math.ceil(totalCount / limit) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!validateAuth(request)) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    const { title, arabicTitle, slug, poster, rating, type, status, year, duration, genres, synopsis, seoTitle, seoDescription, seoKeywords } = await request.json();

    if (!title || !slug) {
      return NextResponse.json({ success: false, error: 'العنوان والرابط اللطيف (slug) مطلوبان' }, { status: 400 });
    }

    // Check if slug is unique
    const existing = await prisma.anime.findFirst({
      where: {
        OR: [
          { slug: slug },
          { url: `${BASE_URL_PLACEHOLDER()}/${slug}` }
        ]
      }
    });

    if (existing) {
      return NextResponse.json({ success: false, error: 'الرابط اللطيف (slug) مستخدم بالفعل' }, { status: 400 });
    }

    const newAnime = await prisma.anime.create({
      data: {
        title,
        arabicTitle: arabicTitle || null,
        slug,
        url: `custom-url-${Date.now()}`, // unique mock url since it's custom
        poster: poster || null,
        rating: rating || '10.0',
        type: type || 'TV',
        status: status || 'مستمر',
        year: year || '2026',
        duration: duration || null,
        genres: genres || null,
        synopsis: synopsis || null,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        seoKeywords: seoKeywords || null
      }
    });

    return NextResponse.json({ success: true, anime: newAnime });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    if (!validateAuth(request)) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    const { id, title, arabicTitle, poster, rating, type, status, year, duration, genres, synopsis, seoTitle, seoDescription, seoKeywords } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'المعرف ID مطلوب لتحديث الأنمي' }, { status: 400 });
    }

    const updatedAnime = await prisma.anime.update({
      where: { id },
      data: {
        title,
        arabicTitle: arabicTitle || null,
        poster: poster || null,
        rating: rating || '10.0',
        type: type || 'TV',
        status: status || 'مستمر',
        year: year || '2026',
        duration: duration || null,
        genres: genres || null,
        synopsis: synopsis || null,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        seoKeywords: seoKeywords || null
      }
    });

    return NextResponse.json({ success: true, anime: updatedAnime });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    if (!validateAuth(request)) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'المعرف ID مطلوب لحذف الأنمي' }, { status: 400 });
    }

    await prisma.anime.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'تم حذف الأنمي وجميع مواسمه وحلقاته بنجاح' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function BASE_URL_PLACEHOLDER() {
  return 'https://eta.animerco.org';
}
