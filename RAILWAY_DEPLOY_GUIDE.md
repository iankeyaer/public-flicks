# ChatGPT Prompt: Deploy Stream Extractor on Railway.app

Copy everything below this line and paste it into ChatGPT:

---

I need you to guide me step-by-step (with screenshots descriptions) to deploy a Node.js server on Railway.app. I know NOTHING about coding or deployment. Treat me like a complete beginner. Ask me to confirm each step before moving to the next.

## What I'm deploying

A Node.js/Express server that uses Puppeteer (headless Chrome) to extract streaming URLs. Here are the files I need:

### File 1: `server.js`

```javascript
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.VPS_API_KEY || 'change-me-to-a-strong-secret';

function authMiddleware(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

const PROVIDERS = [
  {
    name: 'VidSrc.to',
    quality: 'HD',
    movieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    tvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'Vidnest',
    quality: 'HD',
    movieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    tvUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'Embed.su',
    quality: '1080p',
    movieUrl: (id) => `https://embed.su/embed/movie/${id}`,
    tvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: '2Embed',
    quality: 'HD',
    movieUrl: (id) => `https://www.2embed.cc/embed/movie?tmdb=${id}`,
    tvUrl: (id, s, e) => `https://www.2embed.cc/embed/tv?tmdb=${id}&s=${s}&e=${e}`,
  },
  {
    name: 'Vidzee',
    quality: '1080p',
    movieUrl: (id) => `https://vidsrc.xyz/embed/movie/${id}`,
    tvUrl: (id, s, e) => `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'VidRock',
    quality: 'HD',
    movieUrl: (id) => `https://vidsrc.icu/embed/movie/${id}`,
    tvUrl: (id, s, e) => `https://vidsrc.icu/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'RiveEmbed',
    quality: '1080p',
    movieUrl: (id) => `https://rivestream.org/embed?type=movie&id=${id}`,
    tvUrl: (id, s, e) => `https://rivestream.org/embed?type=tv&id=${id}&s=${s}&e=${e}`,
  },
  {
    name: 'VidFast',
    quality: 'HD',
    movieUrl: (id) => `https://vidfast.pro/movie/${id}`,
    tvUrl: (id, s, e) => `https://vidfast.pro/tv/${id}/${s}/${e}`,
  },
  {
    name: 'VidLink',
    quality: 'HD',
    movieUrl: (id) => `https://vidlink.pro/movie/${id}`,
    tvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
  },
  {
    name: 'AutoEmbed',
    quality: 'HD',
    movieUrl: (id) => `https://autoembed.co/movie/tmdb/${id}`,
    tvUrl: (id, s, e) => `https://autoembed.co/tv/tmdb/${id}/${s}/${e}`,
  },
];

async function extractM3U8(browser, url, timeoutMs = 20000) {
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
    if (resUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('x-mpegURL')) {
      m3u8Urls.push(resUrl);
    }
    if ((resUrl.includes('.mp4') && !resUrl.includes('.mp4?')) || contentType.includes('video/mp4')) {
      const contentLength = res.headers()['content-length'];
      if (!contentLength || parseInt(contentLength) > 500000) {
        mp4Urls.push(resUrl);
      }
    }
  });

  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await Promise.race([
      page.waitForNetworkIdle({ idleTime: 3000, timeout: timeoutMs }),
      new Promise((r) => setTimeout(r, timeoutMs)),
    ]);
    try {
      await page.evaluate(() => {
        const btns = document.querySelectorAll('button, .play-button, [class*="play"], [id*="play"], .btn');
        for (const btn of btns) {
          const text = btn.textContent?.toLowerCase() || '';
          if (text.includes('play') || btn.className.toLowerCase().includes('play')) {
            btn.click();
            break;
          }
        }
      });
      await new Promise((r) => setTimeout(r, 5000));
    } catch {}
  } catch (err) {
    console.log(`Navigation error for ${url}: ${err.message}`);
  } finally {
    await page.close();
  }
  return { m3u8: m3u8Urls, mp4: mp4Urls };
}

app.post('/extract', authMiddleware, async (req, res) => {
  const { tmdbId, type = 'movie', season = 1, episode = 1 } = req.body;
  if (!tmdbId) {
    return res.status(400).json({ success: false, error: 'tmdbId is required' });
  }
  const mediaType = type === 'tv' ? 'tv' : 'movie';
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-first-run', '--no-zygote', '--single-process'],
    });
    console.log(`Extracting streams for ${mediaType} ${tmdbId}`);
    const results = [];
    for (let i = 0; i < PROVIDERS.length; i += 3) {
      const batch = PROVIDERS.slice(i, i + 3);
      const batchResults = await Promise.allSettled(
        batch.map(async (provider) => {
          const url = mediaType === 'movie' ? provider.movieUrl(tmdbId) : provider.tvUrl(tmdbId, season, episode);
          console.log(`  Trying ${provider.name}: ${url}`);
          const extracted = await extractM3U8(browser, url);
          if (extracted.m3u8.length > 0 || extracted.mp4.length > 0) {
            return {
              name: provider.name,
              quality: provider.quality,
              url: extracted.m3u8[0] || extracted.mp4[0],
              type: extracted.m3u8.length > 0 ? 'hls' : 'mp4',
            };
          }
          return null;
        })
      );
      for (const r of batchResults) {
        if (r.status === 'fulfilled' && r.value) {
          results.push(r.value);
        }
      }
      if (results.length >= 2) break;
    }
    console.log(`Found ${results.length} working sources`);
    return res.json({ success: true, sources: results });
  } catch (err) {
    console.error('Extraction error:', err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Stream extractor running on port ${PORT}`);
});
```

### File 2: `package.json`

```json
{
  "name": "stream-extractor",
  "version": "1.0.0",
  "description": "Stream URL extractor using Puppeteer",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "puppeteer": "^23.0.0",
    "cors": "^2.8.5"
  }
}
```

### File 3: `Dockerfile`

```dockerfile
FROM ghcr.io/puppeteer/puppeteer:23.0.0

WORKDIR /app

COPY package.json .
RUN npm install

COPY server.js .

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

CMD ["node", "server.js"]
```

## What I need you to help me do (step by step):

1. **Create a GitHub account** (if I don't have one) at github.com
2. **Create a new repository** on GitHub called `stream-extractor`
3. **Upload the 3 files above** (server.js, package.json, Dockerfile) to that repository
4. **Create a Railway account** at railway.app (sign up with my GitHub account)
5. **Create a new project** on Railway and connect it to my `stream-extractor` GitHub repository
6. **Add environment variables** on Railway:
   - `VPS_API_KEY` = (generate a random strong key for me)
   - `PORT` = `3001`
7. **Deploy** the project
8. **Get the public URL** that Railway gives me after deployment
9. **Test** by telling me how to check if it's working (visiting the /health endpoint)

## IMPORTANT NOTES:
- Railway uses Docker, so the Dockerfile is critical — make sure it's included
- Puppeteer needs Chromium, which is why we use the `ghcr.io/puppeteer/puppeteer` Docker image
- The free trial gives $5 credit. After that it costs ~$5/month
- After deployment, I need TWO things to bring back to my app:
  1. The **Railway public URL** (looks like `https://something.up.railway.app`)
  2. The **VPS_API_KEY** I set in the environment variables

Walk me through each step one at a time. Wait for me to confirm before moving to the next step. Use simple language — I'm not a developer.
