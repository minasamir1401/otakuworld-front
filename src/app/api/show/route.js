import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const GENRE_MAPPINGS = {
  'أكشن ومغامرات': ['أكشن', 'مغامرات', 'مغامرة', 'ساموراي', 'عسكري', 'سباق', 'قتال'],
  'خيال وسحر': ['خيال', 'سحر', 'ميثولوجيا', 'خيال علمي وفانتازيا', 'خارقة'],
  'خيال علمي وميكا': ['خيال علمي', 'ميكا', 'فضاء', 'آليين'],
  'غموض وتشويق': ['غموض', 'تحقيقات', 'تشويق', 'بوليسي', 'جريمة', 'إثارة'],
  'رعب ودموي': ['رعب', 'دموي', 'نفسي'],
  'دراما ونفسي': ['دراما', 'نفسي'],
  'رومانسي وحريم': ['رومانسي', 'حريم', 'شونين آي'],
  'مدرسي ورياضي': ['مدرسي', 'رياضي', 'مدرسة'],
  'شونين وسينين': ['شونين', 'سينين', 'شوجو', 'جوسي'],
  'كوميديا وسخرية': ['كوميدي', 'ساخر', 'كوميديا'],
  'شريحة من الحياة': ['شريحة من الحياة', 'حياة العمل', 'طبي', 'ذواق', 'موسيقي', 'ألعاب']
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all';
    const genre = searchParams.get('genre');
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '24', 10);
    const skip = (page - 1) * limit;

    const totalCount = await prisma.anime.count();

    // 1. Unified Search & Genre filtering
    if (query || genre) {
      let whereClause = {};
      let genreFilter = {};

      if (genre) {
        const subGenres = GENRE_MAPPINGS[genre] || [genre];
        genreFilter = {
          OR: subGenres.map(g => ({ genres: { contains: g } }))
        };
      }

      if (query && genre) {
        whereClause = {
          AND: [
            genreFilter,
            {
              OR: [
                { title: { contains: query } },
                { arabicTitle: { contains: query } },
                { synopsis: { contains: query } },
                { genres: { contains: query } }
              ]
            }
          ]
        };
      } else if (query) {
        whereClause = {
          OR: [
            { title: { contains: query } },
            { arabicTitle: { contains: query } },
            { synopsis: { contains: query } },
            { genres: { contains: query } }
          ]
        };
      } else if (genre) {
        whereClause = genreFilter;
      }

      const animes = await prisma.anime.findMany({
        where: whereClause,
        take: limit,
        skip: skip,
        orderBy: { year: 'desc' }
      });
      return NextResponse.json({ success: true, animes, totalCount });
    }

    // 3. Query categories
    let animes = [];
    if (type === 'trending' || type === 'latest') {
      animes = await prisma.anime.findMany({
        take: limit,
        skip: skip,
        orderBy: { createdAt: 'asc' }
      });
    } else if (type === 'airing') {
      animes = await prisma.anime.findMany({
        where: {
          OR: [
            { status: { contains: 'يعرض' } },
            { status: { contains: 'مستمر' } }
          ]
        },
        take: limit,
        skip: skip,
        orderBy: { year: 'desc' }
      });
    } else if (type === 'top') {
      animes = await prisma.anime.findMany({
        take: limit,
        skip: skip,
        orderBy: { rating: 'desc' }
      });
    } else if (type === 'movies') {
      animes = await prisma.anime.findMany({
        where: { type: 'Movie' },
        take: limit,
        skip: skip,
        orderBy: { year: 'desc' }
      });
    } else if (type !== 'all') {
      // Allow exact match for our custom types (e.g. movie-foreign, series-asian)
      animes = await prisma.anime.findMany({
        where: { type: type },
        take: limit,
        skip: skip,
        orderBy: { createdAt: 'desc' }
      });
    } else {
      animes = await prisma.anime.findMany({
        take: limit,
        skip: skip,
        orderBy: { title: 'asc' }
      });
    }

    return NextResponse.json({ success: true, animes, totalCount });
  } catch (error) {
    console.error('API Error /api/anime:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
