import './globals.css';
import Navbar from '../components/Navbar';
import { LanguageProvider } from '../components/LanguageContext';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get('lang')?.value || 'ar';
  
  if (lang === 'en') {
    return {
      title: 'Otaku World | Watch & Download Anime Subtitled in High Quality HD',
      description: 'Watch and download the latest anime series and movies translated in high quality HD for free on Otaku World. Enjoy fast streaming, no pop-up ads, and daily updates.',
      keywords: 'Otaku World, anime, watch anime, download anime, anime online, watch anime online, free anime, anime series, anime movies, no ads, portal anime',
      robots: {
        index: true,
        follow: true,
      },
      icons: {
        icon: '/logo.jpg',
        shortcut: '/logo.jpg',
        apple: '/logo.jpg',
      },
      openGraph: {
        type: 'website',
        locale: 'en_US',
        alternateLocale: 'ar_AR',
        url: 'https://otakuworld.red-gate.tech',
        siteName: 'Otaku World',
        title: 'Otaku World | Watch & Download Anime Subtitled in High Quality HD',
        description: 'Watch and download the latest anime series and movies translated in high quality HD for free on Otaku World. Enjoy fast streaming, no pop-up ads.',
        images: [
          {
            url: '/logo.jpg',
            width: 800,
            height: 800,
            alt: 'Otaku World Logo',
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Otaku World | Watch & Download Anime Subtitled in High Quality HD',
        description: 'Watch and download the latest anime series and movies translated in high quality HD for free on Otaku World.',
        images: ['/logo.jpg'],
      }
    };
  }

  return {
    title: 'عالم الأوتاكو - Otaku World | مشاهدة وتحميل الأنمي مترجم بجودة عالية HD',
    description: 'شاهد وحمل أحدث مسلسلات وأفلام الأنمي المترجمة مجاناً وبجودة عالية HD على عالم الأوتاكو (Otaku World). استمتع بمشاهدة سريعة وبدون إعلانات منبثقة مزعجة مع تحديثات يومية للحلقات.',
    keywords: 'عالم الأوتاكو, انمي, أنمي مترجم, مشاهدة أنمي, تحميل أنمي, انمي اون لاين, Otaku World, Anime, AnimeXArab, watch anime online, free anime, ون بيس مترجم, ناروتو مترجم, هجوم العمالقة, انمي بدون اعلانات, مسلسلات انمي مترجمة, افلام انمي مترجمة, بوابة الأنمي, انمي ليك, شاهد انمي',
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: '/logo.jpg',
      shortcut: '/logo.jpg',
      apple: '/logo.jpg',
    },
    openGraph: {
      type: 'website',
      locale: 'ar_AR',
      alternateLocale: 'en_US',
      url: 'https://otakuworld.red-gate.tech',
      siteName: 'عالم الأوتاكو - Otaku World',
      title: 'عالم الأوتاكو - Otaku World | مشاهدة وتحميل الأنمي مترجم بجودة عالية HD',
      description: 'شاهد وحمل أحدث مسلسلات وأفلام الأنمي المترجمة مجاناً وبجودة عالية HD على عالم الأوتاكو (Otaku World). استمتع بمشاهدة سريعة وبدون إعلانات منبثقة مزعجة.',
      images: [
        {
          url: '/logo.jpg',
          width: 800,
          height: 800,
          alt: 'لوجو عالم الأوتاكو',
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'عالم الأوتاكو - Otaku World | مشاهدة وتحميل الأنمي مترجم بجودة عالية HD',
      description: 'شاهد وحمل أحدث مسلسلات وأفلام الأنمي المترجمة مجاناً وبجودة عالية HD على عالم الأوتاكو (Otaku World). استمتع بمشاهدة سريعة وبدون إعلانات.',
      images: ['/logo.jpg'],
    }
  };
}

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const lang = cookieStore.get('lang')?.value || 'ar';
  const isAr = lang === 'ar';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': isAr ? 'عالم الأوتاكو - Otaku World' : 'Otaku World',
    'url': 'https://otakuworld.red-gate.tech',
    'description': isAr
      ? 'شاهد وحمل أحدث مسلسلات وأفلام الأنمي المترجمة مجاناً وبجودة عالية HD على عالم الأوتاكو (Otaku World). استمتع بمشاهدة سريعة وبدون إعلانات.'
      : 'Watch and download the latest anime series and movies translated in high quality HD for free on Otaku World.',
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': 'https://otakuworld.red-gate.tech/?q={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    }
  };

  return (
    <html lang={lang} dir={isAr ? 'rtl' : 'ltr'}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Tajawal:wght@300;400;500;700;900&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <LanguageProvider initialLang={lang}>
          <Navbar />

          {/* Main Content Area */}
          <main className="flex-grow container mx-auto px-4 lg:px-8 py-8">
            {children}
          </main>

          {/* Footer Area */}
          <footer className="border-t border-border-glass bg-bg-secondary/40 py-10 mt-20 text-sm text-text-muted">
            <div className="container mx-auto px-4 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">

              {/* Copywrite */}
              <div>
                <p className="mb-1 text-text-primary">
                  {isAr ? (
                    <>جميع الحقوق محفوظة © {new Date().getFullYear()} <span className="font-extrabold text-text-primary">عالم الأوتاكو</span></>
                  ) : (
                    <>All rights reserved © {new Date().getFullYear()} <span className="font-extrabold text-text-primary">Otaku World</span></>
                  )}
                </p>
                <p className="text-xs text-text-muted">
                  {isAr 
                    ? "منصة ترفيهية لمشاهدة الأنمي مترجم بأعلى جودة وبأحدث تقنيات المشغلات خالية من الإعلانات."
                    : "An entertainment platform to watch translated anime in high quality with the latest players, ad-free."}
                </p>
              </div>

              {/* Navigation links */}
              <div className="flex flex-wrap justify-center gap-6 text-xs font-semibold">
                <a href="#" className="hover:text-text-primary transition-colors">{isAr ? "من نحن" : "About Us"}</a>
                <a href="#" className="hover:text-text-primary transition-colors">{isAr ? "اتصل بنا" : "Contact Us"}</a>
                <a href="#" className="hover:text-text-primary transition-colors">{isAr ? "الشروط والأحكام" : "Terms & Conditions"}</a>
                <a href="#" className="hover:text-text-primary transition-colors">{isAr ? "سياسة الخصوصية" : "Privacy Policy"}</a>
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-4 text-text-muted">
                <a href="#" className="w-8 h-8 rounded-full bg-bg-secondary border border-border-glass flex items-center justify-center hover:bg-accent-primary hover:border-transparent hover:text-white transition-all" title="Discord">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.873-.894a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.92 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.244.2.372.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.894a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.156-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.156-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.156 2.418z"></path>
                  </svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-bg-secondary border border-border-glass flex items-center justify-center hover:bg-accent-primary hover:border-transparent hover:text-white transition-all" title="Twitter">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                  </svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-bg-secondary border border-border-glass flex items-center justify-center hover:bg-accent-primary hover:border-transparent hover:text-white transition-all" title="Instagram">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919c.058 1.265.069 1.645.069 4.849c0 3.205-.012 3.584-.069 4.849c-.149 3.225-1.664 4.771-4.919 4.919c-1.266.058-1.644.07-4.85.07c-3.204 0-3.584-.012-4.849-.07c-3.26-.149-4.771-1.699-4.919-4.92c-.058-1.265-.07-1.644-.07-4.849c0-3.204.013-3.583.07-4.849c.149-3.227 1.664-4.771 4.919-4.919c1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072C2.695.272.273 2.69.073 7.051C.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948c.2 4.358 2.618 6.78 6.98 6.98c1.281.058 1.689.072 4.948.072c3.259 0 3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98c.059-1.28.073-1.689.073-4.948c0-3.259-.014-3.667-.072-4.947c-.2-4.358-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324a6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8a4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881a1.44 1.44 0 0 0 0-2.881z"></path>
                  </svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-bg-secondary border border-border-glass flex items-center justify-center hover:bg-accent-primary hover:border-transparent hover:text-white transition-all" title="Telegram">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.944 0C5.344 0 0 5.344 0 12c0 6.656 5.344 12 12 12c6.656 0 12-5.344 12-12C24 5.344 18.656 0 11.944 0zm5.892 8.272l-1.92 9.056c-.144.64-.528.8-.1.528l-2.928-2.16l-1.412 1.36c-.156.156-.288.288-.588.288l.208-2.96l5.392-4.88c.236-.208-.052-.324-.364-.12l-6.66 4.192l-2.872-.9c-.624-.192-.636-.624.132-.924l11.232-4.332c.516-.192.972.12.78 1.112z"></path>
                  </svg>
                </a>
              </div>

            </div>
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}
