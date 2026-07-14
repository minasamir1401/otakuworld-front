import prisma from '@/lib/db';
import { cookies } from 'next/headers';

export async function generateMetadata({ params }) {
  let { slug } = await params;
  
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch (e) {}

  const cookieStore = await cookies();
  const lang = cookieStore.get('lang')?.value || 'ar';
  const isEn = lang === 'en';

  try {
    const anime = await prisma.anime.findFirst({
      where: {
        OR: [
          { slug: slug },
          { slug: decoded }
        ]
      }
    });
    
    if (!anime) {
      return {
        title: isEn ? 'Anime Not Found - Otaku World' : 'أنمي غير موجود - عالم الأوتاكو',
        description: isEn ? 'The page you are looking for does not exist.' : 'الصفحة التي تبحث عنها غير موجودة'
      };
    }
    
    const title = anime.arabicTitle || anime.title;
    const enTitle = anime.title;
    const genres = anime.genres || 'Anime';
    
    let seoTitle, seoDesc, seoKeywords;
    
    if (isEn) {
      seoTitle = `Watch & Download Anime ${enTitle} (${title}) Subtitled - Otaku World`;
      seoDesc = `Watch and download Anime ${enTitle} subtitled in high quality HD. Genre: ${genres}. ${anime.synopsis ? anime.synopsis.substring(0, 150) + '...' : ''} Enjoy watching the latest episodes of ${enTitle} exclusively on Otaku World, ad-free.`;
      seoKeywords = `${enTitle}, ${title}, watch anime, download anime, subbed anime, ${genres}, Otaku World`;
    } else {
      seoTitle = anime.seoTitle || `مشاهدة وتحميل أنمي ${title} (${enTitle}) مترجم - عالم الأوتاكو`;
      seoDesc = anime.seoDescription || `شاهد وحمل أنمي ${title} مترجم بأعلى جودة. تصنيف الأنمي: ${genres}. ${anime.synopsis ? anime.synopsis.substring(0, 150) + '...' : ''} استمتع بمشاهدة أحدث حلقات ${enTitle} حصرياً على عالم الأوتاكو بدون إعلانات.`;
      seoKeywords = anime.seoKeywords || `${title}, ${enTitle}, مشاهدة أنمي, تحميل أنمي, أنمي مترجم, ${genres.split(',').join(', ')}, عالم الأوتاكو, AnimeXArab`;
    }
    
    const poster = anime.poster || '/logo.jpg';
    const imageUrl = poster.startsWith('/') ? `https://otakuworld.red-gate.tech${poster}` : poster;

    return {
      title: seoTitle,
      description: seoDesc,
      keywords: seoKeywords,
      openGraph: {
        title: seoTitle,
        description: seoDesc,
        url: `https://otakuworld.red-gate.tech/anime/${slug}`,
        siteName: isEn ? 'Otaku World' : 'عالم الأوتاكو',
        images: [
          {
            url: imageUrl,
            width: 800,
            height: 600,
            alt: seoTitle,
          },
        ],
        locale: isEn ? 'en_US' : 'ar_AR',
        type: 'video.tv_show',
      },
      twitter: {
        card: 'summary_large_image',
        title: seoTitle,
        description: seoDesc,
        images: [imageUrl],
      },
    };
  } catch (error) {
    console.error('Metadata generation error:', error);
    return {
      title: isEn ? 'Otaku World' : 'عالم الأوتاكو',
    };
  }
}

export default async function AnimeLayout({ children, params }) {
  const { slug } = await params;
  
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch (e) {}

  let jsonLd = null;
  try {
    const anime = await prisma.anime.findFirst({
      where: {
        OR: [
          { slug: slug },
          { slug: decoded }
        ]
      }
    });

    if (anime) {
      const title = anime.arabicTitle || anime.title;
      const isMovie = anime.type === 'Movie';
      
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': isMovie ? 'Movie' : 'TVSeries',
        'name': title,
        'alternativeHeadline': anime.title,
        'description': anime.seoDescription || anime.synopsis || `مشاهدة وتحميل أنمي ${title} مترجم`,
        'genre': anime.genres ? anime.genres.split(',').map(g => g.trim()) : [],
        'image': anime.poster || 'https://otakuworld.red-gate.tech/logo.jpg',
        'aggregateRating': {
          '@type': 'AggregateRating',
          'ratingValue': anime.rating || '9.0',
          'bestRating': '10',
          'worstRating': '1',
          'ratingCount': '24'
        }
      };
    }
  } catch (e) {
    console.error('Error generating layout JSON-LD:', e);
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
