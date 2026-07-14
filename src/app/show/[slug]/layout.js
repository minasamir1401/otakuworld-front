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
    const show = await prisma.anime.findFirst({
      where: {
        OR: [
          { slug: slug },
          { slug: decoded }
        ]
      }
    });
    
    if (!show) {
      return {
        title: isEn ? 'Show Not Found - Otaku World' : 'عمل غير موجود - عالم الأوتاكو',
        description: isEn ? 'The page you are looking for does not exist.' : 'الصفحة التي تبحث عنها غير موجودة'
      };
    }
    
    const title = show.arabicTitle || show.title;
    const enTitle = show.title;
    const genres = show.genres || 'Show';
    
    let seoTitle, seoDesc, seoKeywords;
    
    if (isEn) {
      seoTitle = `Watch & Download Show ${enTitle} (${title}) Subtitled - Otaku World`;
      seoDesc = `Watch and download show ${enTitle} subtitled in high quality HD. Genre: ${genres}. ${show.synopsis ? show.synopsis.substring(0, 150) + '...' : ''} Enjoy watching the latest episodes of ${enTitle} exclusively on Otaku World, ad-free.`;
      seoKeywords = `${enTitle}, ${title}, watch show, download show, subbed show, ${genres}, Otaku World`;
    } else {
      seoTitle = show.seoTitle || `مشاهدة وتحميل عمل ${title} (${enTitle}) مترجم - عالم الأوتاكو`;
      seoDesc = show.seoDescription || `شاهد وحمل عمل ${title} مترجم بأعلى جودة. تصنيف العمل: ${genres}. ${show.synopsis ? show.synopsis.substring(0, 150) + '...' : ''} استمتع بمشاهدة أحدث حلقات ${enTitle} حصرياً على عالم الأوتاكو بدون إعلانات.`;
      seoKeywords = show.seoKeywords || `${title}, ${enTitle}, مشاهدة عمل, تحميل عمل, عمل مترجم, ${genres.split(',').join(', ')}, عالم الأوتاكو, AnimeXArab`;
    }
    
    const poster = show.poster || '/logo.jpg';
    const imageUrl = poster.startsWith('/') ? `https://otakuworld.red-gate.tech${poster}` : poster;

    return {
      title: seoTitle,
      description: seoDesc,
      keywords: seoKeywords,
      openGraph: {
        title: seoTitle,
        description: seoDesc,
        url: `https://otakuworld.red-gate.tech/show/${slug}`,
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

export default async function ShowLayout({ children, params }) {
  const { slug } = await params;
  
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch (e) {}

  let jsonLd = null;
  try {
    const show = await prisma.anime.findFirst({
      where: {
        OR: [
          { slug: slug },
          { slug: decoded }
        ]
      }
    });

    if (show) {
      const title = show.arabicTitle || show.title;
      const isMovie = show.type === 'Movie';
      
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': isMovie ? 'Movie' : 'TVSeries',
        'name': title,
        'alternativeHeadline': show.title,
        'description': show.seoDescription || show.synopsis || `مشاهدة وتحميل عمل ${title} مترجم`,
        'genre': show.genres ? show.genres.split(',').map(g => g.trim()) : [],
        'image': show.poster || 'https://otakuworld.red-gate.tech/logo.jpg',
        'aggregateRating': {
          '@type': 'AggregateRating',
          'ratingValue': show.rating || '9.0',
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
