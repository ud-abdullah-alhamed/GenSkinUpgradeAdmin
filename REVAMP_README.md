# Admin Panel — Revamp Edition

Adapted from `Desktop/admin-panel/` (production) to talk to the Phase 5 / 6
revamped backend (`revamp` branch of `GenSkinUpgrade`).

**Production version is untouched.** This folder is its own working copy.

## What changed vs. production

### 1. `proxy/server.js`

- **Injects `X-Api-Key` server-side** on every `/api/*` request. The browser
  no longer needs to know the API key; it can't leak via devtools / view-source.
- **Env-driven** target host + key + image host:
  ```
  API_HOST    default https://166.1.227.202:7011  (staging — server 202)
  API_KEY     REQUIRED — set to the staging Security:OtpApiKey
  IMAGE_HOST  default http://166.1.227.102        (CDN)
  PORT        default 3000
  ```
  Same binary runs against staging or prod by changing env vars.

### 2. `js/api.js`

- **`auth.login`** returns the new `LoginResponse` envelope
  (`{ user, accessToken, expiresAtUtc, refreshToken, refreshExpiresAtUtc }`) —
  `auth.js` handles the storage. Admin gets a non-null `refreshToken`; regular
  users get `null` (their access token effectively never expires).
- **New** `auth.refresh(refreshToken)` — single-use rotation. If presented
  twice the server revokes the entire chain (defense-in-depth from R6.4).
- **New** `auth.logout()` — server-side revoke + local cleanup.
- **`users.create`** points at `POST /User/create` (was `POST /User`).
- **`users.setVerification(userId, isVerified)`** — flips `IsVerified` on any
  user. Replaces the verification side of the old `users.update`.
- **Known gap:** `users.update(id, body)` no longer maps to a backend endpoint.
  The revamp's `PUT /User/update` updates the *calling* admin's own profile
  only. Edit-any-user requires a new backend endpoint (Phase 7). The method
  is stubbed to reject with a clear message.
- **Cart analytics rename:** `cart.getStatuses` and `analytics.getCartOrdersStatus`
  now hit `/Cart/orders/analytics/status` (the legacy `/Cart/orders/status` was
  reassigned in R5-G.1 to a route-disambiguated path).
- **New** `api.audit.*` — admin dashboards over `genskin_audit`:
  - `securityEvents(params)` — paged with filters
  - `securityEventsSummary(days)` — counts grouped by EventType + Outcome
  - `failedLogins(days, limit)` — brute-force monitoring
  - `userHistory(userId, limit)` — one user's full audit
  - `adminActions(params)` — paged AdminAction list
- **New** `api.heatmap.*` — admin dashboards over `genskin_heatmap`:
  - `activity(params)`, `activityByUser(userId, limit)`
  - `summaryDaily(days)`
  - `topRoutes(days, limit)`, `slowestRoutes(days, minHits, limit)`
  - `authErrors(hours)`, `activeUsers(days, limit)`

### 3. `js/auth.js`

- Parses the new envelope, stores accessToken + refreshToken + expiry.
- **Auto-refresh timer** — fires 5 min before expiry for admin/vendor sessions.
  Regular users skip the timer (refreshToken is `null`).
- **Refresh resilience** — rearms after a page reload by reading
  `localStorage.accessExpiresAtUtc`.
- `logout()` calls `/Auth/logout` (server-side revoke) then clears local
  storage.

## Setup + run

```bash
cd "admin pannel.revamp/proxy"
npm install                         # first time only
export API_HOST='https://166.1.227.202:7011'
export API_KEY='<staging OtpApiKey from systemd env on 202>'
npm start                            # serves http://localhost:3000
```

Open `http://localhost:3000` in the browser.

To run against production (later, after cutover):

```bash
export API_HOST='https://<prod-host>:7011'
export API_KEY='<production OtpApiKey>'
npm start
```

## What's NOT changed

- `js/app.js` (5875 lines of UI logic) — every call goes through `window.api.*`,
  so the surface stays compatible. Spot-checks are still wise: anywhere the
  app puts `UserId` into a request body for a user-self endpoint (Cart/create,
  Favorite, etc.) the field is silently ignored now and the JWT-claim UserId
  is used. No visual change expected.
- `index.html`, `styles.css`, `utils/export.js`, `support/` — untouched.

## Phase 7 follow-ups flagged inline

- Backend endpoint for admin-edits-any-user (`PUT /User/{id}` doesn't exist on
  revamp; the existing `PUT /User/update` is self-only).
- Backend endpoint for admin-deletes-user (no `DELETE /User/{id}` on revamp).
- Admin UI views for the new `audit.*` and `heatmap.*` namespaces — the API
  client is ready, no UI widgets bound to them yet.

## Sanity check after deploy on 202

```bash
# Browser at http://localhost:3000 → sign in with an admin account.
# Expect: dashboard loads. Network tab should show:
#   * Authorization: Bearer <jwt>     attached to /api/* requests
#   * X-Api-Key                       added by proxy (not visible in browser)
#   * 5-min-before-expiry refresh timer fires; new pair lands in localStorage.

# Verify against backend:
mysql -u dev_user -p genskin_audit -e \
  "SELECT EventType, Outcome, Timestamp FROM SecurityEvent ORDER BY Id DESC LIMIT 5;"
# expect login.success when you signed in
```
