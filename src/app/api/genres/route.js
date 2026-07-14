import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const animes = await prisma.anime.findMany({
      select: { genres: true }
    });
    
    const genreSet = new Set();
    animes.forEach(a => {
      if (a.genres) {
        a.genres.split(',').forEach(g => {
          const trimmed = g.trim();
          if (trimmed) genreSet.add(trimmed);
        });
      }
    });
    
    // Sort genres alphabetically
    const genres = Array.from(genreSet).sort((a, b) => a.localeCompare(b, 'ar'));
    return NextResponse.json({ success: true, genres });
  } catch (error) {
    console.error('API Error /api/genres:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
