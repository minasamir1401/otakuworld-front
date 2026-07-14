import { NextResponse } from 'next/server';
import axios from 'axios';

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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const embedUrl = searchParams.get('url');

    if (!embedUrl || !embedUrl.startsWith('http')) {
      return new NextResponse('Invalid url', { status: 400 });
    }

    const response = await axios.get(embedUrl, {
      headers: { ...HEADERS, 'Referer': new URL(embedUrl).origin + '/' },
      timeout: 12000,
      responseType: 'text',
    });

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
