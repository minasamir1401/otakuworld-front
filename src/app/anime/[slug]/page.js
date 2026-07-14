'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '../../../components/LanguageContext';

const getProxyImageUrl = (url) => {
  if (!url) return 'https://via.placeholder.com/300x400';
  if (url.startsWith('/')) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
};

export default function AnimePage() {
  const { slug } = useParams();
  const router = useRouter();
  const { t, translateGenre, lang } = useLanguage();
  const isAr = lang === 'ar';
  
  const [anime, setAnime] = useState(null);
  const [activeSeason, setActiveSeason] = useState(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch anime details on mount
  useEffect(() => {
    if (slug) {
      fetchAnimeDetails();
      checkWatchlistStatus();
    }
  }, [slug]);

  const fetchAnimeDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/anime/details?slug=${slug}`);
      const data = await response.json();
      if (data.success && data.anime) {
        setAnime(data.anime);
        // Default to first season if available
        if (data.anime.seasons && data.anime.seasons.length > 0) {
          setActiveSeason(data.anime.seasons[0]);
        }
      }
    } catch (error) {
      console.error('Failed fetching anime details:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkWatchlistStatus = () => {
    try {
      const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      const found = watchlist.some(item => item.slug === slug);
      setInWatchlist(found);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleWatchlist = () => {
    if (!anime) return;
    try {
      let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      if (inWatchlist) {
        watchlist = watchlist.filter(item => item.slug !== slug);
        setInWatchlist(false);
      } else {
        watchlist.push({
          id: anime.id,
          title: anime.title,
          slug: anime.slug,
          poster: anime.poster,
          rating: anime.rating,
          year: anime.year,
          genres: anime.genres
        });
        setInWatchlist(true);
      }
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4 glass-panel">
        <div className="w-12 h-12 rounded-full border-4 border-t-accent-primary border-border-glass animate-spin" />
        <p className="text-text-muted text-sm font-black">{t('loadingAnime')}</p>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="glass-panel p-16 text-center text-text-muted space-y-4">
        <p className="text-lg font-bold">{t('notFoundAnime')}</p>
        <button 
          onClick={() => router.push('/')}
          className="btn-premium px-6 py-2.5 rounded-xl font-bold text-xs"
        >
          {t('backToHome')}
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-10 ${isAr ? 'text-right' : 'text-left'}`}>
      
      {/* 1. Backdrop Wallpaper Banner */}
      <div className="relative rounded-3xl overflow-hidden h-[340px] md:h-[480px] border border-border-glass shadow-2xl bg-bg-primary">
        <img 
          src={getProxyImageUrl(anime.poster)} 
          alt="Backdrop"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover scale-100 opacity-45 transition-all duration-1000 ease-in-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent" />
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Info overlay inside banner */}
        <div className={`absolute bottom-6 ${isAr ? 'right-6 md:right-12' : 'left-6 md:left-12'} flex flex-col md:flex-row items-end gap-6`}>
          <div className="hidden md:block w-36 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl scale-105 transform translate-y-2">
            <img src={getProxyImageUrl(anime.poster)} alt={anime.title} referrerPolicy="no-referrer" className="object-cover w-full h-full" />
          </div>
          <div className={`space-y-2.5 pb-2 ${isAr ? 'text-right' : 'text-left'}`}>
            <div className="flex flex-wrap items-center gap-2">
              {anime.genres && anime.genres.split(',').map((g, idx) => (
                <span key={idx} className="bg-white/15 text-text-primary border border-white/10 text-[10px] font-black px-2.5 py-1 rounded-full">
                  {translateGenre(g.trim())}
                </span>
              ))}
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white leading-tight drop-shadow-md">
              {anime.title}
            </h1>
            {anime.arabicTitle && (
              <p className="text-text-muted text-xs font-semibold">{anime.arabicTitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Content Layout: Sidebar + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SIDEBAR: Details Card & Watchlist Action (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 space-y-6">
            
            {/* Watchlist toggle button */}
            <button 
              onClick={toggleWatchlist}
              className={`w-full py-3.5 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 border transition-all duration-300 cursor-pointer ${inWatchlist ? 'bg-transparent text-accent-primary border-accent-primary/40 hover:bg-accent-primary/10' : 'bg-gradient-to-l from-accent-primary to-accent-secondary text-white border-transparent hover:scale-[1.02] shadow-lg shadow-accent-primary/20'}`}
            >
              <span>{inWatchlist ? t('watchlistRemove') : t('watchlistAdd')}</span>
            </button>

            {/* Metas table */}
            <div className="space-y-4 text-xs font-bold divide-y divide-border-glass">
              <div className="flex justify-between py-3 items-center">
                <span className="text-text-muted">{t('globalRating')}</span>
                <span className="font-black text-accent-primary bg-accent-primary/10 px-2.5 py-1 rounded-lg">
                  ⭐ {anime.rating ? parseFloat(anime.rating).toFixed(1) : '0.0'}
                </span>
              </div>
              <div className="flex justify-between py-3 items-center">
                <span className="text-text-muted">{t('typeLabel')}</span>
                <span className="text-text-primary font-extrabold">{anime.type || 'TV'}</span>
              </div>
              <div className="flex justify-between py-3 items-center">
                <span className="text-text-muted">{t('statusLabel')}</span>
                <span className="font-extrabold text-emerald-550 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                  {anime.status === 'مستمر' ? t('statusOngoing') : anime.status === 'منتهي' ? t('statusCompleted') : (anime.status || t('statusOngoing'))}
                </span>
              </div>
              <div className="flex justify-between py-3 items-center">
                <span className="text-text-muted">{t('yearLabel')}</span>
                <span className="text-text-primary font-extrabold">{anime.year || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-3 items-center">
                <span className="text-text-muted">{t('durationLabel')}</span>
                <span className="text-text-primary font-extrabold">
                  {anime.duration ? anime.duration.replace('دقيقة', t('durationSuffix')).replace('د', t('durationSuffix')).replace('m', t('durationSuffix')).trim() + ' ' + (isAr ? 'دقيقة' : 'min') : ('24 ' + (isAr ? 'دقيقة' : 'min'))}
                </span>
              </div>
            </div>
            
          </div>
        </div>

        {/* DETAILS SECTION: Synopsis & Seasons/Episodes (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Synopsis */}
          <div className="glass-panel p-6 space-y-3">
            <h3 className={`text-base md:text-lg font-black ${isAr ? 'border-r-4' : 'border-l-4'} border-accent-primary ${isAr ? 'pr-2' : 'pl-2'} text-text-primary`}>
              {t('synopsisTitle')}
            </h3>
            <p className="text-text-muted leading-relaxed text-xs md:text-sm font-medium">
              {anime.synopsis || t('noSynopsis')}
            </p>
          </div>

          {/* Seasons & Episodes Listing */}
          {anime.seasons && anime.seasons.length > 0 ? (
            <div className="glass-panel p-6 space-y-6">
              
              <div className="flex items-center justify-between border-b border-border-glass pb-4">
                <h3 className={`text-base md:text-lg font-black ${isAr ? 'border-r-4' : 'border-l-4'} border-accent-primary ${isAr ? 'pr-2' : 'pl-2'} text-text-primary`}>
                  {t('seasonsTitle')}
                </h3>
                <span className="text-xs text-text-muted font-extrabold">{t('seasonsCountLabel')} {anime.seasons.length}</span>
              </div>

              {/* Seasons tabs */}
              {anime.seasons.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {anime.seasons.map((season) => (
                    <button 
                      key={season.id}
                      onClick={() => setActiveSeason(season)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${activeSeason?.id === season.id ? 'bg-accent-primary text-white border-transparent shadow-lg shadow-accent-primary/25' : 'bg-bg-primary border-transparent text-text-muted hover:bg-bg-secondary hover:text-text-primary'}`}
                    >
                      {isAr ? season.name : season.name.replace('الموسم', 'Season').replace('موسم', 'Season')}
                    </button>
                  ))}
                </div>
              )}

              {/* Episodes Grid */}
              {activeSeason && activeSeason.episodes && activeSeason.episodes.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {activeSeason.episodes.map((ep) => (
                    <a 
                      key={ep.id}
                      href={`/watch/${ep.id}`}
                      className="glass-card py-4 text-center hover:border-accent-primary group transition-all"
                    >
                      <span className="block text-text-muted group-hover:text-accent-primary text-[10px] font-bold mb-0.5">{t('episodeLabel')}</span>
                      <span className="block text-xl text-accent-primary group-hover:text-accent-hover font-black">{ep.number}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-text-muted text-xs font-bold">
                  {t('noEpisodes')}
                </div>
              )}

            </div>
          ) : (
            <div className="glass-panel p-16 text-center text-text-muted text-xs font-bold">
              {t('noSeasons')}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
