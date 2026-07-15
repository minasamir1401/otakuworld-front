'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Dashboard state
  const [activeTab, setActiveTab] = useState('scrapers');
  const [stats, setStats] = useState({
    animeCount: 0,
    tvCount: 0,
    movieCount: 0,
    seasonsCount: 0,
    episodesCount: 0,
    serversCount: 0,
    downloadsCount: 0,
    totalVisits: 0,
    visits24h: 0,
    resolvedTopPages: []
  });

  // Scraper statuses & logs
  const [scrapers, setScrapers] = useState({
    animeScraper: { running: false },
    moviesScraper: { running: false },
    scheduleSync: { running: false }
  });
  const [selectedLogType, setSelectedLogType] = useState('sync');
  const [logContent, setLogContent] = useState('اختر سكربت لعرض السجلات الخاصة به...');
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  // CRUD states
  const [animes, setAnimes] = useState([]);
  const [totalAnimes, setTotalAnimes] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [animePage, setAnimePage] = useState(1);
  const [animeTotalPages, setAnimeTotalPages] = useState(1);
  const [isLoadingAnimes, setIsLoadingAnimes] = useState(false);

  // Modals / Editors
  const [isAnimeModalOpen, setIsAnimeModalOpen] = useState(false);
  const [editingAnime, setEditingAnime] = useState(null); // null means adding new
  const [animeForm, setAnimeForm] = useState({
    title: '',
    arabicTitle: '',
    slug: '',
    poster: '',
    rating: '9.0',
    type: 'TV',
    status: 'مستمر',
    year: '2026',
    duration: '24 د',
    genres: '',
    synopsis: '',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: ''
  });

  // Manage episodes panel state
  const [selectedAnimeForContent, setSelectedAnimeForContent] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('');

  // Content Creators Forms
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newEpisodeNumber, setNewEpisodeNumber] = useState('');
  const [newEpisodeTitle, setNewEpisodeTitle] = useState('');

  const [newServerName, setNewServerName] = useState('');
  const [newServerEmbedUrl, setNewServerEmbedUrl] = useState('');

  const [newDownloadQuality, setNewDownloadQuality] = useState('HD');
  const [newDownloadUrl, setNewDownloadUrl] = useState('');

  // Credentials settings
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // Cloudflare settings
  const [cfCookie, setCfCookie] = useState('');
  const [userAgent, setUserAgent] = useState('');
  const [cfMessage, setCfMessage] = useState('');
  const [cfError, setCfError] = useState('');
  const [isSavingCf, setIsSavingCf] = useState(false);

  // Check auth token on load
  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setToken(savedToken);
      fetchStats(savedToken);
    }
  }, []);

  // Fetch stats and scraper states
  const fetchStats = async (activeToken = token) => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setScrapers(data.scrapers);
      } else {
        // Token expired/invalid
        handleLogout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Poll scraper status periodically
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('admin_token', data.token);
        setToken(data.token);
        fetchStats(data.token);
      } else {
        setAuthError(data.error || 'اسم المستخدم أو كلمة المرور خاطئة');
      }
    } catch (err) {
      setAuthError('حدث خطأ بالاتصال بالسيرفر');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    router.push('/admin');
  };

  // Scrapers: Trigger a script
  const triggerScraper = async (type) => {
    try {
      const res = await fetch('/api/admin/scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchStats();
        // Automatically view logs for triggered scraper
        setSelectedLogType(type);
        fetchLogs(type);
      } else {
        alert(`خطأ: ${data.error}`);
      }
    } catch (err) {
      alert('فشل تشغيل السكربت');
    }
  };

  // Scrapers: Fetch log content
  const fetchLogs = async (type = selectedLogType) => {
    setIsRefreshingLogs(true);
    try {
      const res = await fetch(`/api/admin/scraper?type=${type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogContent(data.logs || 'لا توجد سجلات حالية.');
      }
    } catch (err) {
      setLogContent('فشل تحميل السجلات.');
    } finally {
      setIsRefreshingLogs(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchLogs(selectedLogType);
    }
  }, [selectedLogType, token]);

  // Anime management: Fetch lists
  const fetchAnimesList = async (page = animePage, q = searchQuery) => {
    setIsLoadingAnimes(true);
    try {
      const res = await fetch(`/api/admin/animes?page=${page}&q=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAnimes(data.animes);
        setTotalAnimes(data.totalCount);
        setAnimeTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAnimes(false);
    }
  };

  useEffect(() => {
    if (token && activeTab === 'animes') {
      fetchAnimesList(animePage, searchQuery);
    }
  }, [activeTab, animePage, searchQuery, token]);

  // Edit / Add Anime Submission
  const handleAnimeFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = '/api/admin/animes';
      const method = editingAnime ? 'PUT' : 'POST';
      const payload = editingAnime ? { id: editingAnime.id, ...animeForm } : animeForm;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setIsAnimeModalOpen(false);
        setEditingAnime(null);
        fetchAnimesList(animePage, searchQuery);
        fetchStats();
      } else {
        alert(`خطأ: ${data.error}`);
      }
    } catch (err) {
      alert('فشل حفظ تفاصيل الأنمي');
    }
  };

  // Delete Anime
  const deleteAnime = async (id) => {
    if (!confirm('هل أنت متأكد تماماً من حذف هذا الأنمي وكل المواسم والحلقات والروابط التابعة له نهائياً؟')) return;
    try {
      const res = await fetch(`/api/admin/animes?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchAnimesList(animePage, searchQuery);
        fetchStats();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('فشل حذف الأنمي');
    }
  };

  // Open Edit Modal
  const openEditAnime = (anime) => {
    setEditingAnime(anime);
    setAnimeForm({
      title: anime.title || '',
      arabicTitle: anime.arabicTitle || '',
      slug: anime.slug || '',
      poster: anime.poster || '',
      rating: anime.rating || '9.0',
      type: anime.type || 'TV',
      status: anime.status || 'مستمر',
      year: anime.year || '2026',
      duration: anime.duration || '24 د',
      genres: anime.genres || '',
      synopsis: anime.synopsis || '',
      seoTitle: anime.seoTitle || '',
      seoDescription: anime.seoDescription || '',
      seoKeywords: anime.seoKeywords || ''
    });
    setIsAnimeModalOpen(true);
  };

  // Open Add Modal
  const openAddAnime = () => {
    setEditingAnime(null);
    setAnimeForm({
      title: '',
      arabicTitle: '',
      slug: '',
      poster: '',
      rating: '9.0',
      type: 'TV',
      status: 'مستمر',
      year: '2026',
      duration: '24 د',
      genres: '',
      synopsis: '',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: ''
    });
    setIsAnimeModalOpen(true);
  };

  // Content management: Fetch Seasons for selected anime
  const loadSeasons = async (animeId) => {
    try {
      const res = await fetch(`/api/admin/content?resource=seasons&animeId=${animeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSeasons(data.seasons);
        if (data.seasons.length > 0) {
          setSelectedSeasonId(data.seasons[0].id);
          loadEpisodes(data.seasons[0].id);
        } else {
          setSeasons([]);
          setSelectedSeasonId('');
          setEpisodes([]);
          setSelectedEpisodeId('');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Episodes for selected season
  const loadEpisodes = async (seasonId) => {
    try {
      const res = await fetch(`/api/admin/content?resource=episodes&seasonId=${seasonId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEpisodes(data.episodes);
        if (data.episodes.length > 0) {
          setSelectedEpisodeId(data.episodes[0].id);
        } else {
          setSelectedEpisodeId('');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Season
  const handleAddSeason = async (e) => {
    e.preventDefault();
    if (!newSeasonName) return;
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contentType: 'season',
          animeId: selectedAnimeForContent.id,
          name: newSeasonName,
          slug: `${selectedAnimeForContent.slug}-season-${seasons.length + 1}`
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewSeasonName('');
        loadSeasons(selectedAnimeForContent.id);
        fetchStats();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('فشل إضافة الموسم');
    }
  };

  // Add Episode
  const handleAddEpisode = async (e) => {
    e.preventDefault();
    if (!newEpisodeNumber || !selectedSeasonId) return;
    try {
      const activeSeason = seasons.find(s => s.id === selectedSeasonId);
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contentType: 'episode',
          seasonId: selectedSeasonId,
          number: newEpisodeNumber,
          title: newEpisodeTitle || `الحلقة ${newEpisodeNumber}`,
          slug: `${activeSeason.slug}-episode-${newEpisodeNumber}`
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewEpisodeNumber('');
        setNewEpisodeTitle('');
        loadEpisodes(selectedSeasonId);
        fetchStats();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('فشل إضافة الحلقة');
    }
  };

  // Add Server embed
  const handleAddServer = async (e) => {
    e.preventDefault();
    if (!newServerName || !newServerEmbedUrl || !selectedEpisodeId) return;
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contentType: 'server',
          episodeId: selectedEpisodeId,
          name: newServerName,
          embedUrl: newServerEmbedUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewServerName('');
        setNewServerEmbedUrl('');
        loadEpisodes(selectedSeasonId);
        fetchStats();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('فشل إضافة السيرفر');
    }
  };

  // Add Download redirect link
  const handleAddDownload = async (e) => {
    e.preventDefault();
    if (!newDownloadQuality || !newDownloadUrl || !selectedEpisodeId) return;
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contentType: 'download',
          episodeId: selectedEpisodeId,
          quality: newDownloadQuality,
          url: newDownloadUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewDownloadQuality('HD');
        setNewDownloadUrl('');
        loadEpisodes(selectedSeasonId);
        fetchStats();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('فشل إضافة رابط التحميل');
    }
  };

  // Delete Subresource (Season, Episode, Server, Download)
  const handleDeleteSubresource = async (type, id) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      const res = await fetch(`/api/admin/content?contentType=${type}&id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        if (type === 'season') {
          loadSeasons(selectedAnimeForContent.id);
        } else {
          loadEpisodes(selectedSeasonId);
        }
        fetchStats();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('فشل عملية الحذف');
    }
  };

  // Update Credentials
  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    setSettingsMessage('');
    setSettingsError('');
    if (!newUsername || !newPassword) {
      setSettingsError('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newUsername, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('admin_token', data.token);
        setToken(data.token);
        setNewUsername('');
        setNewPassword('');
        setSettingsMessage('تم تحديث بيانات الدخول بنجاح! سيتم الحفاظ على جلستك.');
      } else {
        setSettingsError(data.error || 'فشلت العملية');
      }
    } catch (err) {
      setSettingsError('خطأ أثناء إرسال البيانات');
    }
  };

  // Fetch Cloudflare config
  const fetchCfConfig = async (activeToken = token) => {
    try {
      const res = await fetch('/api/admin/config', {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setCfCookie(data.cfCookie || '');
        setUserAgent(data.userAgent || '');
      }
    } catch (err) {
      console.error('Failed fetching Cloudflare config:', err);
    }
  };

  // Update Cloudflare bypass settings
  const handleUpdateCfConfig = async (e) => {
    e.preventDefault();
    setCfMessage('');
    setCfError('');
    setIsSavingCf(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cfCookie, userAgent })
      });
      const data = await res.json();
      if (data.success) {
        setCfMessage(data.message);
      } else {
        setCfError(data.error || 'فشلت العملية');
      }
    } catch (err) {
      setCfError('خطأ في الاتصال بالخادم');
    } finally {
      setIsSavingCf(false);
    }
  };

  useEffect(() => {
    if (token && activeTab === 'settings') {
      fetchCfConfig();
    }
  }, [activeTab, token]);

  // Render Login Panel
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-right">
        <div className="absolute inset-0 overflow-hidden -z-10">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-[var(--accent-purple)]/5 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[var(--accent-cyan)]/5 blur-[120px]" />
        </div>

        <div className="glass-panel max-w-md w-full p-8 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-4xl">🔐</span>
            <h1 className="text-xl font-black text-text-primary">تسجيل دخول الإدارة</h1>
            <p className="text-text-muted text-xs font-semibold">لوحة التحكم السرية لبوابة عالم الأوتاكو</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-black text-text-muted">اسم المستخدم</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
                className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-3 text-xs text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] focus:bg-bg-secondary transition-all text-right"
                placeholder="أدخل اسم المستخدم"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-black text-text-muted">كلمة المرور</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-3 text-xs text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] focus:bg-bg-secondary transition-all text-right"
                placeholder="أدخل كلمة المرور"
              />
            </div>

            {authError && (
              <p className="text-red-500 text-[10px] font-bold text-center">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[var(--accent-purple)] hover:bg-[var(--accent-cyan)] text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-[var(--accent-purple)]/25 cursor-pointer"
            >
              تسجيل الدخول للوحة التحكم
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render Dashboard
  return (
    <div className="space-y-8 text-right pb-10">

      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-bg-secondary border border-border-glass p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-cyan)] animate-ping" />
            <h1 className="text-lg md:text-xl font-black text-text-primary">لوحة التحكم الإدارية</h1>
          </div>
          <p className="text-text-muted text-xs font-semibold">مرحباً بك مجدداً، تحكم في المسلسلات والأفلام وسيرفرات الاستخراج مباشرة.</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer"
        >
          تسجيل الخروج
        </button>
      </div>

      {/* 2. Stats Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 space-y-1">
          <span className="text-xs text-text-muted font-bold block">إجمالي المواد</span>
          <span className="text-2xl font-black text-text-primary block">{stats.animeCount}</span>
          <span className="text-[10px] text-text-muted font-extrabold block">أنميات وأفلام مسجلة</span>
        </div>
        <div className="glass-panel p-5 space-y-1">
          <span className="text-xs text-text-muted font-bold block">مسلسلات الأنمي</span>
          <span className="text-2xl font-black text-[var(--accent-purple)] block">{stats.tvCount}</span>
          <span className="text-[10px] text-text-muted font-extrabold block">مقسمة إلى {stats.seasonsCount} موسم</span>
        </div>
        <div className="glass-panel p-5 space-y-1">
          <span className="text-xs text-text-muted font-bold block">الأفلام الفردية</span>
          <span className="text-2xl font-black text-[var(--accent-cyan)] block">{stats.movieCount}</span>
          <span className="text-[10px] text-text-muted font-extrabold block">مجهزة للتشغيل الفوري</span>
        </div>
        <div className="glass-panel p-5 space-y-1">
          <span className="text-xs text-text-muted font-bold block">إجمالي الحلقات</span>
          <span className="text-2xl font-black text-emerald-600 block">{stats.episodesCount}</span>
          <span className="text-[10px] text-text-muted font-extrabold block">بإجمالي {stats.serversCount} مشغل فيديو</span>
        </div>
      </div>

      {/* 3. Main Dashboard Layout (Sidebar + Tab Content) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Sidebar Nav */}
        <div className="lg:col-span-1 space-y-3">
          <button
            onClick={() => setActiveTab('scrapers')}
            className={`w-full p-4 rounded-2xl text-right text-xs font-black border transition-all flex items-center justify-between cursor-pointer ${activeTab === 'scrapers' ? 'bg-[var(--accent-purple)]/10 border-[var(--accent-purple)] text-[var(--accent-purple)] shadow-sm' : 'bg-bg-primary border-transparent text-text-muted hover:bg-bg-primary hover:text-text-primary'}`}
          >
            <span>⚙️ سيرفرات الاستخراج (Scrapers)</span>
            {(scrapers.animeScraper.running || scrapers.moviesScraper.running || scrapers.scheduleSync.running) && (
              <span className="w-2 h-2 rounded-full bg-green-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('animes')}
            className={`w-full p-4 rounded-2xl text-right text-xs font-black border transition-all flex items-center justify-between cursor-pointer ${activeTab === 'animes' ? 'bg-[var(--accent-purple)]/10 border-[var(--accent-purple)] text-[var(--accent-purple)] shadow-sm' : 'bg-bg-primary border-transparent text-text-muted hover:bg-bg-primary hover:text-text-primary'}`}
          >
            <span>📺 إدارة الأنميات والأفلام</span>
          </button>

          <button
            onClick={() => setActiveTab('content')}
            className={`w-full p-4 rounded-2xl text-right text-xs font-black border transition-all flex items-center justify-between cursor-pointer ${activeTab === 'content' ? 'bg-[var(--accent-purple)]/10 border-[var(--accent-purple)] text-[var(--accent-purple)] shadow-sm' : 'bg-bg-primary border-transparent text-text-muted hover:bg-bg-primary hover:text-text-primary'}`}
          >
            <span>➕ إضافة وتعديل الحلقات</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full p-4 rounded-2xl text-right text-xs font-black border transition-all flex items-center justify-between cursor-pointer ${activeTab === 'settings' ? 'bg-[var(--accent-purple)]/10 border-[var(--accent-purple)] text-[var(--accent-purple)] shadow-sm' : 'bg-bg-primary border-transparent text-text-muted hover:bg-bg-primary hover:text-text-primary'}`}
          >
            <span>🔒 إعدادات الحماية والدخول</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full p-4 rounded-2xl text-right text-xs font-black border transition-all flex items-center justify-between cursor-pointer ${activeTab === 'analytics' ? 'bg-[var(--accent-purple)]/10 border-[var(--accent-purple)] text-[var(--accent-purple)] shadow-sm' : 'bg-bg-primary border-transparent text-text-muted hover:bg-bg-primary hover:text-text-primary'}`}
          >
            <span>📊 إحصائيات الزوار والمشاهدات</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`w-full p-4 rounded-2xl text-right text-xs font-black border transition-all flex items-center justify-between cursor-pointer ${activeTab === 'backup' ? 'bg-[var(--accent-purple)]/10 border-[var(--accent-purple)] text-[var(--accent-purple)] shadow-sm' : 'bg-bg-primary border-transparent text-text-muted hover:bg-bg-primary hover:text-text-primary'}`}
          >
            <span>💾 النسخ الاحتياطي والاستعادة</span>
          </button>
        </div>

        {/* Tab Content Panel */}
        <div className="lg:col-span-3">

          {/* TAB 1: Scrapers */}
          {activeTab === 'scrapers' && (
            <div className="space-y-6">

              {/* Scrapers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* TV Scraper */}
                <div className="glass-panel p-5 flex flex-col justify-between h-48">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${scrapers.animeScraper.running ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-slate-200 text-text-muted border border-slate-300'}`}>
                        {scrapers.animeScraper.running ? 'نشط' : 'متوقف'}
                      </span>
                      <h4 className="text-xs font-black text-text-primary">سحب المسلسلات (كامل)</h4>
                    </div>
                    <p className="text-[10px] text-text-muted font-semibold leading-relaxed">
                      يسحب المسلسلات والأوفا ويقوم بعملية التحديث التراكمي.
                    </p>
                  </div>
                  <button
                    onClick={() => triggerScraper('anime')}
                    disabled={scrapers.animeScraper.running}
                    className="w-full py-2 bg-[var(--accent-purple)] disabled:bg-[var(--accent-purple)]/30 hover:bg-[var(--accent-cyan)] text-[10px] font-black rounded-lg text-white transition-all cursor-pointer"
                  >
                    {scrapers.animeScraper.running ? 'قيد الاستخراج...' : 'تشغيل السكربت'}
                  </button>
                </div>

                {/* Movies Scraper */}
                <div className="glass-panel p-5 flex flex-col justify-between h-48">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${scrapers.moviesScraper.running ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-slate-200 text-text-muted border border-slate-300'}`}>
                        {scrapers.moviesScraper.running ? 'نشط' : 'متوقف'}
                      </span>
                      <h4 className="text-xs font-black text-text-primary">سحب الأفلام (كامل)</h4>
                    </div>
                    <p className="text-[10px] text-text-muted font-semibold leading-relaxed">
                      يسحب مكتبة الأفلام والأنميات الفردية كاملة.
                    </p>
                  </div>
                  <button
                    onClick={() => triggerScraper('movies')}
                    disabled={scrapers.moviesScraper.running}
                    className="w-full py-2 bg-[var(--accent-purple)] disabled:bg-[var(--accent-purple)]/30 hover:bg-[var(--accent-cyan)] text-[10px] font-black rounded-lg text-white transition-all cursor-pointer"
                  >
                    {scrapers.moviesScraper.running ? 'قيد الاستخراج...' : 'تشغيل السكربت'}
                  </button>
                </div>

                {/* Schedule Sync */}
                <div className="glass-panel p-5 flex flex-col justify-between h-48">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${scrapers.scheduleSync.running ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-slate-200 text-text-muted border border-slate-300'}`}>
                        {scrapers.scheduleSync.running ? 'نشط' : 'متوقف'}
                      </span>
                      <h4 className="text-xs font-black text-text-primary">مزامنة جدول المواعيد</h4>
                    </div>
                    <p className="text-[10px] text-text-muted font-semibold leading-relaxed">
                      يفحص المواعيد المعروضة للأسبوع لجلب الحلقات الجديدة في دقيقة واحدة.
                    </p>
                  </div>
                  <button
                    onClick={() => triggerScraper('sync')}
                    disabled={scrapers.scheduleSync.running}
                    className="w-full py-2 bg-green-600 disabled:bg-green-600/30 hover:bg-green-700 text-[10px] font-black rounded-lg text-white transition-all cursor-pointer"
                  >
                    {scrapers.scheduleSync.running ? 'قيد المزامنة...' : 'تشغيل المزامنة'}
                  </button>
                </div>

              </div>

              {/* Console log display */}
              <div className="glass-panel p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-border-glass pb-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchLogs(selectedLogType)}
                      disabled={isRefreshingLogs}
                      className="bg-bg-primary hover:bg-bg-primary text-text-primary px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-border-glass cursor-pointer"
                    >
                      {isRefreshingLogs ? 'جاري التحديث...' : '🔄 تحديث السجل'}
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <h4 className="text-xs font-black text-text-primary">شاشة عرض السجلات الحية</h4>
                    <select
                      value={selectedLogType}
                      onChange={(e) => setSelectedLogType(e.target.value)}
                      className="bg-bg-primary border border-border-glass text-xs font-bold text-text-primary px-3 py-1.5 rounded-lg focus:outline-none"
                    >
                      <option className="bg-bg-secondary text-text-primary" value="sync">سجل المزامنة المجدولة</option>
                      <option className="bg-bg-secondary text-text-primary" value="anime">سجل المسلسلات</option>
                      <option className="bg-bg-secondary text-text-primary" value="movies">سجل الأفلام</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-900 border border-border-glass rounded-xl p-4 h-[300px] overflow-y-auto font-mono text-[10px] text-slate-100 leading-relaxed text-right dir-ltr select-text whitespace-pre-wrap">
                  {logContent}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Anime Management */}
          {activeTab === 'animes' && (
            <div className="glass-panel p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                <button
                  onClick={openAddAnime}
                  className="bg-[var(--accent-purple)] hover:bg-[var(--accent-cyan)] text-white text-xs font-black px-6 py-3 rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  ➕ إضافة أنمي/فيلم جديد
                </button>
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="text"
                    placeholder="ابحث بالاسم لتعديل البيانات..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setAnimePage(1);
                    }}
                    className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-2.5 text-xs text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                  />
                </div>
              </div>

              {/* Anime List Grid */}
              {isLoadingAnimes ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-t-[var(--accent-purple)] border-border-glass animate-spin" />
                  <p className="text-text-muted text-xs font-black">جاري تحميل القائمة...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {animes.length === 0 ? (
                    <p className="text-center text-text-muted py-10 text-xs font-bold">لا توجد نتائج بحث مطابقة.</p>
                  ) : (
                    <div className="border border-border-glass rounded-xl overflow-hidden">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-bg-primary border-b border-border-glass text-text-primary font-black">
                          <tr>
                            <th className="p-4">البوستر</th>
                            <th className="p-4">العنوان</th>
                            <th className="p-4">النوع</th>
                            <th className="p-4">السنة</th>
                            <th className="p-4 text-center">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-text-muted font-bold">
                          {animes.map((anime) => (
                            <tr key={anime.id} className="hover:bg-bg-primary/50 transition-all">
                              <td className="p-4">
                                <img src={anime.poster || 'https://placehold.co/150x150/1a1a2e/ffffff?text=No+Image'} alt="" className="w-8 aspect-[3/4] object-cover rounded-md border border-border-glass" />
                              </td>
                              <td className="p-4 text-text-primary">
                                <span className="block font-black">{anime.title}</span>
                                {anime.arabicTitle && <span className="block text-[10px] text-text-muted font-semibold mt-0.5">{anime.arabicTitle}</span>}
                              </td>
                              <td className="p-4">{anime.type === 'Movie' ? 'فيلم' : 'مسلسل'}</td>
                              <td className="p-4">{anime.year || 'غير معروف'}</td>
                              <td className="p-4 flex items-center justify-center gap-2 mt-2">
                                <button
                                  onClick={() => {
                                    setSelectedAnimeForContent(anime);
                                    setActiveTab('content');
                                    loadSeasons(anime.id);
                                  }}
                                  className="bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-600 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                                >
                                  🎬 الحلقات
                                </button>
                                <button
                                  onClick={() => openEditAnime(anime)}
                                  className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                                >
                                  ✏️ تعديل
                                </button>
                                <button
                                  onClick={() => deleteAnime(anime.id)}
                                  className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                                >
                                  🗑️ حذف
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination control */}
                  {animeTotalPages > 1 && (
                    <div className="flex justify-center items-center gap-3 pt-4">
                      <button
                        disabled={animePage === 1}
                        onClick={() => setAnimePage(p => Math.max(1, p - 1))}
                        className="bg-bg-primary border border-border-glass disabled:opacity-40 hover:bg-bg-primary text-text-primary px-3 py-2 rounded-lg text-xs transition-all cursor-pointer"
                      >
                        السابق
                      </button>
                      <span className="text-text-muted text-xs font-bold">صفحة {animePage} من {animeTotalPages}</span>
                      <button
                        disabled={animePage === animeTotalPages}
                        onClick={() => setAnimePage(p => Math.min(animeTotalPages, p + 1))}
                        className="bg-bg-primary border border-border-glass disabled:opacity-40 hover:bg-bg-primary text-text-primary px-3 py-2 rounded-lg text-xs transition-all cursor-pointer"
                      >
                        التالي
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: Episode Content Manager */}
          {activeTab === 'content' && (
            <div className="glass-panel p-6 space-y-6">

              {!selectedAnimeForContent ? (
                <div className="text-center py-12 space-y-4">
                  <span className="text-4xl">🎬</span>
                  <p className="text-text-muted text-xs font-bold">يرجى اختيار الأنمي المطلوب من قائمة "إدارة الأنميات والأفلام" لإدارة حلقاته وسيرفراته.</p>
                  <button
                    onClick={() => setActiveTab('animes')}
                    className="bg-[var(--accent-purple)] hover:bg-[var(--accent-cyan)] text-white text-xs font-black px-6 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    اذهب لقائمة الأنميات
                  </button>
                </div>
              ) : (
                <div className="space-y-8">

                  {/* Selected anime header info */}
                  <div className="flex justify-between items-center border-b border-border-glass pb-4">
                    <button
                      onClick={() => {
                        setSelectedAnimeForContent(null);
                        setSeasons([]);
                        setEpisodes([]);
                        setSelectedSeasonId('');
                        setSelectedEpisodeId('');
                      }}
                      className="bg-bg-primary hover:bg-bg-primary border border-border-glass text-text-muted px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      🔙 عودة للمسلسلات
                    </button>
                    <div className="text-right space-y-1">
                      <h3 className="font-black text-text-primary text-base">{selectedAnimeForContent.title}</h3>
                      <span className="text-[10px] text-text-muted font-extrabold block">إدارة المواسم والحلقات والروابط</span>
                    </div>
                  </div>

                  {/* 1. SEASONS MANAGER */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black border-r-4 border-[var(--accent-cyan)] pr-2 text-text-primary">1. إدارة المواسم</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      {/* Create season form */}
                      <form onSubmit={handleAddSeason} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="مثال: الموسم 1، حلقات خاصة..."
                          value={newSeasonName}
                          onChange={(e) => setNewSeasonName(e.target.value)}
                          required
                          className="flex-1 bg-bg-primary border border-border-glass rounded-xl px-4 py-2.5 text-xs text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                        />
                        <button
                          type="submit"
                          className="bg-[var(--accent-purple)] hover:bg-[var(--accent-cyan)] text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                        >
                          إضافة موسم
                        </button>
                      </form>

                      {/* Seasons selector */}
                      <div className="space-y-2">
                        <label className="block text-[10px] text-text-muted font-black">المواسم المتوفرة حالياً:</label>
                        <div className="flex flex-wrap gap-2">
                          {seasons.map((s) => (
                            <div key={s.id} className="flex items-center gap-1.5 bg-bg-primary border border-border-glass px-3 py-1.5 rounded-xl">
                              <button
                                onClick={() => handleDeleteSubresource('season', s.id)}
                                className="text-red-500 hover:text-red-700 text-[10px] font-bold pl-1 border-l border-border-glass cursor-pointer"
                              >
                                ✕
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedSeasonId(s.id);
                                  loadEpisodes(s.id);
                                }}
                                className={`text-xs font-black ${selectedSeasonId === s.id ? 'text-[var(--accent-purple)]' : 'text-text-muted hover:text-text-primary'}`}
                              >
                                {s.name}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. EPISODES MANAGER */}
                  {selectedSeasonId && (
                    <div className="space-y-4 border-t border-border-glass pt-6">
                      <h4 className="text-xs font-black border-r-4 border-[var(--accent-cyan)] pr-2 text-text-primary">2. إدارة الحلقات</h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        {/* Add Episode Form */}
                        <form onSubmit={handleAddEpisode} className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="block text-[10px] text-text-muted font-black">رقم الحلقة</label>
                            <input
                              type="text"
                              placeholder="مثال: 1"
                              value={newEpisodeNumber}
                              onChange={(e) => setNewEpisodeNumber(e.target.value)}
                              required
                              className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-2 text-xs text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] text-text-muted font-black">عنوان الحلقة (اختياري)</label>
                            <input
                              type="text"
                              placeholder="مثال: الحلقة 1"
                              value={newEpisodeTitle}
                              onChange={(e) => setNewEpisodeTitle(e.target.value)}
                              className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-2 text-xs text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                            />
                          </div>
                          <button
                            type="submit"
                            className="bg-[var(--accent-purple)] hover:bg-[var(--accent-cyan)] text-white text-xs font-black h-10 rounded-xl transition-all cursor-pointer mt-4 sm:mt-0"
                          >
                            إضافة حلقة
                          </button>
                        </form>

                        {/* Episode selector */}
                        <div className="space-y-1 w-full">
                          <label className="block text-[10px] text-text-muted font-black">اختر حلقة لإضافة المشغلات لها:</label>
                          <select
                            value={selectedEpisodeId}
                            onChange={(e) => setSelectedEpisodeId(e.target.value)}
                            className="w-full bg-bg-primary border border-border-glass text-xs font-bold text-text-primary px-3 py-2.5 rounded-xl focus:outline-none"
                          >
                            <option value="" className="bg-bg-secondary text-text-primary">-- اختر الحلقة --</option>
                            {episodes.map((ep) => (
                              <option key={ep.id} value={ep.id} className="bg-bg-secondary text-text-primary">
                                الحلقة {ep.number} ({ep.title})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Display episodes as badges */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {episodes.map((ep) => (
                          <div key={ep.id} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${selectedEpisodeId === ep.id ? 'bg-[var(--accent-purple)]/10 border-[var(--accent-purple)] text-[var(--accent-purple)]' : 'bg-bg-primary border-border-glass text-text-muted hover:text-text-primary'}`}>
                            <button
                              onClick={() => handleDeleteSubresource('episode', ep.id)}
                              className="text-red-500 hover:text-red-700 text-[10px] font-bold border-l border-border-glass pl-1.5 cursor-pointer"
                            >
                              ✕
                            </button>
                            <button
                              onClick={() => setSelectedEpisodeId(ep.id)}
                              className="text-[10px] font-bold"
                            >
                              حلقة {ep.number}
                            </button>
                          </div>
                        ))}
                      </div>

                    </div>
                  )}

                  {/* 3. SERVERS AND DOWNLOAD LINKS MANAGER */}
                  {selectedEpisodeId && (
                    <div className="space-y-6 border-t border-border-glass pt-6">
                      <h4 className="text-xs font-black border-r-4 border-[var(--accent-cyan)] pr-2 text-text-primary">3. مشغلات الفيديو وروابط التحميل للحلقة المحددة</h4>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Video Servers Embed Column */}
                        <div className="space-y-4 bg-bg-primary/50 border border-border-glass p-5 rounded-2xl">
                          <h5 className="text-[11px] font-black text-text-primary">📺 مشغلات الفيديو (Watch Servers)</h5>

                          {/* Servers list */}
                          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                            {episodes.find(e => e.id === selectedEpisodeId)?.servers.map((srv) => (
                              <div key={srv.id} className="flex justify-between items-center bg-bg-secondary border border-border-glass px-3 py-2 rounded-xl text-[10px]">
                                <button
                                  onClick={() => handleDeleteSubresource('server', srv.id)}
                                  className="text-red-500 hover:text-red-700 cursor-pointer"
                                >
                                  حذف
                                </button>
                                <span className="text-text-primary font-bold">{srv.name}: <a href={srv.embedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-600">معاينة المشغل</a></span>
                              </div>
                            ))}
                            {(!episodes.find(e => e.id === selectedEpisodeId)?.servers || episodes.find(e => e.id === selectedEpisodeId)?.servers.length === 0) && (
                              <p className="text-[10px] text-text-muted font-semibold py-2">لا توجد سيرفرات تشغيل لهذه الحلقة بعد.</p>
                            )}
                          </div>

                          {/* Add server form */}
                          <form onSubmit={handleAddServer} className="space-y-3 pt-2 border-t border-border-glass">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="اسم السيرفر (مثال: Mp4upload)"
                                value={newServerName}
                                onChange={(e) => setNewServerName(e.target.value)}
                                required
                                className="w-full bg-bg-primary border border-border-glass rounded-xl px-3 py-2 text-[10px] text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                              />
                              <input
                                type="url"
                                placeholder="رابط التضمين (Embed iframe link)"
                                value={newServerEmbedUrl}
                                onChange={(e) => setNewServerEmbedUrl(e.target.value)}
                                required
                                className="w-full bg-bg-primary border border-border-glass rounded-xl px-3 py-2 text-[10px] text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                              />
                            </div>
                            <button
                              type="submit"
                              className="w-full py-2 bg-[var(--accent-purple)] hover:bg-[var(--accent-cyan)] text-white text-[10px] font-black rounded-lg transition-all cursor-pointer"
                            >
                              إضافة سيرفر تشغيل
                            </button>
                          </form>
                        </div>

                        {/* Download Links Column */}
                        <div className="space-y-4 bg-bg-primary/50 border border-border-glass p-5 rounded-2xl">
                          <h5 className="text-[11px] font-black text-text-primary">📥 روابط التحميل المباشرة</h5>

                          {/* Downloads list */}
                          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                            {episodes.find(e => e.id === selectedEpisodeId)?.downloads.map((dl) => (
                              <div key={dl.id} className="flex justify-between items-center bg-bg-secondary border border-border-glass px-3 py-2 rounded-xl text-[10px]">
                                <button
                                  onClick={() => handleDeleteSubresource('download', dl.id)}
                                  className="text-red-500 hover:text-red-700 cursor-pointer"
                                >
                                  حذف
                                </button>
                                <span className="text-text-primary font-bold">{dl.quality}: <a href={dl.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-600">رابط التحميل</a></span>
                              </div>
                            ))}
                            {(!episodes.find(e => e.id === selectedEpisodeId)?.downloads || episodes.find(e => e.id === selectedEpisodeId)?.downloads.length === 0) && (
                              <p className="text-[10px] text-text-muted font-semibold py-2">لا توجد روابط تحميل لهذه الحلقة بعد.</p>
                            )}
                          </div>

                          {/* Add download link form */}
                          <form onSubmit={handleAddDownload} className="space-y-3 pt-2 border-t border-border-glass">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <select
                                value={newDownloadQuality}
                                onChange={(e) => setNewDownloadQuality(e.target.value)}
                                className="w-full bg-bg-primary border border-border-glass text-[10px] font-bold text-text-primary px-2 py-2 rounded-xl focus:outline-none"
                              >
                                <option value="FHD" className="bg-bg-secondary text-slate-850">FHD 1080p</option>
                                <option value="HD" className="bg-bg-secondary text-slate-850">HD 720p</option>
                                <option value="SD" className="bg-bg-secondary text-slate-850">SD 480p</option>
                                <option value="مباشر" className="bg-bg-secondary text-slate-850">رابط مباشر</option>
                              </select>
                              <input
                                type="url"
                                placeholder="رابط التحميل المباشر"
                                value={newDownloadUrl}
                                onChange={(e) => setNewDownloadUrl(e.target.value)}
                                required
                                className="w-full bg-bg-primary border border-border-glass rounded-xl px-3 py-2 text-[10px] text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                              />
                            </div>
                            <button
                              type="submit"
                              className="w-full py-2 bg-[var(--accent-purple)] hover:bg-[var(--accent-cyan)] text-white text-[10px] font-black rounded-lg transition-all cursor-pointer"
                            >
                              إضافة رابط تحميل
                            </button>
                          </form>
                        </div>

                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* TAB 4: Credentials & Cloudflare Settings */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Credentials form */}
              <div className="glass-panel p-6 space-y-6">
                <h4 className="font-black text-base border-r-4 border-[var(--accent-purple)] pr-2 text-text-primary">تحديث بيانات لوحة التحكم الإدارية</h4>

                <form onSubmit={handleUpdateCredentials} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-black text-text-muted">اسم المستخدم الجديد</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      required
                      placeholder="مثال: custom_admin"
                      className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-3 text-xs text-text-primary placeholder-slate-450 focus:outline-none focus:border-[var(--accent-purple)] focus:bg-bg-secondary transition-all text-right"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-black text-text-muted">كلمة المرور الجديدة</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="أدخل كلمة مرور قوية"
                      className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-3 text-xs text-text-primary placeholder-slate-450 focus:outline-none focus:border-[var(--accent-purple)] focus:bg-bg-secondary transition-all text-right"
                    />
                  </div>

                  {settingsMessage && <p className="text-green-600 text-[10px] font-bold text-center">{settingsMessage}</p>}
                  {settingsError && <p className="text-red-500 text-[10px] font-bold text-center">{settingsError}</p>}

                  <button
                    type="submit"
                    className="w-full py-3 bg-[var(--accent-purple)] hover:bg-[var(--accent-cyan)] text-white text-xs font-black rounded-xl transition-all shadow-lg cursor-pointer"
                  >
                    حفظ البيانات الجديدة
                  </button>
                </form>
              </div>

              {/* Cloudflare Bypass settings form */}
              <div className="glass-panel p-6 space-y-6">
                <div className="space-y-1">
                  <h4 className="font-black text-base border-r-4 border-[var(--accent-cyan)] pr-2 text-text-primary">إعدادات تخطي حماية Cloudflare</h4>
                  <p className="text-[9px] text-text-muted font-semibold">تجاوز الحظر 403 ومنع الاتصال من موقع eta.animerco.org.</p>
                </div>

                <form onSubmit={handleUpdateCfConfig} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-black text-text-muted">قيمة الكوكي (cf_clearance Cookie)</label>
                    <textarea
                      rows="3"
                      value={cfCookie}
                      onChange={(e) => setCfCookie(e.target.value)}
                      placeholder="مثال: cf_clearance=abcd1234... أو الصق نص الـ Request Headers بالكامل"
                      className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-2 text-xs text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] focus:bg-bg-secondary transition-all text-right font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-black text-text-muted">بصمة المتصفح (User-Agent)</label>
                    <textarea
                      rows="2"
                      value={userAgent}
                      onChange={(e) => setUserAgent(e.target.value)}
                      placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64) ..."
                      className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-2 text-xs text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] focus:bg-bg-secondary transition-all text-right font-mono"
                    />
                  </div>

                  {cfMessage && <p className="text-green-600 text-[10px] font-bold text-center">{cfMessage}</p>}
                  {cfError && <p className="text-red-500 text-[10px] font-bold text-center">{cfError}</p>}

                  <button
                    type="submit"
                    disabled={isSavingCf}
                    className="w-full py-3 bg-[var(--accent-cyan)] disabled:bg-[var(--accent-cyan)]/30 hover:bg-[var(--accent-purple)] text-white text-xs font-black rounded-xl transition-all shadow-lg cursor-pointer"
                  >
                    {isSavingCf ? 'جاري حفظ الإعدادات...' : 'حفظ إعدادات تخطي الحماية'}
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 5: Visitor Analytics */}
          {activeTab === 'analytics' && (
            <div className="glass-panel p-6 space-y-6">
              <div className="border-b border-border-glass pb-4">
                <h4 className="font-black text-base border-r-4 border-[var(--accent-purple)] pr-2 text-text-primary">إحصائيات الزوار وتحليل المشاهدات</h4>
                <p className="text-[10px] text-text-muted font-extrabold mt-0.5">تحليل مباشر للصفحات الأكثر زيارة والأنميات الأكثر مشاهدة من قبل الزوار.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-bg-primary border border-border-glass rounded-2xl p-5 space-y-1.5 shadow-sm">
                  <span className="text-xs text-text-muted font-bold block">إجمالي زيارات الموقع</span>
                  <span className="text-3xl font-black text-text-primary block">{stats.totalVisits || 0}</span>
                  <span className="text-[10px] text-text-muted font-extrabold block">إجمالي عدد الصفحات المفتوحة منذ التفعيل</span>
                </div>
                <div className="bg-bg-primary border border-border-glass rounded-2xl p-5 space-y-1.5 shadow-sm">
                  <span className="text-xs text-text-muted font-bold block">زيارات الـ 24 ساعة الماضية</span>
                  <span className="text-3xl font-black text-[var(--accent-purple)] block">{stats.visits24h || 0}</span>
                  <span className="text-[10px] text-text-muted font-extrabold block">نشاط الزوار خلال اليوم الأخير</span>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-black text-xs text-text-primary">أكثر 10 صفحات زيارة ومشاهدة</h5>
                <div className="border border-border-glass rounded-2xl overflow-hidden bg-bg-primary">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-bg-secondary text-text-muted font-black border-b border-border-glass">
                        <th className="p-4">الصفحة / الأنمي</th>
                        <th className="p-4">النوع</th>
                        <th className="p-4">الرابط</th>
                        <th className="p-4 text-left">عدد المشاهدات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-glass text-text-primary font-semibold">
                      {stats.resolvedTopPages && stats.resolvedTopPages.length > 0 ? (
                        stats.resolvedTopPages.map((page, idx) => (
                          <tr key={idx} className="hover:bg-bg-secondary/40 transition-colors">
                            <td className="p-4 font-black">{page.name}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                page.type === 'أنمي' ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20' :
                                page.type === 'حلقة' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                                'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                              }`}>
                                {page.type}
                              </span>
                            </td>
                            <td className="p-4 text-text-muted font-mono text-[10px] ltr block max-w-[200px] truncate">{page.path}</td>
                            <td className="p-4 text-left font-black text-accent-primary">{page.count}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="p-8 text-center text-text-muted font-bold">لا توجد بيانات زيارات مسجلة حتى الآن. ابدأ بتصفح الموقع لتظهر الإحصائيات!</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Backup & Restore */}
          {activeTab === 'backup' && (
            <BackupTab token={token} fetchStats={fetchStats} />
          )}

        </div>

      </div>

      {/* 4. DIALOG / MODAL FOR ADDING/EDITING ANIME */}
      {isAnimeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 text-right">
          <div className="glass-panel bg-bg-secondary border border-border-glass w-full max-w-2xl p-8 max-h-[85vh] overflow-y-auto space-y-6 relative shadow-2xl">

            <button
              onClick={() => setIsAnimeModalOpen(false)}
              className="absolute top-6 left-6 text-text-muted hover:text-text-muted text-base cursor-pointer"
            >
              ✕
            </button>

            <div className="border-b border-border-glass pb-4">
              <h3 className="font-black text-text-primary text-base">
                {editingAnime ? `تعديل أنمي: ${editingAnime.title}` : 'إضافة أنمي جديد'}
              </h3>
              <p className="text-[10px] text-text-muted font-extrabold mt-0.5">يرجى ملء تفاصيل الأنمي البرمجية لضمان تكامل عرضه في البوابة.</p>
            </div>

            <form onSubmit={handleAnimeFormSubmit} className="space-y-4 text-xs text-text-primary">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-black text-text-muted">الاسم الإنجليزي (الأصلي) *</label>
                  <input
                    type="text"
                    value={animeForm.title}
                    onChange={(e) => setAnimeForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                    placeholder="مثال: Naruto"
                    className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-2.5 text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-black text-text-muted">الاسم العربي</label>
                  <input
                    type="text"
                    value={animeForm.arabicTitle}
                    onChange={(e) => setAnimeForm(prev => ({ ...prev, arabicTitle: e.target.value }))}
                    placeholder="مثال: ناروتو"
                    className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-2.5 text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block font-black text-text-muted">الرابط اللطيف (slug) *</label>
                  <input
                    type="text"
                    value={animeForm.slug}
                    onChange={(e) => setAnimeForm(prev => ({ ...prev, slug: e.target.value }))}
                    required
                    disabled={!!editingAnime}
                    placeholder="مثال: naruto"
                    className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-2.5 text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-black text-text-muted">رابط صورة البوستر</label>
                  <input
                    type="text"
                    value={animeForm.poster}
                    onChange={(e) => setAnimeForm(prev => ({ ...prev, poster: e.target.value }))}
                    placeholder="رابط الصورة المباشر"
                    className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-2.5 text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-black text-text-muted">التقييم</label>
                  <input
                    type="text"
                    value={animeForm.rating}
                    onChange={(e) => setAnimeForm(prev => ({ ...prev, rating: e.target.value }))}
                    placeholder="مثال: 8.7"
                    className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-2.5 text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="block font-black text-text-muted">النوع</label>
                  <select
                    value={animeForm.type}
                    onChange={(e) => setAnimeForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-bg-primary border border-border-glass text-text-primary px-3 py-2.5 rounded-xl focus:outline-none"
                  >
                    <option value="TV" className="bg-bg-secondary text-text-primary">مسلسل (TV)</option>
                    <option value="Movie" className="bg-bg-secondary text-text-primary">فيلم (Movie)</option>
                    <option value="OVA" className="bg-bg-secondary text-text-primary">أوفا (OVA)</option>
                    <option value="Special" className="bg-bg-secondary text-text-primary">حلقة خاصة</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block font-black text-text-muted">حالة العرض</label>
                  <select
                    value={animeForm.status}
                    onChange={(e) => setAnimeForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-bg-primary border border-border-glass text-text-primary px-3 py-2.5 rounded-xl focus:outline-none"
                  >
                    <option value="مستمر" className="bg-bg-secondary text-text-primary">مستمر / يعرض الآن</option>
                    <option value="مكتمل" className="bg-bg-secondary text-text-primary">مكتمل</option>
                    <option value="متوقف" className="bg-bg-secondary text-text-primary">متوقف مؤقتاً</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block font-black text-text-muted">سنة الإنتاج</label>
                  <input
                    type="text"
                    value={animeForm.year}
                    onChange={(e) => setAnimeForm(prev => ({ ...prev, year: e.target.value }))}
                    placeholder="مثال: 2023"
                    className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-2.5 text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-black text-text-muted">المدة</label>
                  <input
                    type="text"
                    value={animeForm.duration}
                    onChange={(e) => setAnimeForm(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="مثال: 24 د أو 1 ساعة"
                    className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-2.5 text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-black text-text-muted">التصنيفات (Genres) - مفصولة بفاصلة</label>
                <input
                  type="text"
                  value={animeForm.genres}
                  onChange={(e) => setAnimeForm(prev => ({ ...prev, genres: e.target.value }))}
                  placeholder="أكشن, مغامرة, شونين, فنون قتالية"
                  className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-2.5 text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-black text-text-muted">قصة الأنمي (Synopsis)</label>
                <textarea
                  rows="4"
                  value={animeForm.synopsis}
                  onChange={(e) => setAnimeForm(prev => ({ ...prev, synopsis: e.target.value }))}
                  placeholder="اكتب قصة الأنمي هنا بالتفصيل..."
                  className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-2.5 text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                />
              </div>

              {/* SEO Configuration Section */}
              <div className="border-t border-border-glass pt-4 space-y-4">
                <h4 className="font-black text-text-primary text-xs border-r-2 border-[var(--accent-purple)] pr-2">إعدادات SEO المخصصة للأنمي (اختياري)</h4>
                
                <div className="space-y-1">
                  <label className="block font-black text-text-muted">عنوان SEO المخصص (SEO Title)</label>
                  <input
                    type="text"
                    value={animeForm.seoTitle}
                    onChange={(e) => setAnimeForm(prev => ({ ...prev, seoTitle: e.target.value }))}
                    placeholder="اتركه فارغاً للاعتماد على العنوان التلقائي للموقع"
                    className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-2.5 text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-black text-text-muted">وصف SEO المخصص (SEO Description)</label>
                  <textarea
                    rows="3"
                    value={animeForm.seoDescription}
                    onChange={(e) => setAnimeForm(prev => ({ ...prev, seoDescription: e.target.value }))}
                    placeholder="اتركه فارغاً للاعتماد على الوصف التلقائي من قصة الأنمي"
                    className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-2.5 text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-black text-text-muted">الكلمات المفتاحية المخصصة (SEO Keywords) - مفصولة بفاصلة</label>
                  <input
                    type="text"
                    value={animeForm.seoKeywords}
                    onChange={(e) => setAnimeForm(prev => ({ ...prev, seoKeywords: e.target.value }))}
                    placeholder="اتركه فارغاً للاعتماد على التصنيفات التلقائية"
                    className="w-full bg-bg-primary border border-border-glass rounded-xl px-4 py-2.5 text-text-primary placeholder-slate-400 focus:outline-none focus:border-[var(--accent-purple)] text-right"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-glass">
                <button
                  type="button"
                  onClick={() => setIsAnimeModalOpen(false)}
                  className="bg-bg-primary hover:bg-bg-primary text-text-muted border border-border-glass px-6 py-2.5 rounded-xl transition-all cursor-pointer font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-[var(--accent-purple)] hover:bg-[var(--accent-cyan)] text-white px-8 py-2.5 rounded-xl transition-all shadow-lg cursor-pointer font-black"
                >
                  حفظ البيانات
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function BackupTab({ token, fetchStats }) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/admin/backup', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `otaku_world_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        alert(`فشل التصدير: ${data.error}`);
      }
    } catch (err) {
      alert(`حدث خطأ أثناء تصدير النسخة الاحتياطية: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
      setImportMessage('');
      setImportError('');
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setImportError('يرجى اختيار ملف النسخة الاحتياطية أولاً');
      return;
    }

    if (!confirm('تحذير: سيقوم هذا باستبدال الأنميات الحالية التي تحمل نفس المعرف أو الرابط في قاعدة البيانات بالنسخة الاحتياطية. هل تريد المتابعة؟')) {
      return;
    }

    setIsImporting(true);
    setImportMessage('');
    setImportError('');

    try {
      const fileReader = new FileReader();
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (!parsed.animes || !Array.isArray(parsed.animes)) {
            setImportError('ملف النسخة الاحتياطية غير صالح (مفقود مصفوفة الأنميات)');
            setIsImporting(false);
            return;
          }

          const totalAnimes = parsed.animes.length;
          const chunkSize = 15;
          let importedCount = 0;

          setImportMessage(`🚀 بدء استيراد البيانات على دفعات (حجم الدفعة: ${chunkSize})...`);

          for (let i = 0; i < totalAnimes; i += chunkSize) {
            const chunk = parsed.animes.slice(i, i + chunkSize);
            const progressPercent = Math.round((i / totalAnimes) * 100);
            setImportMessage(`⏳ جاري رفع الدفعة ${Math.floor(i / chunkSize) + 1} (${progressPercent}% - تم استيراد ${importedCount}/${totalAnimes})...`);

            const res = await fetch('/api/admin/backup', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ animes: chunk })
            });

            const result = await res.json();
            if (!result.success) {
              throw new Error(result.error || `فشلت استعادة الدفعة رقم ${Math.floor(i / chunkSize) + 1}`);
            }
            importedCount += chunk.length;
          }

          setImportMessage(`🎉 تم استعادة النسخة الاحتياطية بنجاح! تم استيراد جميع الأنميات (${importedCount} عمل).`);
          setImportFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          fetchStats();
        } catch (parseErr) {
          setImportError(parseErr.message || 'فشل تحليل ملف JSON. تأكد من أن الملف سليم وغير تالف.');
        } finally {
          setIsImporting(false);
        }
      };
      fileReader.readAsText(importFile);
    } catch (err) {
      setImportError(`حدث خطأ أثناء قراءة الملف: ${err.message}`);
      setIsImporting(false);
    }
  };

  const handleWipeDatabase = async () => {
    const confirmation1 = confirm('تحذير شديد الخطورة: سيتم حذف كافة الأنميات والمواسم والحلقات وسيرفرات البث والتحميل والزيارات نهائياً من قاعدة البيانات السحابية PostgreSQL! هل تريد الاستمرار؟');
    if (!confirmation1) return;
    
    const confirmation2 = confirm('تنبيه أخير: هذا الإجراء لا يمكن التراجع عنه بأي شكل من الأشكال وسيتم مسح قاعدة البيانات بالكامل. هل أنت متأكد بنسبة 100%؟');
    if (!confirmation2) return;

    const authPass = prompt('يرجى كتابة كلمة "DELETE" لتأكيد رغبتك في حذف قاعدة البيانات:');
    if (authPass !== 'DELETE') {
      alert('لم تقم بكتابة كلمة التأكيد بشكل صحيح. تم إلغاء العملية.');
      return;
    }

    setIsWiping(true);
    try {
      const res = await fetch('/api/admin/migrate', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchStats();
      } else {
        alert(`فشلت العملية: ${data.error}`);
      }
    } catch (err) {
      alert(`حدث خطأ أثناء مسح البيانات: ${err.message}`);
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <div className="glass-panel p-6 space-y-6">
      <div className="border-b border-border-glass pb-4">
        <h4 className="font-black text-base border-r-4 border-[var(--accent-purple)] pr-2 text-text-primary">نظام النسخ الاحتياطي والاستعادة</h4>
        <p className="text-[10px] text-text-muted font-extrabold mt-0.5">يمكنك تصدير قاعدة بيانات الأنميات والمواسم والحلقات بالكامل كملف JSON، أو استعادتها من ملف خارجي.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Export Panel */}
        <div className="bg-bg-primary border border-border-glass p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h5 className="font-black text-xs text-text-primary flex items-center gap-2">
              <span>💾</span>
              <span>تصدير نسخة احتياطية</span>
            </h5>
            <p className="text-[10px] text-text-muted font-semibold leading-relaxed text-right">
              يقوم هذا الإجراء بتجميع كافة بيانات الأنميات، المواسم، الحلقات، وسيرفرات البث والتحميل في ملف واحد مضغوط بصيغة JSON وتحميله على جهازك للاحتفاظ به.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-3 bg-[var(--accent-purple)] hover:bg-[var(--accent-cyan)] text-white text-xs font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-t-white border-border-glass rounded-full animate-spin" />
                <span>جاري تصدير البيانات...</span>
              </>
            ) : (
              <>
                <span>📥</span>
                <span>تصدير وتحميل النسخة الاحتياطية</span>
              </>
            )}
          </button>
        </div>

        {/* Import Panel */}
        <div className="bg-bg-primary border border-border-glass p-6 rounded-2xl space-y-4">
          <h5 className="font-black text-xs text-text-primary flex items-center gap-2">
            <span>📤</span>
            <span>استعادة نسخة احتياطية</span>
          </h5>
          <p className="text-[10px] text-text-muted font-semibold leading-relaxed text-right">
            اختر ملف النسخة الاحتياطية (JSON) من جهازك لاستعادتها. سيقوم الخادم بمزامنة البيانات واستبدال الأنميات الحالية المتشابهة لمنع التكرار.
          </p>

          <form onSubmit={handleImport} className="space-y-3 pt-2">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="backup-file-input"
              />
              <label
                htmlFor="backup-file-input"
                className="flex-1 border border-dashed border-border-glass hover:border-[var(--accent-purple)] rounded-xl py-2.5 px-4 text-xs text-center font-bold text-text-muted hover:text-text-primary cursor-pointer transition-colors block truncate max-w-[240px] md:max-w-none"
              >
                {importFile ? importFile.name : '📁 اختر ملف الـ JSON'}
              </label>
              <button
                type="submit"
                disabled={isImporting || !importFile}
                className="bg-green-600 disabled:bg-green-600/40 hover:bg-green-700 text-white text-xs font-black px-6 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                {isImporting ? 'جاري الاستعادة...' : 'استعادة النسخة'}
              </button>
            </div>

            {importMessage && <p className="text-green-500 text-[10px] font-black text-center">{importMessage}</p>}
            {importError && <p className="text-red-500 text-[10px] font-black text-center">{importError}</p>}
          </form>
        </div>

      </div>

      {/* Wipe Database Panel */}
      <div className="border border-red-500/20 bg-red-500/5 p-6 rounded-2xl space-y-4">
        <h5 className="font-black text-xs text-red-500 flex items-center gap-2">
          <span>⚠️</span>
          <span>منطقة الخطر: حذف قاعدة البيانات</span>
        </h5>
        <p className="text-[10px] text-red-400/80 font-semibold leading-relaxed text-right">
          هذا الإجراء يقوم بمسح وحذف كافة الأنميات، والمواسم، والحلقات، وسيرفرات البث، وروابط التحميل، وإحصائيات الزيارات نهائياً من قاعدة بيانات PostgreSQL السحابية. يرجى توخي الحذر الشديد!
        </p>
        <button
          onClick={handleWipeDatabase}
          disabled={isWiping}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isWiping ? (
            <>
              <div className="w-4 h-4 border-2 border-t-white border-red-300 rounded-full animate-spin" />
              <span>جاري مسح قاعدة البيانات...</span>
            </>
          ) : (
            <>
              <span>🗑️</span>
              <span>حذف كافة الأنميات والبيانات نهائياً</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
