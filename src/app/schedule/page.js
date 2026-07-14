'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../components/LanguageContext';

const getProxyImageUrl = (url) => {
  if (!url) return 'https://via.placeholder.com/300x400';
  if (url.startsWith('/')) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
};

export default function SchedulePage() {
  const { t, translateWeekday, lang } = useLanguage();
  const isAr = lang === 'ar';

  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const [activeDay, setActiveDay] = useState('');
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set active day to today's weekday in Arabic (for DB queries)
  useEffect(() => {
    const today = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
    const mappedDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    setActiveDay(mappedDays[today] || 'الأحد');
  }, []);

  useEffect(() => {
    async function fetchSchedule() {
      try {
        const response = await fetch('/api/schedule');
        const data = await response.json();
        if (data.success) {
          setSchedule(data.schedule);
        } else {
          setError(data.error || 'Failed to load schedule');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSchedule();
  }, []);

  return (
    <div className={`space-y-10 animate-fade-in pb-16 ${isAr ? 'text-right' : 'text-left'}`}>
      
      {/* Cinematic Page Title */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-black tracking-widest text-accent-primary uppercase bg-accent-primary/10 px-4 py-1.5 rounded-full">
          {t('scheduleTitle')}
        </span>
        <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-text-primary via-text-primary to-text-muted bg-clip-text text-transparent leading-tight">
          {t('scheduleHeading')}
        </h1>
        <p className="text-text-muted text-xs md:text-sm">
          {t('scheduleDesc')}
        </p>
      </div>

      {/* Weekdays Tabs Navigation */}
      <div className="glass-panel p-3 flex gap-2 overflow-x-auto justify-start md:justify-center rounded-2xl border border-border-glass no-scrollbar">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`px-6 py-3 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap cursor-pointer ${
              activeDay === day 
                ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-lg shadow-accent-primary/25 scale-[1.03]' 
                : 'text-text-muted hover:text-text-primary hover:bg-bg-primary/50'
            }`}
          >
            {translateWeekday(day)}
          </button>
        ))}
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-t-accent-primary border-r-transparent border-b-accent-hover border-l-transparent animate-spin"></div>
          <p className="text-sm text-text-muted font-bold">{t('scheduleLoading')}</p>
        </div>
      )}

      {error && (
        <div className="glass-card max-w-md mx-auto p-6 text-center border-accent-hover/20 text-accent-hover space-y-2">
          <p className="font-bold">{t('scheduleError')}</p>
          <p className="text-xs text-text-muted">{error}</p>
        </div>
      )}

      {/* Content Grid */}
      {!loading && !error && schedule && (
        <div className="space-y-6">
          <div className="border-b border-border-glass pb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-primary animate-pulse"></span>
              {t('dayLabel', { day: translateWeekday(activeDay) })}
            </h2>
            <span className="text-xs text-text-muted font-bold">
              {t('scheduleTotal', { count: schedule[activeDay]?.length || 0 })}
            </span>
          </div>

          {schedule[activeDay]?.length === 0 ? (
            <div className="glass-card p-12 text-center text-text-muted space-y-2 rounded-2xl border-dashed">
              <svg className="w-12 h-12 mx-auto text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <p className="font-bold text-sm">{t('scheduleEmpty')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {schedule[activeDay]?.map((anime, index) => (
                <Link
                  key={index}
                  href={`/anime/${anime.slug}`}
                  className="group flex flex-col glass-card p-2 text-right relative overflow-hidden"
                >
                  {/* Card Image with Lazy Load Effect */}
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3">
                    <img
                      src={getProxyImageUrl(anime.poster)}
                      alt={anime.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/95 via-transparent to-transparent opacity-60"></div>
                  </div>

                  {/* Title & Season */}
                  <div className="px-1 pb-2 flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className={`text-xs font-bold text-text-primary group-hover:text-accent-primary line-clamp-2 transition-colors ${isAr ? 'text-right' : 'text-left'}`}>
                        {anime.title}
                      </h3>
                      <span className={`text-[10px] text-text-muted font-extrabold block mt-1 ${isAr ? 'text-right' : 'text-left'}`}>
                        {isAr ? anime.season : anime.season.replace('الموسم', 'Season').replace('موسم', 'Season')}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
