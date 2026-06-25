/*
 * Admin Panel — REVAMP Proxy
 *
 * Differences vs the production admin-panel proxy:
 *   1. Injects X-Api-Key into every /api/* request server-side. The API
 *      key never reaches the browser — safer than baking it into static
 *      JS that anyone with devtools can read.
 *   2. Target host + API key + image host all come from environment
 *      variables so the same binary runs against staging (202) and
 *      production (whatever the prod IP is) without code edits.
 *   3. Defaults target staging 166.1.227.202:7011.
 *
 * Env vars:
 *   PORT         default 3000
 *   API_HOST     default https://166.1.227.202:7011
 *   API_KEY      REQUIRED — the Security:OtpApiKey on the target server
 *   IMAGE_HOST   default http://166.1.227.102
 *
 * Run:
 *   API_HOST='https://166.1.227.202:7011' \
 *   API_KEY='<your staging OtpApiKey>' \
 *   npm start
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

const PORT       = process.env.PORT || 3000;
const API_HOST   = process.env.API_HOST   || 'https://166.1.227.202:7011';
const API_KEY    = process.env.API_KEY    || '';
const IMAGE_HOST = process.env.IMAGE_HOST || 'http://166.1.227.102';

if (!API_KEY) {
  console.warn('[REVAMP] API_KEY env var is not set — /api/* calls that');
  console.warn('         require X-Api-Key (login, register, OTP, Cart,');
  console.warn('         DiscountCode, ImageUpload) will get 401.');
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
// Image proxy (uploads CDN) — env-driven
// ============================================================

app.use('/uploads', createProxyMiddleware({
  target: IMAGE_HOST,
  changeOrigin: true,
  secure: false,
  logLevel: 'debug',
  onProxyReq: (_proxyReq, req) => {
    console.log('Proxying Image:', req.method, req.url, '->', IMAGE_HOST + req.url);
  }
}));

// ============================================================
// API proxy — injects X-Api-Key on every forwarded request
// ============================================================

const injectApiKey = (proxyReq, req) => {
  if (API_KEY) {
    proxyReq.setHeader('X-Api-Key', API_KEY);
  }
  console.log('Proxying:', req.method, req.url, '->', API_HOST + req.url);
};

// Special handlers kept from production for behavior parity. All three
// fall through to the same target after rewriting.
app.put('/api/Cart/update-status', createProxyMiddleware({
  target: API_HOST,
  changeOrigin: true,
  secure: false,
  logLevel: 'debug',
  onProxyReq: injectApiKey
}));

app.use('/api/Product/filter-by-category', createProxyMiddleware({
  target: API_HOST,
  changeOrigin: true,
  secure: false,
  logLevel: 'debug',
  onProxyReq: injectApiKey
}));

app.use('/api', createProxyMiddleware({
  target: API_HOST + '/api',
  changeOrigin: true,
  secure: false,
  cookieDomainRewrite: { '*': 'localhost' },
  logLevel: 'debug',
  pathRewrite: { '^/api': '' },
  onProxyReq: injectApiKey
}));

app.listen(PORT, () => {
  console.log(`Admin proxy (REVAMP) running: http://localhost:${PORT}`);
  console.log(`  API target: ${API_HOST}`);
  console.log(`  X-Api-Key:  ${API_KEY ? '(configured)' : '(MISSING — set API_KEY env var)'}`);
});
