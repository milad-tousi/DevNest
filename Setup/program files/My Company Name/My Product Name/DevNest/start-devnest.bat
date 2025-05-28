@echo off
cd /d "%~dp0"

start "" cmd /c "cd frontend && npm install && npm run dev"

start "" cmd /c "cd backend && npm install && node index.js"

timeout /t 5 > nul
start http://localhost:5000
