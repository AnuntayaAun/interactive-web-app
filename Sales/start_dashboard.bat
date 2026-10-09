@echo off
echo Starting Sales Interactive Dashboard...
cd /d "%~dp0"
start "" "http://localhost:3000"
node server.js
pause
