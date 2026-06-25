/*
 * Sign-in flow — REVAMP edition.
 *
 * Differences vs production auth.js:
 *   * Parses the new LoginResponse envelope:
 *       { user, accessToken, expiresAtUtc, refreshToken, refreshExpiresAtUtc }
 *   * Stores accessToken + refreshToken + expiry timestamp in localStorage.
 *   * Auto-refresh: for admin/vendor sessions (60-min access token), a
 *     timer fires 5 minutes before expiry and rotates via /Auth/refresh.
 *     If the rotation fails the user is logged out cleanly.
 *   * Logout now calls /Auth/logout server-side to revoke active refresh
 *     tokens, then clears local storage.
 */

(function () {
  let refreshTimer = null;

  function showMessage(msg) { console.warn('Auth:', msg); }

  /**
   * Persist the full LoginResponse payload + arm the refresh timer.
   */
  function applyLoginResponse(res) {
    const accessToken         = res && res.accessToken;
    const refreshToken        = res && res.refreshToken;
    const expiresAtUtc        = res && res.expiresAtUtc;
    const refreshExpiresAtUtc = res && res.refreshExpiresAtUtc;
    const user                = res && res.user;
    const userType            = (user && user.userType) || res.userType || 'admin';

    if (!accessToken) {
      throw new Error('Login response missing accessToken');
    }

    window.api.__internals.setToken(accessToken);
    window.api.__internals.setRefreshToken(refreshToken || null);
    window.api.__internals.setAccessExpires(expiresAtUtc || null);

    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userType', userType);

    armRefreshTimer(expiresAtUtc, refreshToken);

    return { user, userType };
  }

  /**
   * Schedules a refresh attempt 5 minutes before expiry. No-op for
   * regular users (refreshToken is null and access token is ~100 years).
   */
  function armRefreshTimer(expiresAtUtc, refreshToken) {
    clearRefreshTimer();
    if (!refreshToken || !expiresAtUtc) return;

    const expiresAt = new Date(expiresAtUtc).getTime();
    const now       = Date.now();
    const fireAt    = expiresAt - 5 * 60 * 1000;
    const delay     = Math.max(fireAt - now, 30 * 1000);  // never fire sooner than 30s

    refreshTimer = setTimeout(() => doRefresh().catch(() => {}), delay);
    console.log('[Auth] Refresh timer armed; firing in', Math.round(delay / 1000), 's');
  }

  function clearRefreshTimer() {
    if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
  }

  async function doRefresh() {
    const refreshToken = window.api.__internals.getRefreshToken();
    if (!refreshToken) return;

    try {
      const res = await window.api.auth.refresh(refreshToken);
      // Refresh endpoint returns:
      //   { accessToken, expiresAtUtc, refreshToken, refreshExpiresAtUtc, userType }
      if (res && res.accessToken) {
        window.api.__internals.setToken(res.accessToken);
        window.api.__internals.setRefreshToken(res.refreshToken || null);
        window.api.__internals.setAccessExpires(res.expiresAtUtc || null);
        if (res.userType) localStorage.setItem('userType', res.userType);
        armRefreshTimer(res.expiresAtUtc, res.refreshToken);
        console.log('[Auth] Refresh rotated successfully');
      } else {
        throw new Error('Refresh response had no accessToken');
      }
    } catch (e) {
      console.error('[Auth] Refresh failed, logging out', e);
      logout();
    }
  }

  async function handleSignin(e) {
    e.preventDefault();
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;

    try {
      const res = await window.api.auth.login({ email, password });
      console.log('[Auth] Login response:', res);

      const { userType } = applyLoginResponse(res);

      if (window.showView) {
        if (String(userType).toLowerCase() === 'vendor') {
          window.showView('orders');
        } else {
          window.showView('dashboard');
          if (window.loadDashboardData) window.loadDashboardData();
        }
      }
    } catch (err) {
      showMessage(err.message || 'Login failed');
      const hint = window.location.protocol === 'file:'
        ? '\n\nTip: افتح اللوحة من http://localhost:3000 بدل فتح index.html مباشرة.'
        : '';
      alert('Login failed: ' + (err.message || err) + hint);
    }
  }

  async function logout() {
    clearRefreshTimer();
    try { await window.api.auth.logout(); }
    catch (_) { /* best-effort */ }
    if (window.showView) window.showView('signin');
  }

  // On load: rearm the refresh timer if we already have a session
  // (e.g. user refreshes the browser tab — we still hold their tokens).
  function rearmFromStorage() {
    const expires      = localStorage.getItem('accessExpiresAtUtc');
    const refreshToken = window.api && window.api.__internals.getRefreshToken();
    if (expires && refreshToken) {
      armRefreshTimer(expires, refreshToken);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('signin-form');
    if (form) form.addEventListener('submit', handleSignin);
    window.logout = logout;
    rearmFromStorage();
  });

})();
