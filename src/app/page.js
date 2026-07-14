'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '../components/LanguageContext';

const DEFAULT_CATEGORIES = [
  'أكشن ومغامرات',
  'خيال وسحر',
  'خيال علمي وميكا',
  'غموض وتشويق',
  'رعب ودموي',
  'دراما ونفسي',
  'رومانسي وحريم',
  'مدرسي ورياضي',
  'شونين وسينين',
  'كوميديا وسخرية',
  'شريحة من الحياة'
];

const GENRE_EMOJIS = {
  'أكشن ومغامرات': '⚔️',
  'خيال وسحر': '🔮',
  'خيال علمي وميكا': '🚀',
  'غموض وتشويق': '🕵️',
  'رعب ودموي': '👻',
  'دراما ونفسي': '🧠',
  'رومانسي وحريم': '💖',
  'مدرسي ورياضي': '⚽',
  'شونين وسينين': '👊',
  'كوميديا وسخرية': '🤣',
  'شريحة من الحياة': '☘️'
};

const getProxyImageUrl = (url) => {
  if (!url) return 'https://via.placeholder.com/300x400';
  if (url.startsWith('/')) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
};

const getDetailsUrl = (item) => {
  if (!item.type) return `/anime/${item.slug}`;
  if (item.type.includes('movie') || item.type.includes('series') || item.type.includes('show')) {
    return `/show/${item.slug}`;
  }
  return `/anime/${item.slug}`;
};

const getTypeName = (type, t) => {
  if (!type) return t('typeSeries');
  if (type.includes('movie')) return t('typeMovie');
  if (type.includes('series') || type.includes('tv')) return t('typeSeries');
  return t('typeShow');
};

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, translateGenre, lang } = useLanguage();
  const isAr = lang === 'ar';

  const [animes, setAnimes] = useState([]);
  const [activeTab, setActiveTab] = useState('latest');
  const [activeGenre, setActiveGenre] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [watchlistMode, setWatchlistMode] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const searchTimeout = useRef(null);

  // Slideshow for Hero Carousel
  const [currentSlide, setCurrentSlide] = useState(0);
  const [sliderAnimes, setSliderAnimes] = useState([]);

  useEffect(() => {
    const fetchLatestForSlider = async () => {
      try {
        const res = await fetch('/api/anime?type=latest&limit=5');
        const data = await res.json();
        if (data.success) {
          setSliderAnimes(data.animes);
        }
      } catch (err) {
        console.error('Failed to fetch slider items:', err);
      }
    };
    fetchLatestForSlider();
  }, []);

  useEffect(() => {
    if (sliderAnimes.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % sliderAnimes.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [sliderAnimes.length]);

  // Sync state with URL params
  useEffect(() => {
    const genreParam = searchParams.get('genre');
    const tabParam = searchParams.get('tab');
    const watchlistParam = searchParams.get('watchlist') === 'true';
    const qParam = searchParams.get('q');

    setPage(1);
    setAnimes([]);

    if (watchlistParam) {
      setWatchlistMode(true);
      setActiveGenre(null);
      setSearchQuery('');
      loadWatchlist();
    } else {
      setWatchlistMode(false);
      setActiveGenre(genreParam);
      setSearchQuery(qParam || '');

      const tab = tabParam || 'latest';
      setActiveTab(tab);

      fetchAnimes({
        type: tab,
        genre: genreParam,
        q: qParam,
        page: 1
      });
    }
  }, [searchParams]);

  // Fetch anime listing
  const fetchAnimes = async ({ type, genre, q, page = 1, append = false }) => {
    setLoading(true);
    try {
      let url = `/api/anime?page=${page}&limit=12`;
      if (q) {
        url += `&q=${encodeURIComponent(q)}`;
      }
      if (genre) {
        url += `&genre=${encodeURIComponent(genre)}`;
      }
      if (type && !q && !genre) {
        url += `&type=${type}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        if (data.totalCount !== undefined) {
          setTotalCount(data.totalCount);
        }
        if (append) {
          setAnimes(prev => {
            const combined = [...prev, ...data.animes];
            const unique = [];
            const seen = new Set();
            for (const item of combined) {
              const uniqueKey = item.id || item.slug;
              if (!seen.has(uniqueKey)) {
                seen.add(uniqueKey);
                unique.push(item);
              }
            }
            return unique;
          });
        } else {
          setAnimes(data.animes);
        }

        // If we got fewer than 12 items, there is no more data to load
        if (data.animes.length < 12) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch animes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWatchlist = () => {
    setLoading(true);
    try {
      const localWatchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      setAnimes(localWatchlist);
      setHasMore(false);
    } catch (error) {
      console.error('Failed to load watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced real-time typing search handler
  const handleSearchInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (val.trim()) {
        params.set('q', val);
      } else {
        params.delete('q');
      }
      params.delete('page');
      router.push(`/?${params.toString()}`);
    }, 500);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);

    const qParam = searchParams.get('q');
    const genreParam = searchParams.get('genre');

    fetchAnimes({
      type: activeTab,
      genre: genreParam,
      q: qParam,
      page: nextPage,
      append: true
    });
  };

  // Handle side categories click
  const selectGenre = (genre) => {
    const params = new URLSearchParams(window.location.search);
    if (activeGenre === genre) {
      params.delete('genre');
    } else {
      params.set('genre', genre);
    }
    params.delete('page');
    router.push(`/?${params.toString()}`);
  };

  // Switch tabs
  const selectTab = (tab) => {
    router.push(`/?tab=${tab}`);
  };

  return (
    <div className={`space-y-12 ${isAr ? 'text-right' : 'text-left'}`}>
      {/* Semantic H1 for Search Engine Crawlers */}
      <h1 className="sr-only">
        {isAr 
          ? 'عالم الأوتاكو - Otaku World | مشاهدة وتحميل الأنمي مترجم بجودة عالية HD' 
          : 'Otaku World | Watch & Download Anime Subtitled in High Quality HD'}
      </h1>

      {/* 1. Cinematic Hero Banner (FULL WIDTH & DYNAMIC AUTOPLAY CAROUSEL) */}
      {!searchQuery && !watchlistMode && !activeGenre && (
        sliderAnimes.length > 0 ? (
          <div className="relative rounded-3xl overflow-hidden h-[440px] md:h-[580px] flex items-center justify-between p-6 md:p-12 shadow-md border border-border-glass bg-bg-secondary">
            {/* Ambient Wallpaper Background */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={getProxyImageUrl(sliderAnimes[currentSlide]?.poster)}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover scale-100 opacity-20 transition-all duration-1000 ease-in-out"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${isAr ? 'md:bg-gradient-to-r' : 'md:bg-gradient-to-l'} from-transparent via-bg-secondary/40 to-bg-secondary/90`} />
            </div>

            {/* Slide Content */}
            <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between gap-8 h-full">

              {/* Left Side (Desktop): Sharp Poster Card */}
              <div className="hidden md:block w-1/3 max-w-[220px] aspect-[3/4] rounded-2xl overflow-hidden shadow-md border border-border-glass transform hover:scale-[1.02] transition-all duration-500">
                <img
                  src={getProxyImageUrl(sliderAnimes[currentSlide]?.poster)}
                  alt={sliderAnimes[currentSlide]?.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Right/Left Side: Info & Actions */}
              <div className={`w-full md:w-2/3 flex flex-col justify-center space-y-4 ${isAr ? 'text-right pr-0 md:pr-8' : 'text-left pl-0 md:pl-8'}`}>
                <div className={`inline-flex items-center gap-2 self-start bg-gradient-to-r from-accent-primary to-accent-secondary text-white text-[10px] font-black px-3 py-1 rounded-full tracking-wider uppercase`}>
                  <span>🔥 {t('recentlyAddedHero')}</span>
                </div>

                <h2 className="text-2xl md:text-4xl font-black text-text-primary leading-tight line-clamp-1 drop-shadow-sm">
                  {sliderAnimes[currentSlide]?.title}
                </h2>

                {/* Metadata tags */}
                <div className="flex flex-wrap gap-2 text-[10px] font-bold text-text-muted">
                  <span className="bg-bg-primary border border-border-glass px-2.5 py-1 rounded-lg flex items-center gap-1 text-accent-primary font-black">
                    ⭐ {sliderAnimes[currentSlide]?.rating}
                  </span>
                  <span className="bg-bg-primary border border-border-glass px-2.5 py-1 rounded-lg">
                    📅 {sliderAnimes[currentSlide]?.year}
                  </span>
                  <span className="bg-bg-primary border border-border-glass px-2.5 py-1 rounded-lg text-accent-secondary">
                    {sliderAnimes[currentSlide]?.type === 'Movie' ? t('typeMovie') : t('typeAnime')}
                  </span>
                </div>

                <p className="text-text-muted text-xs md:text-sm leading-relaxed line-clamp-3 md:line-clamp-4 font-semibold max-w-xl">
                  {sliderAnimes[currentSlide]?.synopsis || t('noSynopsis')}
                </p>

                <div className="pt-2">
                  <a
                    href={getDetailsUrl(sliderAnimes[currentSlide] || {})}
                    className="inline-flex bg-gradient-to-r from-accent-primary to-accent-secondary hover:scale-105 text-white font-black text-xs md:text-sm px-8 py-3.5 rounded-xl shadow-lg shadow-accent-primary/20 transition-all duration-300 cursor-pointer"
                  >
                    {t('watchNow')}
                  </a>
                </div>
              </div>
            </div>

            {/* Indicators */}
            <div className={`absolute bottom-6 ${isAr ? 'left-6 md:left-12' : 'right-6 md:right-12'} flex gap-2 z-20`}>
              {sliderAnimes.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-accent-primary' : 'w-2 bg-bg-secondary border border-border-glass hover:bg-text-muted'}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="relative rounded-3xl overflow-hidden h-[340px] md:h-[480px] flex items-end shadow-md border border-border-glass bg-bg-secondary">
            <div className="absolute inset-0 bg-gradient-to-t from-bg-secondary via-bg-secondary/80 to-transparent" />
            <div className={`relative p-6 md:p-12 space-y-4 max-w-2xl ${isAr ? 'text-right' : 'text-left'} animate-pulse`}>
              <div className="inline-flex items-center gap-2 bg-accent-primary/10 text-accent-primary border border-accent-primary/20 text-xs font-black px-3 py-1 rounded-full uppercase">
                <span>🔥 {t('loadingBtn')}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-text-primary leading-tight drop-shadow-sm">
                {isAr ? 'مرحباً بك في عالم الأنمي والأفلام' : 'Welcome to the World of Anime & Movies'}
              </h2>
              <p className="text-text-muted text-xs md:text-sm leading-relaxed font-semibold">
                {isAr ? 'استمتع بمشاهدة أحدث حلقات الأنمي والأفلام المترجمة والمدبلجة بجودة عالية وبدون إعلانات.' : 'Enjoy watching the latest subbed and dubbed anime episodes and movies in high quality, ad-free.'}
              </p>
            </div>
          </div>
        )
      )}

      {/* Grid containing main content and sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT SECTION: Grids, and Main Anime Cards (col-span-9) */}
        <div className="lg:col-span-9 space-y-12">

          {/* 2. Interactive Header Bar & Tab selector */}
          <div className="glass-panel p-5 flex flex-col md:flex-row gap-5 items-center justify-between bg-bg-secondary">
            <div className="w-full md:w-1/2 relative">
              <input
                type="text"
                placeholder={t('searchPlaceholderMain')}
                value={searchQuery}
                onChange={handleSearchInputChange}
                className={`w-full bg-bg-primary border border-border-glass rounded-2xl px-5 py-3.5 ${isAr ? 'pr-12 pl-5 text-right' : 'pl-12 pr-5 text-left'} text-xs text-text-primary placeholder-text-muted focus:border-accent-primary focus:bg-bg-secondary focus:shadow-[0_0_20px_rgba(168,85,247,0.04)] focus:outline-none transition-all`}
              />
              <svg className={`w-4 h-4 text-text-muted absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 pointer-events-none`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); router.push('/'); }}
                  className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-[10px] font-black text-accent-primary hover:underline`}
                >
                  {t('cancel')}
                </button>
              )}
            </div>

            {/* Navigation Tab Selector */}
            {!searchQuery && !watchlistMode && !activeGenre && (
              <div className="flex gap-1 bg-bg-primary p-1 rounded-2xl border border-border-glass w-full md:w-auto overflow-x-auto">
                <button
                  onClick={() => selectTab('latest')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 whitespace-nowrap ${activeTab === 'latest' ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/25' : 'text-text-muted hover:text-text-primary'}`}
                >
                  {t('latestEpisodes')}
                </button>
                <button
                  onClick={() => selectTab('trending')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 whitespace-nowrap ${activeTab === 'trending' ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/25' : 'text-text-muted hover:text-text-primary'}`}
                >
                  {t('mostWatched')}
                </button>
                <button
                  onClick={() => selectTab('top')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 whitespace-nowrap ${activeTab === 'top' ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/25' : 'text-text-muted hover:text-text-primary'}`}
                >
                  {t('topRated')}
                </button>
                <button
                  onClick={() => selectTab('movies')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 whitespace-nowrap ${activeTab === 'movies' ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/25' : 'text-text-muted hover:text-text-primary'}`}
                >
                  {t('moviesTab')}
                </button>
              </div>
            )}

            {activeGenre && (
              <div className={isAr ? 'text-right w-full md:w-auto' : 'text-left w-full md:w-auto'}>
                <span className="text-xs text-text-muted block mb-0.5">{t('genreFilterLabel')}</span>
                <span className="text-sm font-black bg-gradient-to-r from-accent-secondary to-accent-primary bg-clip-text text-transparent">
                  {translateGenre(activeGenre)}
                </span>
              </div>
            )}

            {watchlistMode && (
              <div className={isAr ? 'text-right w-full md:w-auto' : 'text-left w-full md:w-auto'}>
                <h2 className="text-lg font-black bg-gradient-to-r from-accent-hover to-accent-primary bg-clip-text text-transparent">
                  {t('watchlistTitle')}
                </h2>
              </div>
            )}
          </div>

          {/* Section Header with Total Count */}
          <div className={`flex items-center justify-between ${isAr ? 'border-r-4' : 'border-l-4'} border-accent-primary ${isAr ? 'pr-3 pl-3' : 'pl-3 pr-3'} mb-6 bg-bg-secondary p-3 rounded-xl border border-border-glass backdrop-blur-sm`}>
            <h3 className="text-xs md:text-sm font-black text-text-primary">
              {searchQuery 
                ? (activeGenre ? t('searchResultsGenreSection', { genre: translateGenre(activeGenre) }) : t('searchResultsSection')) 
                : watchlistMode 
                  ? t('watchlistSection') 
                  : activeGenre 
                    ? t('genreAnimesSection', { genre: translateGenre(activeGenre) }) 
                    : activeTab === 'latest' 
                      ? t('latestEpisodesSection') 
                      : activeTab === 'trending' 
                        ? t('trendingSection') 
                        : activeTab === 'top' 
                          ? t('topRatedSection') 
                          : t('moviesSection')}
            </h3>
            {totalCount > 0 && (
              <span className="text-[10px] md:text-xs font-bold text-text-muted bg-bg-primary border border-border-glass px-3.5 py-1 rounded-full shadow-sm">
                {t('totalCountLabel')} {totalCount}
              </span>
            )}
          </div>

          {/* 3. Anime Grid Cards List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 glass-panel">
              <div className="w-12 h-12 rounded-full border-4 border-t-accent-primary border-r-transparent border-b-accent-hover border-l-transparent animate-spin" />
              <p className="text-text-muted text-sm font-black">{t('loadingList')}</p>
            </div>
          ) : (
            (() => {
              const displayList = animes;
              if (displayList.length === 0) {
                return (
                  <div className="glass-panel p-16 text-center text-text-muted space-y-3">
                    <span className="text-4xl block">🔍</span>
                    <p className="text-base font-bold mb-1">{t('noResultsTitle')}</p>
                    <p className="text-xs text-text-muted">{t('noResultsDesc')}</p>
                  </div>
                );
              }

              return (
                <div className="space-y-10">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {displayList.map((anime, index) => (
                      <a
                        key={`${anime.id || anime.slug}-${index}`}
                        href={getDetailsUrl(anime)}
                        className={`group flex flex-col glass-card p-2 ${isAr ? 'text-right' : 'text-left'} relative overflow-hidden`}
                      >
                        {/* Card Image */}
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3">
                          <img
                            src={getProxyImageUrl(anime.poster)}
                            alt={anime.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/95 via-transparent to-transparent opacity-85 group-hover:opacity-75 transition-opacity" />

                          {/* Year / Rating Badges */}
                          <div className="absolute bottom-2 right-2 left-2 flex justify-between items-center text-[9px] font-black text-white">
                            <span className="bg-bg-primary/70 text-[#ffb612] backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 flex items-center gap-0.5">
                              ⭐ {anime.rating}
                            </span>
                            <span className="bg-bg-primary/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
                              {anime.year}
                            </span>
                          </div>
                        </div>

                        {/* Title & Seasons Count */}
                        <div className="px-1 pb-1.5 flex-grow flex flex-col justify-between">
                          <div>
                            <h3 className="text-xs font-bold text-text-primary group-hover:text-accent-primary line-clamp-2 transition-colors mb-1">
                              {anime.title}
                            </h3>
                            <span className="text-[9px] text-text-muted bg-bg-primary border border-border-glass font-bold px-2.5 py-0.5 rounded-full inline-block">
                              {getTypeName(anime.type, t)}
                            </span>
                          </div>

                          <div className="border-t border-border-glass pt-2 mt-2 flex justify-between items-center text-[9px] text-text-muted font-semibold">
                            <span>{t('statusLabel')}: {anime.status === 'مستمر' ? t('statusOngoing') : anime.status === 'منتهي' ? t('statusCompleted') : (anime.status || t('statusOngoing'))}</span>
                            <span className="text-text-muted font-extrabold">
                              {anime.duration ? anime.duration.replace('د', t('durationSuffix')).replace('m', t('durationSuffix')) : ('24' + t('durationSuffix'))}
                            </span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>

                  {/* Load More Button (Only if not in search or watchlist mode) */}
                  {!searchQuery && !watchlistMode && hasMore && (
                    <div className="flex justify-center pt-4">
                      <button
                        onClick={handleLoadMore}
                        disabled={loading}
                        className="glass-panel hover:bg-bg-primary hover:border-border-glass-hover px-8 py-3.5 rounded-2xl text-xs md:text-sm font-bold text-text-muted hover:text-text-primary transition-all flex items-center gap-2 cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-t-accent-primary border-border-glass rounded-full animate-spin" />
                            <span>{t('loadingBtn')}</span>
                          </>
                        ) : (
                          <span>{t('loadMoreBtn')}</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>

        {/* RIGHT SIDEBAR: Categories (col-span-3) */}
        <div className="lg:col-span-3 space-y-6">

          {/* 1. Genres/Categories List */}
          <div className="glass-panel p-5 space-y-4">
            <h4 className={`font-black text-base ${isAr ? 'border-r-4' : 'border-l-4'} border-accent-primary ${isAr ? 'pr-2' : 'pl-2'} text-text-primary`}>
              {t('genresTitle')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {categories.map((genre) => (
                <button
                  key={genre}
                  onClick={() => selectGenre(genre)}
                  className={`w-full py-2.5 px-4 ${isAr ? 'text-right' : 'text-left'} text-xs rounded-xl border transition-all duration-300 cursor-pointer font-black flex items-center gap-2 ${activeGenre === genre ? 'bg-accent-primary border-accent-primary text-white shadow-lg shadow-accent-primary/25' : 'bg-bg-primary border-transparent text-text-muted hover:bg-bg-secondary hover:text-text-primary'}`}
                >
                  <span className="text-sm">{GENRE_EMOJIS[genre] || '🏷️'}</span>
                  <span>{translateGenre(genre)}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

export default function Home() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-40 gap-4 glass-panel">
        <div className="w-12 h-12 rounded-full border-4 border-t-accent-primary border-border-glass animate-spin" />
        <p className="text-text-muted text-sm font-black">{t('loadingPortal')}</p>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
