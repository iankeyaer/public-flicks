const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.VPS_API_KEY || 'change-me-to-a-strong-secret';

// ── Auth middleware ──
function authMiddleware(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

// ── Extract m3u8/mp4 from a page URL ──
async function extractStreams(browser, url, timeoutMs = 30000) {
  const page = await browser.newPage();

  await page.setRequestInterception(true);
  const m3u8Urls = [];
  const mp4Urls = [];

  page.on('request', (req) => {
    const type = req.resourceType();
    if (['image', 'font', 'stylesheet'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  page.on('response', (res) => {
    const resUrl = res.url();
    const contentType = res.headers()['content-type'] || '';

    if (
      resUrl.includes('.m3u8') ||
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegURL')
    ) {
      m3u8Urls.push(resUrl);
    }

    if (
      (resUrl.includes('.mp4') && !resUrl.includes('.mp4?')) ||
      contentType.includes('video/mp4')
    ) {
      const contentLength = res.headers()['content-length'];
      if (!contentLength || parseInt(contentLength) > 500000) {
        mp4Urls.push(resUrl);
      }
    }
  });

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    console.log(`  Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    // Wait for network activity to settle
    await Promise.race([
      page.waitForNetworkIdle({ idleTime: 3000, timeout: timeoutMs }),
      new Promise((r) => setTimeout(r, timeoutMs)),
    ]);

    // Try clicking play buttons if present
    try {
      await page.evaluate(() => {
        const btns = document.querySelectorAll(
          'button, .play-button, [class*="play"], [id*="play"], .btn'
        );
        for (const btn of btns) {
          const text = btn.textContent?.toLowerCase() || '';
          if (text.includes('play') || btn.className.toLowerCase().includes('play')) {
            btn.click();
            break;
          }
        }
      });
      await new Promise((r) => setTimeout(r, 5000));
    } catch {
      // No play button found
    }

    // Also try clicking on iframes to find embedded players
    try {
      const iframeSrcs = await page.evaluate(() => {
        const iframes = document.querySelectorAll('iframe');
        return Array.from(iframes).map(f => f.src).filter(s => s && s.startsWith('http'));
      });
      
      for (const iframeSrc of iframeSrcs) {
        console.log(`  Found iframe: ${iframeSrc}`);
        try {
          const iframePage = await browser.newPage();
          await iframePage.setRequestInterception(true);
          
          iframePage.on('request', (req) => {
            const type = req.resourceType();
            if (['image', 'font', 'stylesheet'].includes(type)) {
              req.abort();
            } else {
              req.continue();
            }
          });

          iframePage.on('response', (res) => {
            const resUrl = res.url();
            const ct = res.headers()['content-type'] || '';
            if (resUrl.includes('.m3u8') || ct.includes('mpegurl') || ct.includes('x-mpegURL')) {
              m3u8Urls.push(resUrl);
            }
            if ((resUrl.includes('.mp4') && !resUrl.includes('.mp4?')) || ct.includes('video/mp4')) {
              const cl = res.headers()['content-length'];
              if (!cl || parseInt(cl) > 500000) {
                mp4Urls.push(resUrl);
              }
            }
          });

          await iframePage.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          );
          await iframePage.goto(iframeSrc, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await Promise.race([
            iframePage.waitForNetworkIdle({ idleTime: 2000, timeout: 10000 }),
            new Promise((r) => setTimeout(r, 10000)),
          ]);
          await iframePage.close();
        } catch (err) {
          console.log(`  Iframe extraction error: ${err.message}`);
        }
      }
    } catch {
      // iframe extraction failed
    }
  } catch (err) {
    console.log(`Navigation error for ${url}: ${err.message}`);
  } finally {
    await page.close();
  }

  return { m3u8: m3u8Urls, mp4: mp4Urls };
}

// ── Main extraction endpoint ──
app.post('/extract', authMiddleware, async (req, res) => {
  const { watchUrl, tmdbId, type = 'movie', season = 1, episode = 1 } = req.body;

  // Use watchUrl from edge function (preferred) or build from tmdbId
  let targetUrl = watchUrl;
  if (!targetUrl && tmdbId) {
    targetUrl = type === 'tv'
      ? `https://yflix.to/tv/${tmdbId}/${season}/${episode}`
      : `https://yflix.to/movie/${tmdbId}`;
  }

  if (!targetUrl) {
    return res.status(400).json({ success: false, error: 'watchUrl or tmdbId is required' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ],
    });

    console.log(`Extracting streams from: ${targetUrl}`);
    const extracted = await extractStreams(browser, targetUrl);

    const sources = [];
    if (extracted.m3u8.length > 0) {
      sources.push({
        name: 'YFlix',
        quality: '1080p',
        url: extracted.m3u8[0],
        type: 'hls',
      });
    } else if (extracted.mp4.length > 0) {
      sources.push({
        name: 'YFlix',
        quality: '1080p',
        url: extracted.mp4[0],
        type: 'mp4',
      });
    }

    console.log(`Found ${sources.length} sources (m3u8: ${extracted.m3u8.length}, mp4: ${extracted.mp4.length})`);

    return res.json({ success: true, sources });
  } catch (err) {
    console.error('Extraction error:', err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Stream extractor running on port ${PORT}`);
  console.log(`API key: ${API_KEY.slice(0, 4)}...`);
});
