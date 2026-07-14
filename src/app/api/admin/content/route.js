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

// 1. POST: Create Season, Episode, Server, or Download Link
export async function POST(request) {
  try {
    if (!validateAuth(request)) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    const body = await request.json();
    const { contentType } = body;

    if (contentType === 'season') {
      const { animeId, name, slug } = body;
      if (!animeId || !name || !slug) {
        return NextResponse.json({ success: false, error: 'المعلومات غير مكتملة لإنشاء الموسم' }, { status: 400 });
      }

      // Check if slug is unique
      const existing = await prisma.season.findFirst({
        where: { slug }
      });
      if (existing) {
        return NextResponse.json({ success: false, error: 'الرابط اللطيف للموسم مستخدم بالفعل' }, { status: 400 });
      }

      const season = await prisma.season.create({
        data: {
          name,
          slug,
          url: `custom-season-url-${Date.now()}`,
          animeId
        }
      });
      return NextResponse.json({ success: true, data: season });

    } else if (contentType === 'episode') {
      const { seasonId, number, title, slug } = body;
      if (!seasonId || !number || !title || !slug) {
        return NextResponse.json({ success: false, error: 'المعلومات غير مكتملة لإنشاء الحلقة' }, { status: 400 });
      }

      const existing = await prisma.episode.findFirst({
        where: { slug }
      });
      if (existing) {
        return NextResponse.json({ success: false, error: 'الرابط اللطيف للحلقة مستخدم بالفعل' }, { status: 400 });
      }

      const episode = await prisma.episode.create({
        data: {
          number,
          title,
          slug,
          url: `custom-episode-url-${Date.now()}`,
          seasonId
        }
      });
      return NextResponse.json({ success: true, data: episode });

    } else if (contentType === 'server') {
      const { episodeId, name, embedUrl } = body;
      if (!episodeId || !name || !embedUrl) {
        return NextResponse.json({ success: false, error: 'المعلومات غير مكتملة لإنشاء السيرفر' }, { status: 400 });
      }

      const server = await prisma.videoServer.create({
        data: {
          name,
          embedUrl,
          episodeId
        }
      });
      return NextResponse.json({ success: true, data: server });

    } else if (contentType === 'download') {
      const { episodeId, quality, url } = body;
      if (!episodeId || !quality || !url) {
        return NextResponse.json({ success: false, error: 'المعلومات غير مكتملة لرابط التحميل' }, { status: 400 });
      }

      const download = await prisma.downloadLink.create({
        data: {
          quality,
          url,
          episodeId
        }
      });
      return NextResponse.json({ success: true, data: download });
    }

    return NextResponse.json({ success: false, error: 'نوع محتوى غير معروف' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. DELETE: Delete Season, Episode, Server, or Download Link
export async function DELETE(request) {
  try {
    if (!validateAuth(request)) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('contentType');
    const id = searchParams.get('id');

    if (!id || !contentType) {
      return NextResponse.json({ success: false, error: 'المعرف ونوع المحتوى مطلوبان للحذف' }, { status: 400 });
    }

    if (contentType === 'season') {
      await prisma.season.delete({ where: { id } });
    } else if (contentType === 'episode') {
      await prisma.episode.delete({ where: { id } });
    } else if (contentType === 'server') {
      await prisma.videoServer.delete({ where: { id } });
    } else if (contentType === 'download') {
      await prisma.downloadLink.delete({ where: { id } });
    } else {
      return NextResponse.json({ success: false, error: 'نوع محتوى غير معروف' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 3. GET: Get sub-resources (e.g. list seasons for anime, or episodes for season)
export async function GET(request) {
  try {
    if (!validateAuth(request)) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');

    if (resource === 'seasons') {
      const animeId = searchParams.get('animeId');
      const seasons = await prisma.season.findMany({
        where: { animeId },
        orderBy: { name: 'asc' }
      });
      return NextResponse.json({ success: true, seasons });

    } else if (resource === 'episodes') {
      const seasonId = searchParams.get('seasonId');
      const episodes = await prisma.episode.findMany({
        where: { seasonId },
        include: { servers: true, downloads: true }
      });
      // Sort episodes numerically before returning
      episodes.sort((a, b) => {
        const numA = parseFloat(a.number) || 0;
        const numB = parseFloat(b.number) || 0;
        return numA - numB;
      });
      return NextResponse.json({ success: true, episodes });
    }

    return NextResponse.json({ success: false, error: 'طلب غير معروف' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
