import axios from 'axios';
import * as cheerio from 'cheerio';
import prisma from '@/lib/prisma';

const BASE_URL = 'https://eta.animerco.org';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3'
};

let _cachedConfig = null;
let _cacheTime = 0;

async function getBypassHeaders() {
  const headers = { ...HEADERS };
  try {
    // Cache config for 60 seconds to avoid too many DB reads
    if (!_cachedConfig || Date.now() - _cacheTime > 60000) {
      _cachedConfig = await prisma.appConfig.findUnique({ where: { id: 'singleton' } });
      _cacheTime = Date.now();
    }
    if (_cachedConfig) {
      if (_cachedConfig.cfCookie) {
        headers['Cookie'] = _cachedConfig.cfCookie;
      }
      if (_cachedConfig.userAgent) {
        headers['User-Agent'] = _cachedConfig.userAgent;
      }
    }
  } catch (e) {
    console.error('Error reading bypass config from DB:', e.message);
  }
  return headers;
}

// Helper to decode safe download URLs
function decodeDownloadUrl(safeB64Str) {
  try {
    const buffer = Buffer.from(safeB64Str, 'base64');
    const decoded = buffer.toString('utf-8');
    return decoded.split('').reverse().join('');
  } catch (err) {
    console.error('Error decoding Base64:', err.message);
    return null;
  }
}

// Helper to unpack Dean Edwards packed scripts (used by Uqload)
function unpackUqload(packedCode) {
  try {
    const regex = /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*d\s*\)\s*\{\s*[\s\S]+?\}\s*\(\s*(['"][\s\S]*?['"])\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"][\s\S]*?['"])\.split\(['"]\|['"]\)/;
    const match = packedCode.match(regex);
    if (!match) return null;

    let p = match[1];
    if ((p.startsWith("'") && p.endsWith("'")) || (p.startsWith('"') && p.endsWith('"'))) {
      p = p.substring(1, p.length - 1);
    }
    p = p.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');

    const a = parseInt(match[2], 10);
    let c = parseInt(match[3], 10);
    
    let kStr = match[4];
    if ((kStr.startsWith("'") && kStr.endsWith("'")) || (kStr.startsWith('"') && kStr.endsWith('"'))) {
      kStr = kStr.substring(1, kStr.length - 1);
    }
    const k = kStr.split('|');

    while (c--) {
      if (k[c]) {
        const baseVal = c.toString(a);
        const escapedWord = baseVal.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        p = p.replace(new RegExp('\\b' + escapedWord + '\\b', 'g'), k[c]);
      }
    }
    return p;
  } catch (err) {
    console.error('Unpack err:', err);
    return null;
  }
}

// Extractor function for direct video links from ok.ru, mp4upload, uqload
export async function extractDirectVideoUrl(serverName, embedUrl) {
  const name = serverName.toLowerCase();
  try {
    if (name.includes('mp4upload')) {
      const res = await axios.get(embedUrl, { headers: getBypassHeaders(), timeout: 5000 });
      const match = res.data.match(/src\s*:\s*["'](https?:\/\/[^"']+\.mp4[^"']*)["']/i);
      if (match) return match[1];
    } else if (name.includes('uqload')) {
      const fileCodeMatch = embedUrl.match(/\/e\/([a-zA-Z0-9]+)/);
      if (fileCodeMatch) {
        const fileCode = fileCodeMatch[1];
        const res = await axios.post('https://uqload.is/dl', new URLSearchParams({
          op: 'embed',
          file_code: fileCode,
          auto: '1',
          referer: 'https://eta.animerco.org/'
        }), {
          headers: {
            ...getBypassHeaders(),
            'Referer': embedUrl
          },
          timeout: 6000
        });

        const $ = cheerio.load(res.data);
        let foundUrl = null;
        $('script').each((i, el) => {
          const content = $(el).html();
          if (content && content.includes('eval(function(p,a,c,k,e,d)')) {
            const unpacked = unpackUqload(content);
            if (unpacked) {
              const urlMatch = unpacked.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/i);
              if (urlMatch) {
                foundUrl = urlMatch[1];
              }
            }
          }
        });
        if (foundUrl) return foundUrl;
      }
    } else if (name.includes('ok')) {
      const res = await axios.get(embedUrl, { headers: getBypassHeaders(), timeout: 5000 });
      const $ = cheerio.load(res.data);
      const dataOptions = $('div[data-options]').attr('data-options');
      if (dataOptions) {
        const options = JSON.parse(dataOptions);
        const metadata = JSON.parse(options.flashvars.metadata);
        if (metadata && metadata.videos) {
          const videos = metadata.videos;
          const qualities = ['hd', 'sd', 'low', 'lowest', 'mobile'];
          for (const q of qualities) {
            const video = videos.find(v => v.name === q);
            if (video) return video.url;
          }
          return videos[0].url;
        }
      }
    } else if (name.includes('streamruby') || name.includes('stmruby') || name.includes('سيرفر 1') || embedUrl.includes('streamruby') || embedUrl.includes('stmruby')) {
      const res = await axios.get(embedUrl, { headers: getBypassHeaders(), timeout: 6000 });
      const content = res.data;
      if (content.includes('eval(function(p,a,c,k,e,d)')) {
        const unpacked = unpackUqload(content);
        if (unpacked) {
          const urlMatch = unpacked.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/i);
          if (urlMatch) return urlMatch[1];
        }
      }
    }
  } catch (error) {
    console.error(`Error extracting video from ${serverName} (${embedUrl}):`, error.message);
  }
  return null;
}

// Resolve Direct Download Link from a redirect page
export async function resolveDownloadLink(redirectUrl) {
  try {
    const response = await axios.get(redirectUrl, { headers: getBypassHeaders() });
    const $ = cheerio.load(response.data);
    const safeData = $('#link').attr('data-safe');
    
    if (safeData) {
      return decodeDownloadUrl(safeData);
    }
    return null;
  } catch (error) {
    console.error(`Error resolving download link ${redirectUrl}:`, error.message);
    return null;
  }
}

// Scrape Watch Servers & Download Links for a single episode url
export async function scrapeEpisodeSources(episodeUrl) {
  if (episodeUrl.includes('akwam')) {
    const servers = [];
    const downloads = [];
    try {
      // 1. Scrape Watch Servers
      const watchUrl = episodeUrl.endsWith('/') ? `${episodeUrl}watch` : `${episodeUrl}/watch`;
      const watchRes = await axios.get(watchUrl, { headers: getBypassHeaders(), timeout: 15000 });
      const watch$ = cheerio.load(watchRes.data);

      watch$('.server-btn').each((i, el) => {
        const name = watch$(el).text().replace('▶', '').trim();
        const embedUrl = watch$(el).attr('data-link');
        if (embedUrl) {
          servers.push({ name, embedUrl });
        }
      });

      // 2. Scrape Download Links
      const downloadUrl = episodeUrl.endsWith('/') ? `${episodeUrl}download` : `${episodeUrl}/download`;
      const downloadRes = await axios.get(downloadUrl, { headers: getBypassHeaders(), timeout: 15000 });
      const download$ = cheerio.load(downloadRes.data);

      download$('a.download-btn').each((i, el) => {
        let text = download$(el).text().replace(/\s+/g, ' ').trim();
        if (text.includes('تحميل')) {
          text = text.replace('تحميل مباشر', '').replace('اضغط للتحميل', '').trim();
        }
        const href = download$(el).attr('href');
        if (href) {
          downloads.push({
            quality: text || 'تحميل',
            name: 'Akwam Download',
            url: href
          });
        }
      });

      return { servers, downloads };
    } catch (err) {
      console.error(`Error scraping Akwam sources:`, err.message);
      return { servers: [], downloads: [] };
    }
  }

  try {
    const response = await axios.get(episodeUrl, { headers: getBypassHeaders() });
    const html = response.data;
    const $ = cheerio.load(html);

    // Extract dtAjax.security from script tags
    let security = '';
    $('script').each((i, el) => {
      const scriptContent = $(el).html();
      if (scriptContent && scriptContent.includes('dtAjax')) {
        const match = scriptContent.match(/"security":"([^"]+)"/);
        if (match) {
          security = match[1];
        }
      }
    });

    const servers = [];
    const downloads = [];

    // 1. Scrape watch servers
    const serverOptions = $('.server-list li a');
    for (let i = 0; i < serverOptions.length; i++) {
      const el = serverOptions[i];
      const name = $(el).find('.server').text().trim();
      const post = $(el).attr('data-post');
      const nume = $(el).attr('data-nume');
      const type = $(el).attr('data-type');
      const serverSecurity = $(el).attr('data-nonce') || security;

      if (post && nume && type) {
        try {
          const ajaxRes = await axios.post(`${BASE_URL}/wp-admin/admin-ajax.php`, 
            new URLSearchParams({
              action: 'player_ajax',
              security: serverSecurity,
              post: post,
              nume: nume,
              type: type
            }), {
              headers: {
                ...getBypassHeaders(),
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': episodeUrl
              }
            }
          );

          const embedRedirectUrl = ajaxRes.data?.embed_url;
          if (embedRedirectUrl) {
            // Fetch the JWPlayer HTML page to get the raw iframe source (e.g. ok.ru/videoembed/...)
            const jwRes = await axios.get(embedRedirectUrl, {
              headers: {
                ...getBypassHeaders(),
                'Referer': episodeUrl
              }
            });
            const jw$ = cheerio.load(jwRes.data);
            const actualIframeSrc = jw$('iframe').attr('src');
            
            if (actualIframeSrc) {
              servers.push({
                name,
                embedUrl: actualIframeSrc
              });
            } else {
              servers.push({
                name,
                embedUrl: embedRedirectUrl
              });
            }
          }
        } catch (ajaxErr) {
          console.error(`Error resolving server option ${name}:`, ajaxErr.message);
        }
      }
    }

    // 2. Scrape download redirect links
    // Primary method: table listing
    $('table tbody tr[id^="link-"]').each((i, el) => {
      const redirectUrl = $(el).find('td:nth-child(1) a').attr('href');
      const quality = $(el).find('td:nth-child(3)').text().trim();
      
      let serverName = 'Download Server';
      const favicon = $(el).find('td:nth-child(2) div.favicon').attr('data-src') || $(el).find('td:nth-child(2) div.favicon').attr('src');
      if (favicon) {
        const match = favicon.match(/domain=([^&]+)/);
        if (match) serverName = match[1];
      }

      if (redirectUrl) {
        downloads.push({
          quality: quality || 'HD',
          name: serverName,
          url: redirectUrl
        });
      }
    });

    // Fallback: search for "/links/" anchor tags
    if (downloads.length === 0) {
      $('.inside a[href*="/links/"]').each((i, el) => {
        const qualityText = $(el).parent().text().trim();
        const quality = qualityText.includes('1080') || qualityText.includes('FHD') ? 'FHD' :
                        qualityText.includes('720') || qualityText.includes('HD') ? 'HD' :
                        qualityText.includes('480') || qualityText.includes('SD') ? 'SD' : 'HD';
        
        downloads.push({
          quality,
          name: 'Download Link',
          url: $(el).attr('href')
        });
      });
    }

    // Extract direct streaming links from servers as alternative downloads
    for (const srv of servers) {
      if (['mp4upload', 'uqload', 'ok'].some(n => srv.name.toLowerCase().includes(n))) {
        try {
          console.log(`🔌 Extracting direct link from server: ${srv.name}`);
          const directUrl = await extractDirectVideoUrl(srv.name, srv.embedUrl);
          if (directUrl) {
            downloads.push({
              quality: `${srv.name} (مباشر)`,
              name: srv.name,
              url: directUrl
            });
          }
        } catch (e) {
          console.error(`Failed extraction for ${srv.name}:`, e.message);
        }
      }
    }

    return { servers, downloads };
  } catch (error) {
    console.error(`Error scraping episode sources:`, error.message);
    return { servers: [], downloads: [] };
  }
}
