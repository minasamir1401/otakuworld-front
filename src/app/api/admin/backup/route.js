import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import fs from 'fs';

const configPath = './admin_config.json';

function readConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {}
  return { username: 'admin', password: 'adminpassword' };
}

// 1. Export Backup (GET)
export async function GET(request) {
  try {
    // Auth check
    const authHeader = request.headers.get('Authorization');
    const config = readConfig();
    const currentToken = Buffer.from(`${config.username}:${config.password}`).toString('base64');

    if (!authHeader || authHeader !== `Bearer ${currentToken}`) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    // Fetch all anime with seasons, episodes, servers, and downloads
    const animes = await prisma.anime.findMany({
      include: {
        seasons: {
          include: {
            episodes: {
              include: {
                servers: true,
                downloads: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ success: true, count: animes.length, animes });
  } catch (error) {
    console.error('Backup export error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. Import/Restore Backup (POST)
export async function POST(request) {
  try {
    // Auth check
    const authHeader = request.headers.get('Authorization');
    const config = readConfig();
    const currentToken = Buffer.from(`${config.username}:${config.password}`).toString('base64');

    if (!authHeader || authHeader !== `Bearer ${currentToken}`) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    const body = await request.json();
    const { animes } = body;

    if (!animes || !Array.isArray(animes)) {
      return NextResponse.json({ success: false, error: 'تنسيق ملف النسخة الاحتياطية غير صالح' }, { status: 400 });
    }

    console.log(`💾 Starting restore process for ${animes.length} animes...`);

    // Process restoration in a sequential loop to prevent database locking
    let restoreCount = 0;
    for (const animeData of animes) {
      try {
        // Delete existing Anime by slug or id to prevent unique key constraints
        const existing = await prisma.anime.findFirst({
          where: {
            OR: [
              { slug: animeData.slug },
              { url: animeData.url },
              { id: animeData.id }
            ]
          }
        });

        if (existing) {
          await prisma.anime.delete({
            where: { id: existing.id }
          });
        }

        // Recreate the deep nested structure
        await prisma.anime.create({
          data: {
            id: animeData.id,
            title: animeData.title,
            arabicTitle: animeData.arabicTitle,
            slug: animeData.slug,
            url: animeData.url,
            poster: animeData.poster,
            synopsis: animeData.synopsis,
            rating: animeData.rating,
            type: animeData.type,
            status: animeData.status,
            year: animeData.year,
            duration: animeData.duration,
            genres: animeData.genres,
            seoTitle: animeData.seoTitle,
            seoDescription: animeData.seoDescription,
            seoKeywords: animeData.seoKeywords,
            createdAt: animeData.createdAt ? new Date(animeData.createdAt) : undefined,
            seasons: {
              create: (animeData.seasons || []).map(season => ({
                id: season.id,
                name: season.name,
                slug: season.slug,
                url: season.url,
                createdAt: season.createdAt ? new Date(season.createdAt) : undefined,
                episodes: {
                  create: (season.episodes || []).map(ep => ({
                    id: ep.id,
                    number: ep.number,
                    title: ep.title,
                    slug: ep.slug,
                    url: ep.url,
                    createdAt: ep.createdAt ? new Date(ep.createdAt) : undefined,
                    servers: {
                      create: (ep.servers || []).map(srv => ({
                        id: srv.id,
                        name: srv.name,
                        embedUrl: srv.embedUrl,
                        createdAt: srv.createdAt ? new Date(srv.createdAt) : undefined
                      }))
                    },
                    downloads: {
                      create: (ep.downloads || []).map(dl => ({
                        id: dl.id,
                        quality: dl.quality,
                        url: dl.url,
                        createdAt: dl.createdAt ? new Date(dl.createdAt) : undefined
                      }))
                    }
                  }))
                }
              }))
            }
          }
        });

        restoreCount++;
      } catch (err) {
        console.error(`Failed to restore anime ${animeData.title || 'Unknown'}:`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم استعادة النسخة الاحتياطية بنجاح! تم استيراد ${restoreCount} من أصل ${animes.length} أنمي.`
    });
  } catch (error) {
    console.error('Backup import error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
