import prisma from '@/lib/db';

export default async function sitemap() {
  const baseUrl = 'https://otakuworld.red-gate.tech';

  // 1. Fetch all anime slugs from database
  let animes = [];
  try {
    animes = await prisma.anime.findMany({
      select: {
        slug: true,
        updatedAt: true
      }
    });
  } catch (e) {
    console.error('Sitemap DB query error:', e);
  }

  // 2. Base static routes
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/schedule`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    }
  ];

  // 3. Dynamic anime routes
  const animePages = animes.map((anime) => ({
    url: `${baseUrl}/anime/${encodeURIComponent(anime.slug)}`,
    lastModified: anime.updatedAt || new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticPages, ...animePages];
}
