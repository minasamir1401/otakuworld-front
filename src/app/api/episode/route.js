import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { scrapeEpisodeSources, resolveDownloadLink, extractDirectVideoUrl } from '@/lib/scraper';

// In-memory cache for resolved direct video URLs to prevent slow external HTTP queries on every request
const directUrlCache = new Map();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('id');
    const downloadRedirectUrl = searchParams.get('resolve_download');

    // 1. Resolve a specific download redirect link
    if (downloadRedirectUrl) {
      const directDownloadLink = await resolveDownloadLink(downloadRedirectUrl);
      if (directDownloadLink) {
        return NextResponse.json({ success: true, url: directDownloadLink });
      }
      return NextResponse.json({ success: false, error: 'Failed to resolve download link' }, { status: 400 });
    }

    if (!episodeId) {
      return NextResponse.json({ success: false, error: 'Missing episode ID' }, { status: 400 });
    }

    // 2. Fetch episode details
    let episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        servers: true,
        downloads: true,
        season: {
          include: {
            anime: true,
            episodes: {
              orderBy: { number: 'asc' }
            }
          }
        }
      }
    });

    if (!episode) {
      return NextResponse.json({ success: false, error: 'Episode not found' }, { status: 404 });
    }

    // Check if the current servers are expired (using 'exp' parameter in the URL)
    let hasExpiredServers = false;
    if (episode.servers.length > 0) {
      const firstServerUrl = episode.servers[0].embedUrl;
      try {
        const urlObj = new URL(firstServerUrl);
        const exp = urlObj.searchParams.get('exp');
        if (exp) {
          const expTimestamp = parseInt(exp, 10);
          const currentTimestamp = Math.floor(Date.now() / 1000);
          if (currentTimestamp > expTimestamp) {
            console.log(`⏰ Found expired server links (exp: ${expTimestamp}, current: ${currentTimestamp}). Will re-scrape.`);
            hasExpiredServers = true;
          }
        }
      } catch (e) {}
    }

    // 3. On-demand scraping: If servers or downloads are empty OR expired, scrape them now!
    if (episode.servers.length === 0 || episode.downloads.length === 0 || hasExpiredServers) {
      console.log(`📡 On-demand scraping sources for: ${episode.title}`);
      const { servers, downloads } = await scrapeEpisodeSources(episode.url);

      // Clean old records first to prevent duplicates
      await prisma.videoServer.deleteMany({ where: { episodeId: episode.id } });
      await prisma.downloadLink.deleteMany({ where: { episodeId: episode.id } });

      // Save watch servers to database
      if (servers.length > 0) {
        await prisma.videoServer.createMany({
          data: servers.map(srv => ({
            name: srv.name,
            embedUrl: srv.embedUrl,
            episodeId: episode.id
          }))
        });
      }

      // Save download redirect links to database
      if (downloads.length > 0) {
        await prisma.downloadLink.createMany({
          data: downloads.map(dl => ({
            quality: dl.quality,
            url: dl.url,
            episodeId: episode.id
          }))
        });
      }

      // Refetch the episode with newly scraped details
      episode = await prisma.episode.findUnique({
        where: { id: episodeId },
        include: {
          servers: true,
          downloads: true,
          season: {
            include: {
              anime: true,
              episodes: {
                orderBy: { number: 'asc' }
              }
            }
          }
        }
      });
    }

    // 4. On-demand extraction: If servers exist but downloads are empty, extract them now (Parallelized)
    if (episode.servers.length > 0 && episode.downloads.length === 0) {
      console.log(`🔌 On-demand extracting direct download links from existing servers for: ${episode.title}`);
      
      const extractionPromises = episode.servers.map(async (srv) => {
        if (['mp4upload', 'uqload', 'ok'].some(n => srv.name.toLowerCase().includes(n))) {
          try {
            let directUrl = null;
            const cached = directUrlCache.get(srv.embedUrl);
            if (cached && cached.expiresAt > Date.now()) {
              directUrl = cached.url;
            } else {
              directUrl = await extractDirectVideoUrl(srv.name, srv.embedUrl);
              if (directUrl) {
                directUrlCache.set(srv.embedUrl, {
                  url: directUrl,
                  expiresAt: Date.now() + 2 * 60 * 60 * 1000 // Cache for 2 hours
                });
              }
            }
            if (directUrl) {
              return {
                quality: `${srv.name} (مباشر)`,
                url: directUrl,
                episodeId: episode.id
              };
            }
          } catch (err) {
            console.error(`On-demand extraction failed for server ${srv.name}:`, err.message);
          }
        }
        return null;
      });

      const extractedResults = await Promise.all(extractionPromises);
      const extractedDownloads = extractedResults.filter(Boolean);

      if (extractedDownloads.length > 0) {
        await prisma.downloadLink.createMany({
          data: extractedDownloads
        });

        // Refetch the episode with new downloads
        episode = await prisma.episode.findUnique({
          where: { id: episodeId },
          include: {
            servers: true,
            downloads: true,
            season: {
              include: {
                anime: true,
                episodes: {
                  orderBy: { number: 'asc' }
                }
              }
            }
          }
        });
      }
    }

    if (episode && episode.season && episode.season.episodes) {
      episode.season.episodes = [...episode.season.episodes].sort((a, b) => {
        const numA = parseFloat(a.number) || 0;
        const numB = parseFloat(b.number) || 0;
        return numA - numB;
      });
    }

    // 5. Dynamic direct video link extraction for ad-free native player (Parallelized + Cached)
    const isAkwam = episode.url && episode.url.includes('akwam');
    if (isAkwam && episode && episode.servers && episode.servers.length > 0) {
      const promises = episode.servers.map(async (srv) => {
        let directUrl = null;
        if (
          ['mp4upload', 'uqload', 'ok', 'streamruby', 'stmruby', 'سيرفر 1'].some(n => 
            srv.name.toLowerCase().includes(n) || srv.embedUrl.toLowerCase().includes(n)
          )
        ) {
          try {
            const cached = directUrlCache.get(srv.embedUrl);
            if (cached && cached.expiresAt > Date.now()) {
              directUrl = cached.url;
            } else {
              directUrl = await extractDirectVideoUrl(srv.name, srv.embedUrl);
              if (directUrl) {
                directUrlCache.set(srv.embedUrl, {
                  url: directUrl,
                  expiresAt: Date.now() + 2 * 60 * 60 * 1000 // Cache for 2 hours
                });
              }
            }
          } catch (err) {
            console.error(`Failed to extract direct url for ${srv.name}:`, err.message);
          }
        }
        return {
          ...srv,
          directUrl
        };
      });
      
      episode.servers = await Promise.all(promises);
    }

    return NextResponse.json({ success: true, episode });
  } catch (error) {
    console.error('API Error /api/episode:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
