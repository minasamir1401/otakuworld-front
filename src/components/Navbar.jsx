'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from './LanguageContext';

export default function Navbar() {
  const [show, setShow] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const pathname = usePathname();
  const { lang, toggleLanguage, t } = useLanguage();
  const isAr = lang === 'ar';

  useEffect(() => {
    if (pathname && !pathname.startsWith('/admin')) {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathname })
      }).catch(err => console.error('Analytics error:', err));
    }
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY;
        if (currentScrollY > lastScrollY && currentScrollY > 50) {
          setShow(false);
        } else {
          setShow(true);
        }
        setLastScrollY(currentScrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <header className={`sticky top-0 z-50 border-b border-border-glass bg-bg-secondary/80 backdrop-blur-xl transition-transform duration-300 ${show ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="container mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
        
        {/* Left/Right side: Brand Logo & Navigation based on direction */}
        <div className="flex items-center gap-10">
          <a href="/" className="flex items-center group">
            <img 
              src="/logo.jpg" 
              alt={isAr ? "عالم الأوتاكو" : "Otaku World"} 
              className="h-20 md:h-24 w-auto object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.4)] group-hover:scale-105 transition-all duration-300 rounded-full"
            />
          </a>

          {/* Desktop Nav links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-black text-text-muted">
            <a href="/" className="hover:text-text-primary transition-colors relative py-1 group/item">
              {t('navHome')}
              <span className={`absolute bottom-0 ${isAr ? 'right-0' : 'left-0'} w-0 h-0.5 bg-accent-primary transition-all duration-300 group-hover/item:w-full`}></span>
            </a>
            <a href="/?tab=trending" className="hover:text-text-primary transition-colors relative py-1 group/item">
              {t('navAnime')}
              <span className={`absolute bottom-0 ${isAr ? 'right-0' : 'left-0'} w-0 h-0.5 bg-accent-primary transition-all duration-300 group-hover/item:w-full`}></span>
            </a>
            <a href="/?tab=movies" className="hover:text-text-primary transition-colors relative py-1 group/item">
              {t('navMovies')}
              <span className={`absolute bottom-0 ${isAr ? 'right-0' : 'left-0'} w-0 h-0.5 bg-accent-primary transition-all duration-300 group-hover/item:w-full`}></span>
            </a>

            <a href="/schedule" className="hover:text-text-primary transition-colors relative py-1 group/item">
              {t('navSchedule')}
              <span className={`absolute bottom-0 ${isAr ? 'right-0' : 'left-0'} w-0 h-0.5 bg-accent-primary transition-all duration-300 group-hover/item:w-full`}></span>
            </a>
            <a href="/?genre=أكشن" className="hover:text-text-primary transition-colors relative py-1 group/item">
              {t('navGenres')}
              <span className={`absolute bottom-0 ${isAr ? 'right-0' : 'left-0'} w-0 h-0.5 bg-accent-primary transition-all duration-300 group-hover/item:w-full`}></span>
            </a>
            <a href="/?watchlist=true" className="hover:text-accent-primary transition-colors flex items-center gap-1.5 relative py-1 group/item">
              {t('navWatchlist')}
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary"></span>
              <span className={`absolute bottom-0 ${isAr ? 'right-0' : 'left-0'} w-0 h-0.5 bg-accent-primary transition-all duration-300 group-hover/item:w-full`}></span>
            </a>
          </nav>
        </div>

        {/* Right/Left side: Search & Language Toggle */}
        <div className="flex items-center gap-4">
          {/* Header Search Input */}
          <form action="/" method="GET" className="relative flex items-center">
            <input
              type="text"
              name="q"
              placeholder={t('searchPlaceholder')}
              className="bg-bg-primary border border-border-glass rounded-full px-5 py-2.5 pr-11 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary focus:bg-bg-secondary focus:shadow-[0_0_20px_rgba(168,85,247,0.08)] transition-all w-[240px] md:w-[280px]"
            />
            <svg className={`w-4 h-4 text-text-muted absolute ${isAr ? 'right-4' : 'left-4'} pointer-events-none`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </form>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="bg-bg-primary hover:bg-bg-secondary border border-border-glass text-text-primary text-[10px] font-black px-3.5 py-2.5 rounded-full transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-sm"
            title={isAr ? "Switch to English" : "تغيير إلى العربية"}
          >
            <span>{isAr ? '🇬🇧' : '🇸🇦'}</span>
            <span className="hidden sm:inline">{isAr ? 'EN' : 'العربية'}</span>
          </button>
        </div>

      </div>
    </header>
  );
}
