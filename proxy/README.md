Local proxy to run the admin panel without SSL/CORS issues

Instructions:

1. Install Node.js (>=14) if not installed.
2. Open a terminal in `admin panel/proxy` and run:

   npm install

3. Start the proxy server:

   npm start

4. Open the admin panel in your browser:

   http://localhost:3000/index.html

Notes:
- The proxy serves the files from the parent folder (the project root) and forwards `/api` to `https://166.1.227.102:7011` with SSL verification disabled.
- This is only for local development/testing. Do not use `secure: false` in production.
