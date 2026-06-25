/*
 * Admin Panel API Client — REVAMP edition
 *
 * Adapted to the Phase 5 / Phase 6 backend contract:
 *   * X-Api-Key is injected by the Node proxy (proxy/server.js), so this
 *     file never sees the key. Login / register / OTP / Cart / DiscountCode
 *     / ImageUpload all work transparently.
 *   * Login response shape changed from bare-user to:
 *       { user, accessToken, expiresAtUtc, refreshToken, refreshExpiresAtUtc }
 *     auth.login returns the whole envelope; auth.js stores the access
 *     token + refresh token + expiry.
 *   * New refresh flow: auth.refresh() rotates a refresh token into a
 *     fresh pair. Single-use; on second presentation the entire chain
 *     gets revoked server-side (R6.4).
 *   * New admin dashboards: api.audit.* over genskin_audit and
 *     api.heatmap.* over genskin_heatmap.
 *   * users.create now points at POST /User/create (was POST /User).
 *   * Cart analytics endpoint renamed:
 *       /Cart/orders/status          (legacy staff-only by-status query)
 *       /Cart/orders/analytics/status (admin analytics — what we want here)
 *
 * Known gap flagged inline: PUT /User/{id} no longer exists on the revamp
 * backend (the existing endpoint updates the CALLER's profile only). The
 * admin's "edit any user" use-case needs a new backend endpoint
 * (Phase 7?). Verification flip still works via /User/update-user-verification.
 */

(function () {
  'use strict';

  const BASE = '/api';
  const ACCESS_TOKEN_KEY  = 'authToken';                 // legacy key reused
  const REFRESH_TOKEN_KEY = 'refreshToken';              // new
  const ACCESS_EXPIRES_KEY = 'accessExpiresAtUtc';       // new
  const USER_TYPE_KEY = 'userType';

  function getAccessToken()  { return localStorage.getItem(ACCESS_TOKEN_KEY); }
  function getRefreshToken() { return localStorage.getItem(REFRESH_TOKEN_KEY); }

  function setAccessToken(t)  { t ? localStorage.setItem(ACCESS_TOKEN_KEY, t)  : localStorage.removeItem(ACCESS_TOKEN_KEY); }
  function setRefreshToken(t) { t ? localStorage.setItem(REFRESH_TOKEN_KEY, t) : localStorage.removeItem(REFRESH_TOKEN_KEY); }
  function setAccessExpires(iso) { iso ? localStorage.setItem(ACCESS_EXPIRES_KEY, iso) : localStorage.removeItem(ACCESS_EXPIRES_KEY); }

  function clearSession() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ACCESS_EXPIRES_KEY);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem(USER_TYPE_KEY);
  }

  /**
   * Core fetch wrapper. The Node proxy injects X-Api-Key — we only attach
   * the JWT bearer here.
   */
  async function request(path, options = {}) {
    const url = path.startsWith('http') ? path : BASE + path;

    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    if (options.body) console.log('[API Request]', options.method || 'GET', url, options.body);

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });

    // 401 handling: don't auto-logout if THIS is the login/refresh request —
    // those legitimately produce 401 on bad credentials / rejected refresh.
    if (response.status === 401) {
      const isAuthCall = path.includes('/User/login') || path.includes('/Auth/refresh');
      if (!isAuthCall) {
        clearSession();
        if (window.logout) window.logout();
        if (window.showNotification) {
          window.showNotification('error', 'Unauthorized - please login');
        }
      }
      const err = new Error('Unauthorized');
      err.status = 401;
      throw err;
    }

    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; }
    catch { data = text; }

    if (!response.ok) {
      console.error('[API Error]', path, response.status, data);
      const message = (data && data.message) || (data && data.error) || response.statusText || 'API Error';

      if (window.showNotification && !options.suppressError && response.status !== 405 && response.status !== 404) {
        let errorMsg = message;
        if (data && data.errors) {
          const validations = Object.values(data.errors).flat().join('\n');
          if (validations) errorMsg += '\n' + validations;
        }
        window.showNotification('error', errorMsg);
      }

      const error = new Error(message);
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    // Some endpoints return { data: ... }; most return the payload directly.
    const result = data && data.data !== undefined ? data.data : data;
    console.log('[API]', path, result);
    return result;
  }

  // ============================================================
  // QueryString builder used by paged admin endpoints
  // ============================================================

  function qs(params) {
    if (!params) return '';
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') search.append(k, v);
    });
    const s = search.toString();
    return s ? '?' + s : '';
  }

  // ============================================================
  // Public API
  // ============================================================

  window.api = {
    __internals: {
      getToken: getAccessToken,
      setToken: setAccessToken,
      getRefreshToken,
      setRefreshToken,
      setAccessExpires,
      clearToken: clearSession,
    },

    // ----------------------------------------------------- Auth
    auth: {
      /**
       * Returns the full LoginResponse:
       *   { user, accessToken, expiresAtUtc, refreshToken, refreshExpiresAtUtc }
       * For admin/vendor logins, refreshToken is non-null. For regular
       * users it's null (their access token never expires).
       */
      login: (body) =>
        request('/User/login', {
          method: 'POST',
          body: JSON.stringify(body)
        }),

      /**
       * Rotate a refresh token into a new access+refresh pair.
       * Single-use — if presented again the entire chain is revoked
       * server-side and an audit row is written.
       */
      refresh: (refreshToken) =>
        request('/Auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
          suppressError: true
        }),

      /**
       * Server-side revoke of all active refresh tokens for the caller +
       * local cleanup. Best effort — clears local even if server-side fails.
       */
      logout: async () => {
        try { await request('/Auth/logout', { method: 'POST', suppressError: true }); }
        catch (_) { /* best-effort */ }
        clearSession();
      },
    },

    // ----------------------------------------------------- Brands
    brands: {
      list:   ()        => request('/Brand'),
      get:    (id)      => request(`/Brand/${id}`),
      create: (body)    => request('/Brand',     { method: 'POST',   body: JSON.stringify(body) }),
      update: (id,body) => request(`/Brand/${id}`,{ method: 'PUT',   body: JSON.stringify({ ...body, id: parseInt(id, 10) }) }),
      delete: (id)      => request(`/Brand/${id}`,{ method: 'DELETE' })
    },

    // ----------------------------------------------------- OrderStatus
    orderStatus: {
      getOrdersCountByStatus: () => request('/OrderStatus/GetOrdersCountByStatus'),
      getAll: () => request('/OrderStatus'),
      get: (id, options) => request(`/OrderStatus/${id}`, options),
      create: (body)    => request('/OrderStatus',    { method: 'POST',   body: JSON.stringify(body) }),
      update: (id,body) => request(`/OrderStatus/${id}`,{ method: 'PUT',  body: JSON.stringify(body) }),
      delete: (id)      => request(`/OrderStatus/${id}`,{ method: 'DELETE' })
    },

    // ----------------------------------------------------- Delivery
    delivery: {
      list:   ()        => request('/Delivery'),
      get:    (id)      => request(`/Delivery/${id}`),
      create: (body)    => request('/Delivery',      { method: 'POST',   body: JSON.stringify(body) }),
      update: (id,body) => request(`/Delivery/${id}`,{ method: 'PUT',   body: JSON.stringify(body) }),
      delete: (id)      => request(`/Delivery/${id}`,{ method: 'DELETE' })
    },

    // ----------------------------------------------------- Cart
    cart: {
      // Admin/staff list endpoints
      getAllOrders:     ()      => request('/Cart/orders'),
      getRecentOrders:  ()      => request('/Cart/orders/general'),
      getFiltered:      (fromDate, toDate, status, search) =>
        request('/Cart/filtered' + qs({ fromDate, toDate, status, search })),
      get:              (id, options) => request(`/Cart/orders/${id}`, options),
      getItems:         (id)    => request(`/Cart/orders/details/${id}`),
      create:           (body)  => request('/Cart/orders',         { method: 'POST',  body: JSON.stringify(body) }),
      update:           (id,b)  => request(`/Cart/orders/${id}`,   { method: 'PUT',   body: JSON.stringify(b) }),
      updateStatus:     (body)  => request('/Cart/update-status',  { method: 'PUT',   body: JSON.stringify(body) }),
      delete:           (id)    => request(`/Cart/orders/${id}`,   { method: 'DELETE' }),

      // Phase 5 rename: orders/status now resolves the staff-only query
      // (/Cart/orders/status/{status}) by route ambiguity; the analytics
      // variant moved to orders/analytics/status. We use the analytics one.
      getStatuses:               () => request('/Cart/orders/analytics/status'),
      getOrderStatusDefinitions: () => request('/OrderStatus')
    },

    // ----------------------------------------------------- Ads
    ads: {
      list:   ()         => request('/Ads'),
      get:    (id, opts) => request(`/Ads/${id}`, opts),
      create: (body)     => request('/Ads',      { method: 'POST',   body: JSON.stringify(body) }),
      update: (id,body)  => request(`/Ads/${id}`,{ method: 'PUT',    body: JSON.stringify(body) }),
      delete: (id)       => request(`/Ads/${id}`,{ method: 'DELETE' })
    },

    // ----------------------------------------------------- Users
    users: {
      /**
       * GET /User/users-summary-Filtered?name=... — admin list with filter.
       * AdminOnly per revamp.
       */
      getFiltered: (params) =>
        request('/User/users-summary-Filtered' + qs(params)),

      /** GET /User/{id} — admin views any user. AdminOnly. */
      get: (id, options) => request(`/User/${id}`, options),

      /**
       * POST /User/create — registration. The revamp returns a LoginResponse
       * (so the just-created user can immediately verify their phone).
       * Mobile registration also flows through this URL.
       */
      create: (body) =>
        request('/User/create', {
          method: 'POST',
          body: JSON.stringify(body)
        }),

      /**
       * POST /User/update-user-verification — admin flips IsVerified on
       * any user. The only "edit another user" API the revamp currently
       * exposes; broader user-edit needs a new backend endpoint.
       */
      setVerification: (userId, isVerified) =>
        request('/User/update-user-verification', {
          method: 'POST',
          body: JSON.stringify({ userId: parseInt(userId, 10), isVerified: !!isVerified })
        }),

      /**
       * KNOWN GAP — revamp doesn't have PUT /User/{id} for arbitrary
       * user-by-admin edits. The existing PUT /User/update updates only
       * the calling admin's own profile. Flag for Phase 7 backend work.
       */
      update: (_id, _body) => {
        const msg = 'users.update: backend doesn\'t expose PUT /User/{id} for admins. ' +
                    'Use api.users.setVerification(...) for the verification flip, ' +
                    'or wait for the Phase 7 admin-edit endpoint.';
        console.warn(msg);
        return Promise.reject(new Error(msg));
      },

      /** KNOWN GAP — no DELETE endpoint on the revamp. */
      delete: (_id) => {
        const msg = 'users.delete: no backend endpoint. Disable the user via setVerification(false)?';
        console.warn(msg);
        return Promise.reject(new Error(msg));
      }
    },

    // ----------------------------------------------------- Analytics (legacy + Phase 5)
    analytics: {
      getGeneralStats:         () => request('/Cart/orders/general'),
      getMonthlySales:         () => request('/Cart/orders/monthly-sales'),
      getWeeklyRevenue:        () => request('/Cart/orders/weekly-revenue'),
      // Renamed in Phase 5 — see cart.getStatuses comment
      getCartOrdersStatus:     () => request('/Cart/orders/analytics/status'),
      getOrdersCountByStatus:  () => request('/OrderStatus/GetOrdersCountByStatus')
    },

    // ----------------------------------------------------- Products
    products: {
      list: () => request('/Product'),
      filterByCategory: (category, options) => {
        const cat = encodeURIComponent(category);
        return request(`/Product/filter-by-category?category=${cat}`, options);
      },
      get:    (id, options) => request(`/Product/${id}`, options),
      create: (body, options) =>
        request('/Product', {
          method: 'POST',
          body: JSON.stringify(body),
          ...(options || {})
        }),
      update: (id, body) =>
        request(`/Product/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...body, id: parseInt(id, 10) })
        }),
      delete: (id) =>
        request(`/Product/${id}`, { method: 'DELETE' })
    },

    // productTest kept as alias for the production parity
    productTest: {
      list: () => request('/Product'),
      filterByCategory: (category, options) => {
        const cat = encodeURIComponent(category);
        return request(`/Product/filter-by-category?category=${cat}`, options);
      },
      get: (id, options) => request(`/Product/${id}`, options),
      create: (body, options) =>
        request('/Product', { method: 'POST', body: JSON.stringify(body), ...(options || {}) }),
      update: (id, body) =>
        request(`/Product/${id}`, { method: 'PUT', body: JSON.stringify({ ...body, id: parseInt(id, 10) }) }),
      delete: (id) =>
        request(`/Product/${id}`, { method: 'DELETE' })
    },

    // ----------------------------------------------------- Categories
    categories: {
      list:      ()    => request('/Categories'),
      getByType: (t)   => request(`/Categories/GetCategoryByType/${encodeURIComponent(t)}`),
      get:       (id)  => request(`/Categories/${id}`),
      create: (body)    => request('/Categories',      { method: 'POST',  body: JSON.stringify(body) }),
      update: (id,body) => request(`/Categories/${id}`,{ method: 'PUT',   body: JSON.stringify(body) }),
      delete: (id)      => request(`/Categories/${id}`,{ method: 'DELETE' })
    },

    // ----------------------------------------------------- DiscountCode (R5-I: ApiKeyRequired)
    discount: {
      list: () => request('/DiscountCode/all-with-usage', { suppressError: true }),
      get:    (id, opts) => request(`/DiscountCode/${id}`, opts),
      create: (body) =>
        request('/DiscountCode', {
          method: 'POST',
          body: JSON.stringify(body)
        }),
      update: (id, body) =>
        request(`/DiscountCode/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        }),
      delete: (id) =>
        request(`/DiscountCode/${id}`, { method: 'DELETE' })
    },

    // ----------------------------------------------------- Clinic
    clinic: {
      list: () => request('/ClinicInfo'),
      info: () => request('/ClinicInfo'),
      get:  (id, opts) => request(`/ClinicInfo/${id}`, opts),
      deleteImage: (clinicId) =>
        request(`/ClinicInfo/delete-clinic-image?clinicId=${encodeURIComponent(clinicId)}`, {
          method: 'DELETE'
        }),
      create: (body)    => request('/ClinicInfo',      { method: 'POST',  body: JSON.stringify(body) }),
      update: (id,body) => request(`/ClinicInfo/${id}`,{ method: 'PUT',   body: JSON.stringify(body) }),
      delete: (id)      => request(`/ClinicInfo/${id}`,{ method: 'DELETE' })
    },

    // ----------------------------------------------------- Notifications
    notifications: {
      sendCustom: (body) =>
        request('/Notification/send-custom', {
          method: 'POST',
          body: JSON.stringify(body)
        }),
      sendAll: () =>
        request('/Notification/send-all', { method: 'POST' })
    },

    // ----------------------------------------------------- SupportService
    supportService: {
      list:   ()        => request('/SupportService'),
      get:    (id)      => request(`/SupportService/${id}`),
      create: (body)    => request('/SupportService',      { method: 'POST',   body: JSON.stringify(body) }),
      update: (id,body) => request(`/SupportService/${id}`,{ method: 'PUT',   body: JSON.stringify(body) }),
      delete: (id)      => request(`/SupportService/${id}`,{ method: 'DELETE' })
    },

    // ----------------------------------------------------- ProductDiscount
    productDiscount: {
      applyByBrand: (body) =>
        request('/Product/apply-discount-by-brand', {
          method: 'POST',
          body: JSON.stringify(body)
        }),
      clearByBrand: (body) =>
        request('/Product/clear-discount-by-brand', {
          method: 'POST',
          body: JSON.stringify(body)
        })
    },

    // ============================================================
    // NEW — Phase 5 admin dashboards over the audit + heatmap DBs
    // ============================================================

    audit: {
      securityEvents:        (params) => request('/AdminAudit/security-events'         + qs(params)),
      securityEventsSummary: (days = 7) => request('/AdminAudit/security-events/summary?days=' + days),
      failedLogins:          (days = 1, limit = 200) =>
        request(`/AdminAudit/failed-logins?days=${days}&limit=${limit}`),
      userHistory:           (userId, limit = 100) =>
        request(`/AdminAudit/users/${userId}/security-events?limit=${limit}`),
      adminActions:          (params) => request('/AdminAudit/admin-actions' + qs(params)),
    },

    heatmap: {
      activity:        (params) => request('/AdminHeatmap/activity' + qs(params)),
      activityByUser:  (userId, limit = 100) =>
        request(`/AdminHeatmap/activity/by-user/${userId}?limit=${limit}`),
      summaryDaily:    (days = 7)   => request('/AdminHeatmap/summary/daily?days=' + days),
      topRoutes:       (days = 7, limit = 20) =>
        request(`/AdminHeatmap/top-routes?days=${days}&limit=${limit}`),
      slowestRoutes:   (days = 7, minHits = 10, limit = 20) =>
        request(`/AdminHeatmap/slowest-routes?days=${days}&minHits=${minHits}&limit=${limit}`),
      authErrors:      (hours = 24) => request('/AdminHeatmap/auth-errors?hours=' + hours),
      activeUsers:     (days = 7, limit = 50) =>
        request(`/AdminHeatmap/active-users?days=${days}&limit=${limit}`),
    }
  };
})();
