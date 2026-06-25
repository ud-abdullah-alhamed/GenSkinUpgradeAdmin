@echo off
echo Starting GenSkin Admin Panel Proxy Server...
echo The server will start in this window. Please keep it open.
echo Opening your browser to http://localhost:3000 ...

cd proxy
set PORT=3000
start "" "http://localhost:3000"
node server.js
pause