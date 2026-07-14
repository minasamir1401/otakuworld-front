import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    if (!id && !slug) {
      return NextResponse.json({ success: false, error: 'Missing anime ID or slug' }, { status: 400 });
    }

    let queryWhere = {};
    if (id) {
      queryWhere = { id };
    } else if (slug) {
      let decoded = slug;
      try {
        decoded = decodeURIComponent(slug);
      } catch (e) {}
      
      let encodedLower = slug;
      let encodedUpper = slug;
      try {
        const enc = encodeURIComponent(decoded);
        encodedLower = enc.toLowerCase();
        encodedUpper = enc.toUpperCase();
      } catch (e) {}

      queryWhere = {
        OR: [
          { slug: slug },
          { slug: decoded },
          { slug: encodedLower },
          { slug: encodedUpper }
        ]
      };
    }

    const anime = await prisma.anime.findFirst({
      where: queryWhere,
      include: {
        seasons: {
          include: {
            episodes: {
              orderBy: { number: 'asc' }
            }
          },
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!anime) {
      return NextResponse.json({ success: false, error: 'Anime not found' }, { status: 404 });
    }

    if (anime.seasons) {
      anime.seasons.forEach(season => {
        if (season.episodes) {
          season.episodes = [...season.episodes].sort((a, b) => {
            const numA = parseFloat(a.number) || 0;
            const numB = parseFloat(b.number) || 0;
            return numA - numB;
          });
        }
      });
    }

    return NextResponse.json({ success: true, anime });
  } catch (error) {
    console.error('API Error /api/anime/details:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
