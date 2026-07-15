import { NextResponse } from 'next/server';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'admin_config.json');

function getBypassConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return {
        cfCookie: data.cfCookie || '',
        userAgent: data.userAgent || ''
      };
    }
  } catch (e) {}
  return { cfCookie: '', userAgent: '' };
}

const AD_DOMAINS = [
  'dd133.com', 'llvpn.com', 'acscdn.com', 'jnbhi.com',
  'dc9xwpjprguup.cloudfront.net', 'excavatenearbywand.com',
  'preplaneffie.com', 'eerfumerel.com', 'mdstats.info',
  'exoclick.com', 'trafficjunky.com', 'popads.net',
  'popcash.net', 'adsterra.com', 'propellerads.com',
  'a-ads.com', 'bidvertiser.com', 'hilltopads.net',
  'traffic-media.co', 'adcash.com', 'adskeeper.co.uk',
  'mgid.com', 'outbrain.com', 'taboola.com',
  'ero-advertising.com', 'juicyads.com', 'trafficfactory.biz',
  'plugrush.com', 'pushground.com', 'adspyglass.com',
  'smartadserver.com', 'appnexus.com', 'rubiconproject.com',
  'advertising.com', '2mdn.net', 'servenobid.com',
  'vignette.min.js', 'tag.min.js', 'xads.js',
  'greatdexc', 'aclib.js',
];

const AD_INLINE_PATTERNS = [
  /aclib\.run/i,
  /aclib\.js/i,
  /acscdn\.com/i,
  /popundersPerIP/i,
  /runPop\s*\(/i,
  /adsterra/i,
  /exoclick/i,
  /vignette\.min\.js/i,
  /llvpn\.com/i,
  /dd133\.com/i,
  /jnbhi\.com/i,
  /excavatenearbywand/i,
  /preplaneffie/i,
  /eerfumerel/i,
  /\.dataset\.zone\s*=/i,
];

const TRUSTED_CDNS = [
  'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'code.jquery.com',
  'ssl.p.jwpcdn.com', 'www.gstatic.com', 'static.cloudflareinsights.com',
  'google.com', 'googleapis.com', 'jwpcdn.com',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

function toProxy(url, embedOrigin) {
  if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('#')) return url;

  let absolute = url;
  if (url.startsWith('//')) {
    absolute = 'https:' + url;
  } else if (url.startsWith('/')) {
    absolute = embedOrigin + url;
  } else if (!url.startsWith('http')) {
    absolute = embedOrigin + '/' + url;
  }

  if (TRUSTED_CDNS.some(cdn => absolute.includes(cdn))) return absolute;
  return `/api/proxy-asset?url=${encodeURIComponent(absolute)}`;
}

function cleanHtml(html, embedUrl) {
  const origin = new URL(embedUrl).origin;

  // 1. Remove external ad script tags entirely
  html = html.replace(/<script([^>]*)src=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/script>/gi, (match, pre, src, post) => {
    if (AD_DOMAINS.some(ad => src.includes(ad))) return `<!-- [AdBlock] removed: ${src} -->`;
    return match;
  });
  html = html.replace(/<script([^>]*)src=["']([^"']+)["']([^>]*)\/>/gi, (match, pre, src, post) => {
    if (AD_DOMAINS.some(ad => src.includes(ad))) return `<!-- [AdBlock] removed: ${src} -->`;
    return match;
  });

  // 2. Remove inline ad scripts
  html = html.replace(/<script(?:[^>]*)>([\s\S]*?)<\/script>/gi, (match, content) => {
    if (AD_INLINE_PATTERNS.some(pat => pat.test(content))) return '<!-- [AdBlock] inline ad removed -->';
    return match;
  });

  // 3. Rewrite script src through proxy-asset (fix CORS)
  html = html.replace(/(<script[^>]+src=["'])([^"']+)(["'])/gi, (match, pre, src, quote) => {
    return `${pre}${toProxy(src, origin)}${quote}`;
  });

  // 4. Rewrite link[href] (CSS) through proxy-asset (fix CORS)
  html = html.replace(/(<link\b[^>]+\bhref=["'])([^"']+)(["'][^>]*>)/gi, (match, pre, href, post) => {
    if (match.includes('rel="canonical"') || match.includes('rel="alternate"') || match.includes('rel="manifest"')) return match;
    return `${pre}${toProxy(href, origin)}${post}`;
  });

  // 5. Inject popup blocker
  const adBlockScript = `<script>
(function(){
  window.open=function(u){console.log('[AB] blocked:',u);return null;};
  window.addEventListener('beforeunload',function(e){e.stopImmediatePropagation();});
  document.addEventListener('click',function(e){
    var a=e.target.closest('a[href]');
    if(a&&a.target==='_blank'){
      var d=${JSON.stringify(AD_DOMAINS.slice(0,15))};
      if(d.some(function(x){return(a.href||'').includes(x);})){e.preventDefault();e.stopPropagation();}
    }
  },true);
})();
</script>`;

  html = html.replace('</head>', adBlockScript + '</head>');
  return html;
}

const PROXIES = [
  'http://eepvcuhn:pak11kmxun9g@31.59.20.176:6754',
  'http://eepvcuhn:pak11kmxun9g@31.56.127.193:7684',
  'http://eepvcuhn:pak11kmxun9g@45.38.107.97:6014',
  'http://eepvcuhn:pak11kmxun9g@198.105.121.200:6462',
  'http://eepvcuhn:pak11kmxun9g@64.137.96.74:6641',
  'http://eepvcuhn:pak11kmxun9g@198.23.243.226:6361',
  'http://eepvcuhn:pak11kmxun9g@38.154.185.97:6370',
  'http://eepvcuhn:pak11kmxun9g@84.247.60.125:6095',
  'http://eepvcuhn:pak11kmxun9g@142.111.67.146:5611',
  'http://eepvcuhn:pak11kmxun9g@191.96.254.138:6185'
];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const embedUrl = searchParams.get('url');

    if (!embedUrl || !embedUrl.startsWith('http')) {
      return new NextResponse('Invalid url', { status: 400 });
    }

    let response = null;
    let lastError = null;

    // 1. Try using the admin-configured Cloudflare cookies & userAgent first (Direct connection)
    const bypass = getBypassConfig();
    if (bypass.cfCookie && bypass.userAgent) {
      try {
        response = await axios.get(embedUrl, {
          headers: {
            ...HEADERS,
            'User-Agent': bypass.userAgent,
            'Cookie': bypass.cfCookie,
            'Referer': new URL(embedUrl).origin + '/'
          },
          timeout: 10000,
          responseType: 'text'
        });
      } catch (err) {
        lastError = err;
        console.warn('Configured Cloudflare bypass direct request failed:', err.message);
      }
    }

    // 2. If direct direct request failed or not configured, try with proxies and bypass cookies
    if (!response) {
      // Shuffle and try up to 3 random proxies using HttpsProxyAgent
      const shuffledProxies = [...PROXIES].sort(() => 0.5 - Math.random());
      const maxAttempts = Math.min(3, shuffledProxies.length);

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const proxyUrl = shuffledProxies[attempt];
        try {
          const agent = new HttpsProxyAgent(proxyUrl);
          
          const requestHeaders = {
            ...HEADERS,
            'Referer': new URL(embedUrl).origin + '/'
          };
          if (bypass.cfCookie && bypass.userAgent) {
            requestHeaders['Cookie'] = bypass.cfCookie;
            requestHeaders['User-Agent'] = bypass.userAgent;
          }

          response = await axios.get(embedUrl, {
            headers: requestHeaders,
            timeout: 10000,
            responseType: 'text',
            httpsAgent: agent,
            proxy: false // Tell Axios not to use its built-in proxy config
          });

          if (response && response.status === 200) {
            break;
          }
        } catch (err) {
          lastError = err;
          console.error(`Proxy embed attempt ${attempt + 1} failed:`, err.message);
        }
      }
    }

    // 3. Ultimate fallback: direct connection
    if (!response) {
      try {
        const requestHeaders = {
          ...HEADERS,
          'Referer': new URL(embedUrl).origin + '/'
        };
        if (bypass.cfCookie && bypass.userAgent) {
          requestHeaders['Cookie'] = bypass.cfCookie;
          requestHeaders['User-Agent'] = bypass.userAgent;
        }
        response = await axios.get(embedUrl, {
          headers: requestHeaders,
          timeout: 8000,
          responseType: 'text'
        });
      } catch (err) {
        throw lastError || err;
      }
    }

    const cleaned = cleanHtml(response.data, embedUrl);

    return new NextResponse(cleaned, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Proxy embed error:', err.message);
    return new NextResponse(
      `<html><body style="background:#000;color:#fff;text-align:center;padding:40px;font-family:sans-serif;"><p>⚠️ تعذر تحميل السيرفر<br><small>${err.message}</small></p></body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
