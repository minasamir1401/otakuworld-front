import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
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

function isPidRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

function getScraperStatus(name) {
  const pidPath = './' + name + '.pid';
  if (fs.existsSync(pidPath)) {
    try {
      const pid = parseInt(fs.readFileSync(pidPath, 'utf8').trim(), 10);
      if (isPidRunning(pid)) {
        return { running: true, pid };
      }
    } catch (e) {}
  }
  return { running: false, pid: null };
}

export async function GET(request) {
  try {
    // Auth validation
    const authHeader = request.headers.get('Authorization');
    const config = readConfig();
    const currentToken = Buffer.from(`${config.username}:${config.password}`).toString('base64');

    if (!authHeader || authHeader !== `Bearer ${currentToken}`) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    // Database counts
    const animeCount = await prisma.anime.count();
    const tvCount = await prisma.anime.count({ where: { type: { not: 'Movie' } } });
    const movieCount = await prisma.anime.count({ where: { type: 'Movie' } });
    const seasonsCount = await prisma.season.count();
    const episodesCount = await prisma.episode.count();
    const serversCount = await prisma.videoServer.count();
    const downloadsCount = await prisma.downloadLink.count();

    // Visitor Stats
    const totalVisits = await prisma.visit.count();
    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const visits24h = await prisma.visit.count({
      where: { createdAt: { gte: past24h } }
    });

    // Top 10 Visited Pages
    const topPagesRaw = await prisma.visit.groupBy({
      by: ['path'],
      _count: {
        path: true
      },
      orderBy: {
        _count: {
          path: 'desc'
        }
      },
      take: 10
    });

    const topPages = topPagesRaw.map(p => ({
      path: p.path,
      count: p._count.path
    }));

    // Resolve slugs and IDs in top pages to clean titles
    const resolvedTopPages = await Promise.all(
      topPages.map(async (page) => {
        try {
          if (page.path.startsWith('/anime/')) {
            const slug = page.path.replace('/anime/', '');
            let decodedSlug = slug;
            try {
              decodedSlug = decodeURIComponent(slug);
            } catch (e) {}

            const anime = await prisma.anime.findFirst({
              where: {
                OR: [
                  { slug: slug },
                  { slug: decodedSlug }
                ]
              },
              select: { title: true, arabicTitle: true }
            });
            if (anime) {
              return {
                ...page,
                name: anime.arabicTitle || anime.title,
                type: 'أنمي'
              };
            }
          } else if (page.path.startsWith('/watch/')) {
            const episodeId = page.path.replace('/watch/', '');
            const episode = await prisma.episode.findUnique({
              where: { id: episodeId },
              include: {
                season: {
                  include: {
                    anime: true
                  }
                }
              }
            });
            if (episode && episode.season && episode.season.anime) {
              return {
                ...page,
                name: `${episode.season.anime.arabicTitle || episode.season.anime.title} - ${episode.title}`,
                type: 'حلقة'
              };
            }
          }
        } catch (e) {
          console.error('Error resolving path in stats:', e);
        }

        let name = page.path;
        if (page.path === '/') name = 'الرئيسية';
        else if (page.path === '/schedule') name = 'جدول المواعيد';

        return {
          ...page,
          name,
          type: 'رابط مباشر'
        };
      })
    );

    // Scrapers statuses
    const animeScraper = getScraperStatus('anime_scraper');
    const moviesScraper = getScraperStatus('movies_scraper');
    const scheduleSync = getScraperStatus('schedule_sync');

    return NextResponse.json({
      success: true,
      stats: {
        animeCount,
        tvCount,
        movieCount,
        seasonsCount,
        episodesCount,
        serversCount,
        downloadsCount,
        totalVisits,
        visits24h,
        resolvedTopPages
      },
      scrapers: {
        animeScraper,
        moviesScraper,
        scheduleSync
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
