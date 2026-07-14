import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3'
};

export async function GET() {
  try {
    const response = await axios.get('https://eta.animerco.org/schedule/', { headers: HEADERS });
    const $ = cheerio.load(response.data);
    
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const schedule = {};
    
    days.forEach(day => {
      schedule[day] = [];
    });

    // In the page, there are 7 tab-content elements corresponding to the days of the week in order:
    // Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday
    $('.tab-content').each((dayIndex, tabEl) => {
      const dayName = days[dayIndex];
      if (!dayName) return;

      $(tabEl).find('.media-block').each((i, cardEl) => {
        const title = $(cardEl).find('h3').text().trim();
        const season = $(cardEl).find('h4').text().trim() || 'الموسم 1';
        const href = $(cardEl).find('a').first().attr('href') || '#';
        
        // Extract the anime slug from the season URL
        const urlParts = href.split('/').filter(Boolean);
        const rawSlug = urlParts[urlParts.length - 1] || '';
        const animeSlug = rawSlug.replace(/-season-\d+$/, '').replace(/-season$/, '');

        const poster = $(cardEl).find('a.image').attr('data-src') || $(cardEl).find('a.image img').attr('src') || '';
        
        schedule[dayName].push({
          title,
          season,
          slug: animeSlug,
          poster
        });
      });
    });

    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error('Schedule API Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
