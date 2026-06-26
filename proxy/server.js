/*
 * Admin Panel — REVAMP Proxy
 *
 * Differences vs the production admin-panel proxy:
 *   1. Injects X-Api-Key into every /api/* request server-side. The API
 *      key never reaches the browser — safer than baking it into static
 *      JS that anyone with devtools can read.
 *   2. Config layered, in priority order:
 *        a. proxy/config.json (gitignored — has real secrets)
 *        b. env vars (PORT, API_HOST, API_KEY, IMAGE_HOST)
 *        c. defaults (staging 202)
 *      config.json wins when present. Env vars override individual fields
 *      from config.json. So you can ship a checked-in config.json with the
 *      staging values and override API_KEY via env on the prod box without
 *      touching the file.
 *   3. config.json supports multiple environment profiles selected by the
 *      "active" field — flip "active": "staging" → "production" to swap
 *      target host + key without editing code.
 *
 * Run:
 *   # Option A: config.json drives it
 *   cp config.example.json config.json
 *   # edit config.json — set the staging API_KEY
 *   npm start
 *
 *   # Option B: env vars only
 *   API_KEY='...' npm start
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs   = require('fs');

const app = express();

// ============================================================
// Config resolution — config.json > env > defaults
// ============================================================

function loadConfig() {
  const defaults = {
    PORT:       3000,
    API_HOST:   'https://166.1.227.202:7011',
    API_KEY:    '',
    IMAGE_HOST: 'http://166.1.227.102',
    ACTIVE:     'env',   // marker; replaced if config.json loads
  };

  // Layer 1: config.json
  let fromFile = {};
  const configPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const active = parsed.active || 'staging';
      const profile = parsed.profiles && parsed.profiles[active];
      if (profile) {
        fromFile = {
          API_HOST:   profile.API_HOST,
          API_KEY:    profile.API_KEY,
          IMAGE_HOST: profile.IMAGE_HOST,
          ACTIVE:     active,
        };
        console.log('[CONFIG] Loaded proxy/config.json — active profile:', active);
      } else {
        console.warn('[CONFIG] config.json has no profile for active="' + active + '"');
      }
    } catch (e) {
      console.error('[CONFIG] Failed to parse proxy/config.json:', e.message);
    }
  } else {
    console.log('[CONFIG] proxy/config.json not found — using env + defaults');
  }

  // Layer 2: env vars override individual fields
  return {
    PORT:       process.env.PORT       || fromFile.PORT       || defaults.PORT,
    API_HOST:   process.env.API_HOST   || fromFile.API_HOST   || defaults.API_HOST,
    API_KEY:    process.env.API_KEY    || fromFile.API_KEY    || defaults.API_KEY,
    IMAGE_HOST: process.env.IMAGE_HOST || fromFile.IMAGE_HOST || defaults.IMAGE_HOST,
    ACTIVE:     fromFile.ACTIVE        || (process.env.API_HOST ? 'env-override' : 'defaults'),
  };
}

const cfg = loadConfig();

if (!cfg.API_KEY) {
  console.warn('[REVAMP] API_KEY not set — /api/* calls that require');
  console.warn('         X-Api-Key (login, register, OTP, Cart, DiscountCode,');
  console.warn('         ImageUpload) will get 401.');
}

// ============================================================
// CORS — unchanged from production
// ============================================================

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] || 'Content-Type, Authorization'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    req.headers['access-control-request-method'] || 'GET,POST,PUT,DELETE,OPTIONS'
  );
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ============================================================
// Static assets
// ============================================================

const staticPath = path.join(__dirname, '..');
app.use(express.static(staticPath));

// ============================================================
// Image proxy (uploads CDN)
// ============================================================

app.use('/uploads', createProxyMiddleware({
  target: cfg.IMAGE_HOST,
  changeOrigin: true,
  secure: false,
  logLevel: 'debug',
  onProxyReq: (_proxyReq, req) => {
    console.log('Proxying Image:', req.method, req.url, '->', cfg.IMAGE_HOST + req.url);
  }
}));

// ============================================================
// API proxy — injects X-Api-Key on every forwarded request
// ============================================================

const injectApiKey = (proxyReq, req) => {
  if (cfg.API_KEY) {
    proxyReq.setHeader('X-Api-Key', cfg.API_KEY);
  }
  // req.originalUrl preserves the full '/api/...' path the browser sent.
  // req.url is mount-stripped by Express, which made earlier log lines
  // confusing.
  console.log('Proxying:', req.method, req.originalUrl,
              '->', cfg.API_HOST + req.originalUrl);
};

// Special handlers kept from production for behavior parity. All three
// fall through to the same target after rewriting.
app.put('/api/Cart/update-status', createProxyMiddleware({
  target: cfg.API_HOST,
  changeOrigin: true,
  secure: false,
  logLevel: 'debug',
  onProxyReq: injectApiKey
}));

app.use('/api/Product/filter-by-category', createProxyMiddleware({
  target: cfg.API_HOST,
  changeOrigin: true,
  secure: false,
  logLevel: 'debug',
  onProxyReq: injectApiKey
}));

// Why target + '/api' AND pathRewrite '^/api -> '':
//   When you mount middleware at app.use('/api', ...), Express strips
//   the '/api' prefix from req.url before the middleware runs. So a
//   browser request to '/api/User/login' becomes '/User/login' inside
//   this handler. Without compensating, the URL forwarded to the backend
//   would be 'https://host:7011/User/login' — missing /api, which the
//   .NET routing won't match. We restore the prefix by baking it into
//   the target. The defensive pathRewrite makes the intent explicit
//   even on http-proxy-middleware versions where mount-stripping behaves
//   differently.
app.use('/api', createProxyMiddleware({
  target: cfg.API_HOST + '/api',
  changeOrigin: true,
  secure: false,
  cookieDomainRewrite: { '*': 'localhost' },
  logLevel: 'debug',
  pathRewrite: { '^/api': '' },
  onProxyReq: injectApiKey
}));

app.listen(cfg.PORT, () => {
  console.log(`Admin proxy (REVAMP) running: http://localhost:${cfg.PORT}`);
  console.log(`  Profile:    ${cfg.ACTIVE}`);
  console.log(`  API target: ${cfg.API_HOST}`);
  console.log(`  Image CDN:  ${cfg.IMAGE_HOST}`);
  console.log(`  X-Api-Key:  ${cfg.API_KEY ? '(configured)' : '(MISSING — set API_KEY in config.json or env)'}`);
});
