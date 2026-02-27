# Stream Extractor VPS Server

Headless browser service that extracts direct m3u8/mp4 stream URLs from embed providers.

## Quick Deploy (Ubuntu/Debian VPS)

```bash
# 1. SSH into your VPS
ssh root@your-vps-ip

# 2. Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install Chromium dependencies
sudo apt-get install -y chromium-browser

# 4. Upload this folder to your VPS (or git clone)
# scp -r vps-extractor/ root@your-vps-ip:/opt/stream-extractor/

# 5. Install dependencies
cd /opt/stream-extractor
npm install

# 6. Set environment variables
export VPS_API_KEY="your-strong-secret-key-here"
export PORT=3001

# 7. Run with PM2 (recommended for production)
npm install -g pm2
pm2 start server.js --name stream-extractor
pm2 save
pm2 startup

# 8. (Optional) Set up nginx reverse proxy with SSL
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `VPS_API_KEY` | API key for auth | `change-me-to-a-strong-secret` |

## API

### POST /extract

```json
{
  "tmdbId": 550,
  "type": "movie",
  "season": 1,
  "episode": 1
}
```

**Headers:** `x-api-key: your-api-key`

**Response:**
```json
{
  "success": true,
  "sources": [
    {
      "name": "VidSrc.to",
      "quality": "HD",
      "url": "https://example.com/stream.m3u8",
      "type": "hls"
    }
  ]
}
```

### GET /health
Returns server status.

## Recommended VPS Providers
- **Hetzner** CX22: €4.35/mo (2 vCPU, 4GB RAM) — best value
- **DigitalOcean** Basic: $6/mo (1 vCPU, 1GB RAM)
- **Vultr** Cloud: $6/mo (1 vCPU, 1GB RAM)

Puppeteer needs at least 1GB RAM. 2GB+ recommended.
