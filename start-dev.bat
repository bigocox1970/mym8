@echo off
echo Starting development servers...

:: Kill any existing processes on ports 8082, 8888, and 9000
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8082" ^| find "LISTENING"') do (
    taskkill /F /PID %%a
)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8888" ^| find "LISTENING"') do (
    taskkill /F /PID %%a
)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":9000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a
)

:: Start the Netlify dev server which will handle both frontend and functions
echo Starting Netlify Dev server...
echo When startup completes, visit: http://localhost:8888
npm run local
