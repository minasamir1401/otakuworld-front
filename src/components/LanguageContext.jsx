'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  ar: {
    // Navbar
    navHome: 'الرئيسية',
    navAnime: 'الأنميات',
    navMovies: 'الأفلام',
    navSchedule: 'جدول المواعيد',
    navGenres: 'التصنيفات',
    navWatchlist: 'المفضلة',
    searchPlaceholder: 'ابحث عن الأنمي الذي تفضله...',
    // Homepage
    searchPlaceholderMain: 'ابحث عن أنمي بالاسم (عربي أو إنجليزي)...',
    cancel: 'إلغاء',
    latestEpisodes: 'أحدث الحلقات',
    mostWatched: 'الأكثر مشاهدة',
    topRated: 'الأعلى تقييماً',
    moviesTab: 'الأفلام',
    genreFilterLabel: 'تصفية حسب التصنيف:',
    watchlistTitle: 'قائمة الأنميات المفضلة',
    latestEpisodesSection: 'أحدث الحلقات المضافة',
    trendingSection: 'الأكثر مشاهدة وشهرة',
    topRatedSection: 'الأعلى تقييماً',
    moviesSection: 'الأفلام المضافة',
    watchlistSection: 'قائمة المفضلة',
    searchResultsSection: 'نتائج البحث',
    searchResultsGenreSection: 'نتائج البحث (تصنيف: {genre})',
    genreAnimesSection: 'أنميات تصنيف: {genre}',
    totalCountLabel: 'إجمالي الأنميات والأفلام:',
    loadingList: 'جاري جلب القائمة...',
    noResultsTitle: 'لم نجد أي نتائج في قاعدة البيانات.',
    noResultsDesc: 'تأكد من إطلاق سكربت السحب لتغذية الموقع بالبيانات.',
    loadMoreBtn: 'عرض المزيد من الأنميات',
    loadingBtn: 'جاري التحميل...',
    statusOngoing: 'مستمر',
    statusCompleted: 'منتهي',
    typeMovie: 'فيلم',
    typeSeries: 'مسلسل',
    typeAnime: 'أنمي',
    typeShow: 'عمل',
    durationSuffix: 'د',
    genresTitle: 'التصنيفات',
    recentlyAddedHero: 'مضاف حديثاً',
    watchNow: 'مشاهدة الآن',
    noSynopsis: 'لا يوجد ملخص قصة متوفر حالياً لهذا العمل.',
    loadingPortal: 'جاري تحميل البوابة...',
    // Footer
    footerDesc: 'منصة ترفيهية لمشاهدة الأنمي مترجم بأعلى جودة وبأحدث تقنيات المشغلات خالية من الإعلانات.',
    footerRights: 'جميع الحقوق محفوظة © {year} عالم الأوتاكو',
    aboutUs: 'من نحن',
    contactUs: 'اتصل بنا',
    terms: 'الشروط والأحكام',
    privacy: 'سياسة الخصوصية',
    // Details Page
    watchlistAdd: '➕ إضافة إلى المفضلة',
    watchlistRemove: '❤️ تم الحفظ في المفضلة',
    globalRating: 'التقييم العالمي',
    typeLabel: 'النوع',
    statusLabel: 'الحالة',
    yearLabel: 'سنة الإنتاج',
    durationLabel: 'مدة الحلقة',
    synopsisTitle: 'قصة الأنمي',
    synopsisShowTitle: 'قصة العمل',
    seasonsTitle: 'المواسم والحلقات',
    seasonsCountLabel: 'المواسم:',
    episodeLabel: 'الحلقة',
    noEpisodes: 'لم يتم إضافة حلقات لهذا الموسم بعد.',
    noSeasons: 'لم يتم العور على أي حلقات مضافة لهذا الأنمي في قاعدة البيانات حالياً.',
    backToHome: 'العودة للرئيسية',
    notFoundAnime: 'عذراً، لم نعثر على هذا الأنمي في قاعدة البيانات.',
    notFoundShow: 'عذراً، لم نعثر على هذا العمل في قاعدة البيانات.',
    loadingAnime: 'جاري تحميل صفحة الأنمي...',
    loadingShow: 'جاري تحميل صفحة العمل...',
    // Watch Page
    watchHomeLink: 'الرئيسية',
    watchServers: 'سيرفرات المشاهدة:',
    prevBtn: 'السابق',
    nextBtn: 'التالي',
    noPrevEp: 'لا توجد حلقة سابقة',
    lastEpSeason: 'الحلقة الأخيرة للموسم',
    noSynopsisEp: 'لا توجد تفاصيل إضافية عن قصة هذا الأنمي.',
    directDownloadsTitle: 'روابط التحميل المباشرة المستخرجة من السيرفرات',
    directDownloadsDesc: 'لقد قمنا باستخراج روابط البث المباشرة من السيرفرات لتنزيل الحلقة بدون إعلانات. يمكنك النقر للتحميل مباشرة بجودة عالية.',
    directDlQuality: 'تنزيل مباشر: {quality}',
    directDlLabel: 'سيرفر مباشر مستخرج',
    directDlBtn: 'تحميل مباشر',
    officialDownloadsTitle: 'روابط التحميل الرسمية',
    officialDlQuality: 'الجودة: {quality}',
    officialDlLabel: 'رابط توجيهي خارجي',
    officialDlBtn: 'رابط التحميل',
    preparingDl: 'جاري التحضير...',
    similarAnimes: 'أنميات مشابهة قد تعجبك',
    commentsTitle: 'التعليقات ({count})',
    commentPlaceholder: 'اكتب تعليقك هنا...',
    commentBtn: 'نشر التعليق',
    loadingWatch: 'جاري تشغيل مشغل الفيديو ونقاوة الاتصال...',
    notFoundEpisode: 'عذراً، لم نعثر على هذه الحلقة.',
    watchServerPlaceholder: 'لا تتوفر سيرفرات مشاهدة لهذه الحلقة حالياً.',
    // Schedule Page
    scheduleTitle: 'الجدول الأسبوعي',
    scheduleHeading: 'مواعيد الحلقات الأسبوعية',
    scheduleDesc: 'تابع مواعيد صدور حلقات الأنمي المفضلة لديك يوماً بيوم طوال الأسبوع بتوقيت مكة المكرمة.',
    scheduleTotal: 'إجمالي العروض: {count}',
    scheduleEmpty: 'لا توجد حلقات مجدولة للعرض في هذا اليوم',
    scheduleLoading: 'جاري تحميل جدول المواعيد...',
    scheduleError: 'عذراً، حدث خطأ أثناء تحميل جدول المواعيد',
    daySunday: 'الأحد',
    dayMonday: 'الإثنين',
    dayTuesday: 'الثلاثاء',
    dayWednesday: 'الأربعاء',
    dayThursday: 'الخميس',
    dayFriday: 'الجمعة',
    daySaturday: 'السبت',
    dayLabel: 'حلقات يوم {day}'
  },
  en: {
    // Navbar
    navHome: 'Home',
    navAnime: 'Anime',
    navMovies: 'Movies',
    navSchedule: 'Schedule',
    navGenres: 'Genres',
    navWatchlist: 'Watchlist',
    searchPlaceholder: 'Search for your favorite anime...',
    // Homepage
    searchPlaceholderMain: 'Search anime by name (Arabic or English)...',
    cancel: 'Cancel',
    latestEpisodes: 'Latest Episodes',
    mostWatched: 'Most Watched',
    topRated: 'Top Rated',
    moviesTab: 'Movies',
    genreFilterLabel: 'Filter by Genre:',
    watchlistTitle: 'My Watchlist',
    latestEpisodesSection: 'Latest Added Episodes',
    trendingSection: 'Trending & Popular',
    topRatedSection: 'Top Rated',
    moviesSection: 'Added Movies',
    watchlistSection: 'Watchlist',
    searchResultsSection: 'Search Results',
    searchResultsGenreSection: 'Search Results (Genre: {genre})',
    genreAnimesSection: 'Anime in Genre: {genre}',
    totalCountLabel: 'Total Anime & Movies:',
    loadingList: 'Fetching list...',
    noResultsTitle: 'No results found in the database.',
    noResultsDesc: 'Make sure to run the scraper script to populate the site with data.',
    loadMoreBtn: 'Show More Anime',
    loadingBtn: 'Loading...',
    statusOngoing: 'Ongoing',
    statusCompleted: 'Completed',
    typeMovie: 'Movie',
    typeSeries: 'Series',
    typeAnime: 'Anime',
    typeShow: 'Show',
    durationSuffix: 'm',
    genresTitle: 'Genres',
    recentlyAddedHero: 'Recently Added',
    watchNow: 'Watch Now',
    noSynopsis: 'No synopsis available for this title.',
    loadingPortal: 'Loading portal...',
    // Footer
    footerDesc: 'Entertainment platform to watch translated anime in high quality with latest video player technologies, ad-free.',
    footerRights: 'All rights reserved © {year} Otaku World',
    aboutUs: 'About Us',
    contactUs: 'Contact Us',
    terms: 'Terms of Use',
    privacy: 'Privacy Policy',
    // Details Page
    watchlistAdd: '➕ Add to Watchlist',
    watchlistRemove: '❤️ Saved in Watchlist',
    globalRating: 'Global Rating',
    typeLabel: 'Type',
    statusLabel: 'Status',
    yearLabel: 'Year',
    durationLabel: 'Duration',
    synopsisTitle: 'Anime Synopsis',
    synopsisShowTitle: 'Synopsis',
    seasonsTitle: 'Seasons & Episodes',
    seasonsCountLabel: 'Seasons:',
    episodeLabel: 'Episode',
    noEpisodes: 'No episodes added to this season yet.',
    noSeasons: 'No episodes found for this anime in the database yet.',
    backToHome: 'Back to Home',
    notFoundAnime: 'Sorry, we couldn\'t find this anime in the database.',
    notFoundShow: 'Sorry, we couldn\'t find this show in the database.',
    loadingAnime: 'Loading anime page...',
    loadingShow: 'Loading show page...',
    // Watch Page
    watchHomeLink: 'Home',
    watchServers: 'Streaming Servers:',
    prevBtn: 'Prev',
    nextBtn: 'Next',
    noPrevEp: 'No Previous Episode',
    lastEpSeason: 'Last Episode of Season',
    noSynopsisEp: 'No additional story details available for this anime.',
    directDownloadsTitle: 'Direct Server Download Links (Ad-Free)',
    directDownloadsDesc: 'We extracted the direct streaming links from the servers to download the episode without ads. Click to download directly in high quality.',
    directDlQuality: 'Direct Download: {quality}',
    directDlLabel: 'Extracted Direct Server',
    directDlBtn: 'Direct Download',
    officialDownloadsTitle: 'Official Download Links',
    officialDlQuality: 'Quality: {quality}',
    officialDlLabel: 'Redirect Link',
    officialDlBtn: 'Download Link',
    preparingDl: 'Preparing...',
    similarAnimes: 'Similar Anime You Might Like',
    commentsTitle: 'Comments ({count})',
    commentPlaceholder: 'Write your comment...',
    commentBtn: 'Post Comment',
    loadingWatch: 'Running video player and checking connection quality...',
    notFoundEpisode: 'Sorry, we couldn\'t find this episode.',
    watchServerPlaceholder: 'No streaming servers are currently available for this episode.',
    // Schedule Page
    scheduleTitle: 'Weekly Schedule',
    scheduleHeading: 'Weekly Episode Release Times',
    scheduleDesc: 'Track release schedules of your favorite anime day by day in KSA timezone.',
    scheduleTotal: 'Total Shows: {count}',
    scheduleEmpty: 'No scheduled episodes for today',
    scheduleLoading: 'Loading schedule...',
    scheduleError: 'Sorry, an error occurred while loading the schedule',
    daySunday: 'Sunday',
    dayMonday: 'Monday',
    dayTuesday: 'Tuesday',
    dayWednesday: 'Wednesday',
    dayThursday: 'Thursday',
    dayFriday: 'Friday',
    daySaturday: 'Saturday',
    dayLabel: 'Episodes on {day}'
  }
};

const genreMap = {
  'أكشن ومغامرات': 'Action & Adventure',
  'خيال وسحر': 'Fantasy & Magic',
  'خيال علمي وميكا': 'Sci-Fi & Mecha',
  'غموض وتشويق': 'Mystery & Thriller',
  'رعب ودموي': 'Horror & Gore',
  'دراما ونفسي': 'Drama & Psychological',
  'رومانسي وحريم': 'Romance & Harem',
  'مدرسي ورياضي': 'School & Sports',
  'شونين وسينين': 'Shounen & Seinen',
  'كوميديا وسخرية': 'Comedy & Parody',
  'شريحة من الحياة': 'Slice of Life',
  'أكشن': 'Action',
  'خيال': 'Fantasy',
  'دراما': 'Drama',
  'مغامرات': 'Adventure',
  'رعب': 'Horror',
  'غموض': 'Mystery',
  'كوميديا': 'Comedy',
  'رومانسي': 'Romance',
  'رياضي': 'Sports',
  'مدرسي': 'School',
  'سحر': 'Magic',
  'شونين': 'Shounen',
  'شريحة من الحياة': 'Slice of Life'
};

const weekdayMap = {
  'الأحد': 'Sunday',
  'الإثنين': 'Monday',
  'الثلاثاء': 'Tuesday',
  'الأربعاء': 'Wednesday',
  'الخميس': 'Thursday',
  'الجمعة': 'Friday',
  'السبت': 'Saturday'
};

const LanguageContext = createContext();

export function LanguageProvider({ children, initialLang = 'ar' }) {
  const [lang, setLang] = useState(initialLang);

  useEffect(() => {
    // Sync UI settings on initial load or change
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const toggleLanguage = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    // Write cookie with 1 year expiry
    document.cookie = `lang=${nextLang}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = nextLang;
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
  };

  const t = (key, params = {}) => {
    let text = translations[lang]?.[key] || translations['ar']?.[key] || key;
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });
    return text;
  };

  const translateGenre = (genre) => {
    if (lang === 'ar') return genre;
    return genreMap[genre] || genre;
  };

  const translateWeekday = (day) => {
    if (lang === 'ar') return day;
    return weekdayMap[day] || day;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t, translateGenre, translateWeekday }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
