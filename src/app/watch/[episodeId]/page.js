'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import { useLanguage } from '../../../components/LanguageContext';

const getProxyImageUrl = (url) => {
  if (!url) return 'https://placehold.co//1a1a2e/ffffff?text=No+Image';
  if (url.startsWith('/')) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
};

export default function WatchPage() {
  const { episodeId } = useParams();
  const router = useRouter();
  const { t, translateGenre, lang } = useLanguage();
  const isAr = lang === 'ar';
  
  const [episode, setEpisode] = useState(null);
  const [activeServer, setActiveServer] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Download resolving state
  const [resolvingDownloadId, setResolvingDownloadId] = useState(null);

  const videoRef = useRef(null);
  const iframeRef = useRef(null);

  // Block popups from iframes via JS patching
  useEffect(() => {
    const origOpen = window.open;
    window.open = function(url, name, specs) {
      if (!url || url === '' || url === 'about:blank') {
        return origOpen.apply(this, arguments);
      }
      console.log('[AdBlock] Blocked popup:', url);
      return null;
    };
    return () => { window.open = origOpen; };
  }, []);

  useEffect(() => {
    if (!activeServer || !activeServer.directUrl) return;

    const video = videoRef.current;
    if (!video) return;

    const isM3U8 = activeServer.directUrl.includes('.m3u8');

    if (isM3U8) {
      if (typeof window !== 'undefined' && window.Hls) {
        if (window.hlsInstance) {
          window.hlsInstance.destroy();
        }
        const hls = new window.Hls();
        hls.loadSource(activeServer.directUrl);
        hls.attachMedia(video);
        window.hlsInstance = hls;
      } else {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = activeServer.directUrl;
        }
      }
    } else {
      video.src = activeServer.directUrl;
    }

    return () => {
      if (window.hlsInstance) {
        window.hlsInstance.destroy();
        window.hlsInstance = null;
      }
    };
  }, [activeServer]);

  useEffect(() => {
    if (episodeId) {
      fetchEpisodeDetails();
    }
  }, [episodeId]);

  const fetchEpisodeDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/episode?id=${episodeId}`);
      const data = await response.json();
      if (data.success && data.episode) {
        if (data.episode.servers && data.episode.servers.length > 0) {
          data.episode.servers = data.episode.servers.filter(srv => 
            !srv.name.toLowerCase().includes('megamax') && 
            !srv.name.toLowerCase().includes('yourupload')
          );

          const whitelist = ['ok', 'mp4upload', 'uqload', 'mega', 'sibnet'];
          const cleanServers = data.episode.servers.filter(srv => 
            whitelist.some(name => srv.name.toLowerCase().includes(name))
          );
          const otherServers = data.episode.servers.filter(srv => 
            !whitelist.some(name => srv.name.toLowerCase().includes(name))
          );
          data.episode.servers = [...cleanServers, ...otherServers];
          
          setActiveServer(cleanServers.length > 0 ? cleanServers[0] : data.episode.servers[0]);
        }
        setEpisode(data.episode);
      }
    } catch (error) {
      console.error('Failed fetching episode details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadClick = async (dlId, redirectUrl) => {
    if (redirectUrl.includes('uqload') && (redirectUrl.includes('.m3u8') || !redirectUrl.includes('/links/'))) {
      const confirmOpen = window.confirm(
        isAr 
          ? "رابط Uqload المباشر عبارة عن بث شبكي (HLS .m3u8) ومحمي ضد التحميل المباشر التلقائي من المتصفح كملف واحد.\n\nهل تريد فتح صفحة مشغل Uqload الخارجية للتحميل باستخدام برنامج IDM أو إضافة HLS Downloader؟"
          : "The direct Uqload stream is an HLS web broadcast (.m3u8) and cannot be downloaded directly as a single file.\n\nDo you want to open the external Uqload page to download using IDM or HLS Downloader?"
      );
      if (confirmOpen) {
        const uqloadServer = episode.servers.find(s => s.name.toLowerCase().includes('uqload'));
        window.open(uqloadServer ? uqloadServer.embedUrl : redirectUrl, '_blank');
      }
      return;
    }

    if (redirectUrl.includes('.mp4') || redirectUrl.includes('.m3u8') || redirectUrl.includes('google') || !redirectUrl.includes('/links/')) {
      const a = document.createElement('a');
      a.href = redirectUrl;
      a.target = '_blank';
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    setResolvingDownloadId(dlId);
    try {
      const response = await fetch(`/api/episode?resolve_download=${encodeURIComponent(redirectUrl)}`);
      const data = await response.json();
      if (data.success && data.url) {
        const a = document.createElement('a');
        a.href = data.url;
        a.target = '_blank';
        a.rel = 'noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert(isAr ? 'فشل في تحضير رابط التحميل، يرجى فتح السيرفر مباشرة أو التحميل منه.' : 'Failed to prepare download link, please open the server directly or download from it.');
      }
    } catch (err) {
      console.error(err);
      alert(isAr ? 'حدث خطأ في الاتصال أثناء جلب الرابط.' : 'A connection error occurred while fetching the link.');
    } finally {
      setResolvingDownloadId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4 glass-panel">
        <div className="w-12 h-12 rounded-full border-4 border-t-accent-primary border-border-glass animate-spin" />
        <p className="text-text-muted text-sm font-black">{t('loadingWatch')}</p>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="glass-panel p-16 text-center text-text-muted space-y-4">
        <p className="text-lg font-bold">{t('notFoundEpisode')}</p>
        <button onClick={() => router.push('/')} className="btn-premium px-6 py-2.5 rounded-xl font-bold text-xs">
          {t('backToHome')}
        </button>
      </div>
    );
  }

  const anime = episode.season?.anime;
  const currentSeason = episode.season;
  const otherEpisodes = currentSeason?.episodes || [];
  
  const currentEpIndex = otherEpisodes.findIndex(ep => ep.id === episodeId);
  const prevEpisode = currentEpIndex > 0 ? otherEpisodes[currentEpIndex - 1] : null;
  const nextEpisode = currentEpIndex < otherEpisodes.length - 1 ? otherEpisodes[currentEpIndex + 1] : null;

  const officialDownloads = episode.downloads.filter(dl => !dl.quality.includes('مباشر'));
  const extractedDownloads = episode.downloads.filter(dl => dl.quality.includes('مباشر'));

  const isAkwam = episode.url && episode.url.includes('akwam');

  return (
    <div className={`space-y-8 ${isAr ? 'text-right' : 'text-left'}`}>
      
      {/* 1. Breadcrumbs */}
      <div className={`text-xs text-text-muted flex items-center gap-2 justify-start font-bold bg-bg-primary border border-border-glass px-4 py-2.5 rounded-xl w-fit`}>
        <a href="/" className="hover:text-accent-primary transition-colors">{t('watchHomeLink')}</a>
        <span>/</span>
        {anime && <a href={`/anime/${anime.slug}`} className="hover:text-accent-primary transition-colors">{isAr ? (anime.arabicTitle || anime.title) : anime.title}</a>}
        <span>/</span>
        <span className="text-text-primary font-extrabold">{isAr ? episode.title : episode.title.replace('الحلقة', 'Episode')}</span>
      </div>

      {/* 2. Main watch layout: 12-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT SECTION: Player, Controls, Downloads, Similar Anime, Comments (col-span-9) */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* Ad-Free Video Player Theater */}
          <div className="glass-panel p-2.5 relative">
            <div className="video-container bg-black rounded-2xl overflow-hidden relative aspect-video flex items-center justify-center">
              {activeServer ? (
                (isAkwam && activeServer.directUrl) ? (
                  <>
                    <video 
                      ref={videoRef}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                      poster={getProxyImageUrl(anime?.poster)}
                    />
                    <Script 
                      src="https://cdn.jsdelivr.net/npm/hls.js@latest" 
                      strategy="lazyOnload"
                      onLoad={() => {
                        setActiveServer(prev => ({ ...prev }));
                      }}
                    />
                  </>
                ) : (
                  <iframe 
                    ref={iframeRef}
                    src={isAkwam 
                      ? `/api/proxy-embed?url=${encodeURIComponent(activeServer.embedUrl.replace('mega.nz/file/', 'mega.nz/embed/'))}` 
                      : activeServer.embedUrl.replace('mega.nz/file/', 'mega.nz/embed/')}
                    title="Watch Player" 
                    allowFullScreen
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                )
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 gap-3 rounded-2xl">
                  <span className="text-4xl">📴</span>
                  <p className="text-text-muted text-sm font-bold">{t('watchServerPlaceholder')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Watch Servers tabs */}
          {episode.servers && episode.servers.length > 0 && (
            <div className="glass-panel p-5 space-y-3">
              <span className="text-xs font-black text-text-muted block mb-2">{t('watchServers')}</span>
              <div className="flex flex-wrap gap-2">
                {episode.servers.map((srv) => (
                    <button 
                      key={srv.id}
                      onClick={() => setActiveServer(srv)}
                      className={`px-4.5 py-2.5 rounded-xl text-xs font-black border transition-all duration-300 flex items-center gap-2 cursor-pointer ${activeServer?.id === srv.id ? 'bg-accent-primary text-white border-transparent shadow-lg shadow-accent-primary/25' : 'bg-bg-primary text-text-muted border-border-glass hover:bg-bg-secondary hover:text-text-primary'}`}
                    >
                      <span>📺</span>
                      <span>{srv.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Episode Navigation Buttons */}
          <div className="flex items-center justify-between gap-4">
            
            {/* Previous Episode */}
            {prevEpisode ? (
              <button 
                onClick={() => router.push(`/watch/${prevEpisode.id}`)}
                className="flex-1 bg-bg-primary border border-border-glass hover:border-accent-primary/40 hover:bg-accent-primary/5 py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer font-bold text-xs md:text-sm text-text-muted hover:text-accent-primary"
              >
                <span>{t('prevBtn')}</span>
                <span className="text-[10px] text-text-muted font-semibold">({t('episodeLabel')} {prevEpisode.number})</span>
              </button>
            ) : (
              <div className="flex-1 opacity-50 bg-bg-primary/50 border border-border-glass py-3.5 rounded-2xl flex items-center justify-center text-xs font-bold text-text-muted">
                {t('noPrevEp')}
              </div>
            )}

            {/* Next Episode */}
            {nextEpisode ? (
              <button 
                onClick={() => router.push(`/watch/${nextEpisode.id}`)}
                className="flex-1 bg-gradient-to-r from-accent-primary to-accent-secondary py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.01] shadow-lg shadow-accent-primary/20 cursor-pointer font-black text-xs md:text-sm text-white"
              >
                <span>{t('nextBtn')}</span>
                <span className="text-[10px] font-black text-white/80">({t('episodeLabel')} {nextEpisode.number})</span>
              </button>
            ) : (
              <div className="flex-1 opacity-50 bg-bg-primary/50 border border-border-glass py-3.5 rounded-2xl flex items-center justify-center text-xs font-bold text-text-muted">
                {t('lastEpSeason')}
              </div>
            )}
            
          </div>

          {/* Unique, Descriptive Title for SEO Optimization */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl md:text-2xl font-black text-text-primary">
                {isAr ? `${anime?.arabicTitle || anime?.title} - ${episode.title}` : `${anime?.title} - ${episode.title.replace('الحلقة', 'Episode')}`}
              </h1>
              <span className="bg-accent-primary/10 text-accent-primary text-[10px] font-black px-2.5 py-0.5 rounded-lg border border-accent-primary/20">
                ⭐ {anime?.rating ? parseFloat(anime.rating).toFixed(1) : '9.1'}
              </span>
              <span className="bg-bg-primary border border-border-glass text-text-muted text-[10px] font-bold px-2 py-0.5 rounded-lg">
                {anime?.year || '2024'}
              </span>
            </div>
            <p className="text-accent-primary font-black text-xs">
              {isAr ? episode.title : episode.title.replace('الحلقة', 'Episode')}
            </p>
            <p className="text-text-muted text-xs md:text-sm leading-relaxed font-semibold">
              {anime?.synopsis || t('noSynopsisEp')}
            </p>
          </div>

          {/* Direct Downloads extracted from servers */}
          {extractedDownloads.length > 0 && (
            <div className="glass-panel p-6 space-y-4 border-accent-primary/15 bg-gradient-to-br from-bg-secondary to-accent-primary/5">
              <div className={`flex items-center gap-2 ${isAr ? 'border-r-4 pr-2' : 'border-l-4 pl-2'} border-accent-primary`}>
                <span className="text-lg">📥</span>
                <h3 className="text-base md:text-lg font-black text-text-primary">{t('directDownloadsTitle')}</h3>
              </div>
              <p className="text-[10px] text-text-muted font-semibold leading-relaxed">
                {t('directDownloadsDesc')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {extractedDownloads.map((dl) => (
                  <div key={dl.id} className="glass-card p-4 flex items-center justify-between border border-accent-primary/10 bg-bg-secondary/80">
                    <div>
                      <span className="block font-black text-xs text-text-primary">
                        {t('directDlQuality', { quality: dl.quality.replace(' (مباشر)', '') })}
                      </span>
                      <span className="block text-[9px] text-accent-primary font-bold mt-0.5">{t('directDlLabel')}</span>
                    </div>
                    <button 
                      onClick={() => handleDownloadClick(dl.id, dl.url)}
                      className="btn-premium px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📥</span>
                      <span>{t('directDlBtn')}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Official download Links */}
          {officialDownloads.length > 0 && (
            <div className="glass-panel p-6 space-y-4">
              <h3 className={`text-base md:text-lg font-black ${isAr ? 'border-r-4 pr-2' : 'border-l-4 pl-2'} border-accent-primary text-text-primary`}>
                {t('officialDownloadsTitle')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {officialDownloads.map((dl) => (
                  <div key={dl.id} className="glass-card p-4 flex items-center justify-between border border-border-glass">
                    <div>
                      <span className="block font-black text-xs text-text-primary">{t('officialDlQuality', { quality: dl.quality })}</span>
                      <span className="block text-[9px] text-text-muted font-semibold">{t('officialDlLabel')}</span>
                    </div>
                    <button 
                      onClick={() => handleDownloadClick(dl.id, dl.url)}
                      disabled={resolvingDownloadId === dl.id}
                      className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer ${resolvingDownloadId === dl.id ? 'bg-bg-primary text-text-muted cursor-wait' : 'bg-gradient-to-l from-accent-primary to-accent-secondary text-white hover:scale-105 transition-all'}`}
                    >
                      {resolvingDownloadId === dl.id ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-t-white border-white/25 animate-spin" />
                          <span>{t('preparingDl')}</span>
                        </>
                      ) : (
                        <>
                          <span>📥</span>
                          <span>{t('officialDlBtn')}</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similar Animes Box */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className={`text-base md:text-lg font-black ${isAr ? 'border-r-4 pr-2' : 'border-l-4 pl-2'} border-accent-primary text-text-primary`}>
              {t('similarAnimes')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-card p-2 text-center group cursor-pointer" onClick={() => router.push('/')}>
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2">
                  <img src={getProxyImageUrl("https://eta.animerco.org/wp-content/uploads/2026/07/7Hr1zgpzUWdQ6EtE9sDrx7IRk7Y.jpg")} referrerPolicy="no-referrer" className="object-cover w-full h-full group-hover:scale-105 transition-all" alt="Similar Anime 1" />
                </div>
                <span className="block font-bold text-xs text-text-primary line-clamp-1 group-hover:text-accent-primary">Let's Go Kaiki-gumi</span>
              </div>
              <div className="glass-card p-2 text-center group cursor-pointer" onClick={() => router.push('/')}>
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2">
                  <img src={getProxyImageUrl("https://eta.animerco.org/wp-content/uploads/2026/07/xDW6cor12UD0b2IqboQWnrIn0UO.jpg")} referrerPolicy="no-referrer" className="object-cover w-full h-full group-hover:scale-105 transition-all" alt="Similar Anime 2" />
                </div>
                <span className="block font-bold text-xs text-text-primary line-clamp-1 group-hover:text-accent-primary">Tomb Raider King</span>
              </div>
              <div className="glass-card p-2 text-center group cursor-pointer" onClick={() => router.push('/')}>
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2">
                  <img src={getProxyImageUrl("https://eta.animerco.org/wp-content/uploads/2026/07/s0IKZTAn9sbGToaim12YEOTyWde.jpg")} referrerPolicy="no-referrer" className="object-cover w-full h-full group-hover:scale-105 transition-all" alt="Similar Anime 3" />
                </div>
                <span className="block font-bold text-xs text-text-primary line-clamp-1 group-hover:text-accent-primary">Mebius Dust</span>
              </div>
              <div className="glass-card p-2 text-center group cursor-pointer" onClick={() => router.push('/')}>
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2">
                  <img src={getProxyImageUrl("https://eta.animerco.org/wp-content/uploads/2026/07/evNjloRQilbYco1HIP1c6IpZH4c.jpg")} referrerPolicy="no-referrer" className="object-cover w-full h-full group-hover:scale-105 transition-all" alt="Similar Anime 4" />
                </div>
                <span className="block font-bold text-xs text-text-primary line-clamp-1 group-hover:text-accent-primary">Azur Lane</span>
              </div>
            </div>
          </div>

          {/* Premium Comments Section */}
          <div className="glass-panel p-6 space-y-6">
            <h3 className={`text-base md:text-lg font-black ${isAr ? 'border-r-4 pr-2' : 'border-l-4 pl-2'} border-accent-primary text-text-primary`}>
              {t('commentsTitle', { count: 1 })}
            </h3>
            
            {/* Input area */}
            <div className="space-y-3">
              <textarea 
                placeholder={t('commentPlaceholder')}
                className={`w-full bg-bg-primary border border-border-glass rounded-2xl p-4 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary focus:bg-bg-secondary ${isAr ? 'text-right' : 'text-left'} resize-none h-[100px]`}
              />
              <div className={`flex ${isAr ? 'justify-end' : 'justify-end'}`}>
                <button className="btn-premium px-6 py-2.5 rounded-xl text-xs font-black cursor-pointer">{t('commentBtn')}</button>
              </div>
            </div>

            {/* Comments list */}
            <div className="space-y-4 pt-4 border-t border-border-glass">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent-primary to-accent-secondary flex items-center justify-center font-bold text-white text-sm shadow">
                  U
                </div>
                <div className={`space-y-1.5 flex-1 ${isAr ? 'text-right' : 'text-left'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-text-primary">Shadow Slayer</span>
                    <span className="bg-accent-primary/10 text-accent-primary border border-accent-primary/20 px-2 py-0.5 rounded text-[8px] font-black">VIP</span>
                    <span className="text-[9px] text-text-muted">{isAr ? 'منذ ساعتين' : '2 hours ago'}</span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed font-semibold">
                    {isAr 
                      ? 'تحفة فنية! القصة والتحريك الأسطوري يجعله من أفضل أنميات هذا الموسم بدون منازع 🍿💥' 
                      : 'An absolute masterpiece! The story and animation are top-tier, making it the best anime of the season hands down 🍿💥'}
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT SECTION: Seasons/Episodes Sidebar & Anime details (col-span-3) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Episode Sidebar scrollbox */}
          <div className="glass-panel p-4 space-y-4">
            <div className="border-b border-border-glass pb-3">
              <h3 className="font-black text-text-primary text-sm md:text-base">{isAr ? 'حلقات الموسم' : 'Season Episodes'}</h3>
              <p className="text-[10px] text-text-muted font-extrabold mt-0.5">
                {isAr ? `إجمالي الحلقات المتوفرة: ${otherEpisodes.length}` : `Total episodes: ${otherEpisodes.length}`}
              </p>
            </div>
            
            {/* Season switcher (if multiple seasons are present) */}
            {anime?.seasons && anime.seasons.length > 1 && (
              <div className="bg-bg-primary p-1 rounded-xl border border-border-glass flex gap-1 mb-2">
                {anime.seasons.map(s => (
                  <button 
                    key={s.id} 
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black text-center transition-all ${s.id === currentSeason?.id ? 'bg-accent-primary text-white shadow-md shadow-accent-primary/20' : 'text-text-muted hover:text-text-primary'}`}
                    onClick={() => {
                      if (s.episodes && s.episodes.length > 0) {
                        router.push(`/watch/${s.episodes[0].id}`);
                      }
                    }}
                  >
                    {isAr ? s.name.replace('Season ', 'م').replace('الموسم ', 'م') : s.name.replace('الموسم', 'S').replace('موسم', 'S')}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {otherEpisodes.map((ep) => (
                <button 
                  key={ep.id}
                  onClick={() => router.push(`/watch/${ep.id}`)}
                  className={`w-full p-3 rounded-xl ${isAr ? 'text-right' : 'text-left'} text-xs font-bold border transition-all duration-200 block cursor-pointer ${ep.id === episodeId ? 'bg-accent-primary/15 text-accent-primary border-accent-primary/40 shadow-sm' : 'bg-transparent text-text-muted border-transparent hover:bg-bg-primary hover:text-text-primary'}`}
                >
                  <span className="block text-[9px] text-text-muted font-semibold mb-0.5">{t('episodeLabel')} {ep.number}</span>
                  <span className="block font-black line-clamp-1">{ep.title.replace(`${anime?.title || ''}`, '').trim() || `${t('episodeLabel')} ${ep.number}`}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Anime Meta Details sidebar */}
          <div className="glass-panel p-5 space-y-4">
            <h4 className={`font-black text-sm ${isAr ? 'border-r-4 pr-2' : 'border-l-4 pl-2'} border-accent-primary text-text-primary`}>
              {isAr ? 'معلومات الأنمي' : 'Anime Information'}
            </h4>
            <div className="space-y-3.5 text-xs font-bold text-text-muted divide-y divide-border-glass text-right">
              <div className={`pt-2 ${isAr ? 'text-right' : 'text-left'}`}>
                <span className="block text-[9px] text-text-muted font-black mb-0.5">{isAr ? 'الاسم بالعربي' : 'Arabic Name'}</span>
                <span className="text-text-primary text-xs">{anime?.arabicTitle || anime?.title || 'N/A'}</span>
              </div>
              <div className={`pt-2 ${isAr ? 'text-right' : 'text-left'}`}>
                <span className="block text-[9px] text-text-muted font-black mb-0.5">{isAr ? 'الاسم بالإنجليزي' : 'English Name'}</span>
                <span className="text-text-primary text-xs">{anime?.title || 'N/A'}</span>
              </div>
              <div className={`pt-2 ${isAr ? 'text-right' : 'text-left'}`}>
                <span className="block text-[9px] text-text-muted font-black mb-0.5">{isAr ? 'حالة العرض' : 'Status'}</span>
                <span className="text-emerald-500">
                  {anime?.status === 'مستمر' ? t('statusOngoing') : anime?.status === 'منتهي' ? t('statusCompleted') : anime?.status}
                </span>
              </div>
              <div className={`pt-2 ${isAr ? 'text-right' : 'text-left'}`}>
                <span className="block text-[9px] text-text-muted font-black mb-0.5">{isAr ? 'التصنيف' : 'Genre'}</span>
                <span className="text-text-primary text-xs font-black">
                  {anime?.genres ? anime.genres.split(',').map(g => translateGenre(g.trim())).join(', ') : 'Action, Fantasy'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
