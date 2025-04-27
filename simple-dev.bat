@echo off
echo Starting simple development server with API proxy...

:: Kill any existing processes on port 9000
for /f "tokens=5" %%a in ('netstat -aon ^| find ":9000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a
)

echo Using API proxy to communicate with the Netlify API
echo This will proxy requests to https://mym8.netlify.app
echo Relative URLs will be automatically proxied through Vite

:: Start the Vite server directly (not using the package.json script)
echo Starting Vite server on port 9000...
npx vite --port 9000 