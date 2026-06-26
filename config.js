/**
 * GenSkin Admin Panel — Runtime Configuration
 *
 * SINGLE source of truth for browser-side config. Edit ENV below to switch
 * between environments. PROFILES holds the env-specific values
 * (API_BASE / LABEL). Everything else (UPLOAD_BASE, PAGE_SIZE, CHIP_VARIANTS)
 * doesn't vary per env and lives at the bottom.
 *
 * The API KEY does NOT live here — it stays proxy-side
 * (proxy/config.json) so the browser can't read it via devtools.
 *
 * Load order in index.html: this file MUST come before js/api.js and js/app.js.
 */

(function () {
  'use strict';

  // ============== EDIT THIS to switch environments ==============
  const ENV = 'staging';
  // ==============================================================
  // Valid values: 'staging' | 'production' | 'direct-staging' |
  //               'direct-production' | 'local'

  const PROFILES = {
    // Via local Node proxy (npm start in /proxy). Default.
    // The proxy forwards to whatever API_HOST its config.json points at,
    // and injects X-Api-Key on every forwarded request.
    staging: {
      API_BASE: '/api',
      LABEL:    'STAGING (via proxy)'
    },
    production: {
      API_BASE: '/api',
      LABEL:    'PRODUCTION (via proxy)'
    },

    // Direct-call escape hatch — bypasses the Node proxy. Login / OTP /
    // Cart / DiscountCode / ImageUpload endpoints WILL 401 because there's
    // no X-Api-Key being injected. Useful only for read-side debugging.
    'direct-staging': {
      API_BASE: 'https://166.1.227.202:7011/api',
      LABEL:    'STAGING DIRECT (no proxy — login endpoints will 401)'
    },
    'direct-production': {
      API_BASE: 'https://166.1.227.102:7011/api',
      LABEL:    'PROD DIRECT (no proxy — login endpoints will 401)'
    },

    // Same-host dev override — use when serving from a separate web server.
    local: {
      API_BASE: 'http://localhost:3000/api',
      LABEL:    'LOCAL DEV (proxy on 3000)'
    }
  };

  const profile = PROFILES[ENV] || PROFILES.staging;

  if (!PROFILES[ENV]) {
    console.error('[CONFIG] Unknown ENV "' + ENV + '". Falling back to staging. ' +
                  'Valid: ' + Object.keys(PROFILES).join(', '));
  }

  window.APP_CONFIG = {
    // ----- Environment (driven by ENV) -----
    ENV:      ENV,
    API_BASE: profile.API_BASE,
    LABEL:    profile.LABEL,
    PROFILES: PROFILES,

    // ----- Images / Uploads -----
    // Absolute base URL for images stored on the upload server.
    // Used when building full image URLs sent back to the API.
    UPLOAD_BASE: 'http://166.1.227.102/uploads',

    // ----- UI / Behaviour -----
    PAGE_SIZE:    10,
    DEFAULT_TIME: 'AM',

    // ----- Chip / badge colour mapping (input id → variant name) -----
    CHIP_VARIANTS: {
      'product-category':       'gray',
      'product-test-category':  'gray',
      'product-gender':         'blue',
      'product-test-gender':    'blue',
      'product-skin-type':      'orange',
      'product-test-skin-type': 'orange',
      'product-time':           'yellow',
      'product-test-time':      'yellow',
      'product-type':           'blue',
      'product-test-type':      'blue',
      'product-drugstore':      'blue',
      'product-test-drugstore': 'blue'
    }
  };

  console.log('[CONFIG] Active environment:', window.APP_CONFIG.LABEL,
              '— API_BASE =', window.APP_CONFIG.API_BASE);
})();
