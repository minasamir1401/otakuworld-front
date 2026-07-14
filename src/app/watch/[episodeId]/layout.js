import prisma from '@/lib/db';
import { cookies } from 'next/headers';

export async function generateMetadata({ params }) {
  const { episodeId } = await params;
  
  const cookieStore = await cookies();
  const lang = cookieStore.get('lang')?.value || 'ar';
  const isEn = lang === 'en';

  try {
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
    
    if (!episode || !episode.season || !episode.season.anime) {
      return {
        title: isEn ? 'Episode Not Found - Otaku World' : 'حلقة غير موجودة - عالم الأوتاكو',
        description: isEn ? 'The episode you are looking for does not exist.' : 'الحلقة التي تبحث عنها غير موجودة'
      };
    }
    
    const anime = episode.season.anime;
    const title = anime.arabicTitle || anime.title;
    const enTitle = anime.title;
    const epTitle = episode.title;
    
    let seoTitle, seoDesc;
    if (isEn) {
      const enEpTitle = epTitle.replace('الحلقة', 'Episode');
      seoTitle = `Watch Anime ${enTitle} ${enEpTitle} Subtitled - Otaku World`;
      seoDesc = `Watch the latest episodes of anime ${enTitle} (${title}). ${enEpTitle} subtitled in high quality HD exclusively on Otaku World, ad-free.`;
    } else {
      seoTitle = `مشاهدة أنمي ${title} ${epTitle} مترجم - عالم الأوتاكو`;
      seoDesc = `شاهد أحدث حلقات أنمي ${title} (${enTitle}). ${epTitle} مترجمة وبأعلى جودة حصرياً على موقع عالم الأوتاكو بدون إعلانات.`;
    }
    
    const poster = anime.poster || '/logo.jpg';
    const imageUrl = poster.startsWith('/') ? `https://otakuworld.red-gate.tech${poster}` : poster;

    return {
      title: seoTitle,
      description: seoDesc,
      keywords: isEn 
        ? `${enTitle}, ${title}, ${epTitle.replace('الحلقة', 'Episode')}, watch episode, subbed anime, Otaku World`
        : `${title}, ${enTitle}, ${epTitle}, مشاهدة الحلقة, أنمي مترجم, عالم الأوتاكو, AnimeXArab`,
      openGraph: {
        title: seoTitle,
        description: seoDesc,
        url: `https://otakuworld.red-gate.tech/watch/${episodeId}`,
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
        type: 'video.episode',
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

export default function WatchLayout({ children }) {
  return children;
}
