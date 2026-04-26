@echo off
setlocal

echo ========================================
echo   SmartCity RAG Assistant
echo   Starting Docker services...
echo ========================================
echo.

docker compose up -d --build
if errorlevel 1 (
  echo.
  echo Failed to start the Docker stack.
  echo Make sure Docker Desktop is running, then try again.
  exit /b 1
)

echo.
echo Waiting for frontend on http://localhost:3000 ...
powershell -NoProfile -Command "$url='http://localhost:3000'; $ready=$false; for($i=0; $i -lt 60; $i++){ try { Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2 | Out-Null; $ready=$true; break } catch { Start-Sleep -Seconds 2 } }; if($ready){ Write-Host 'Frontend is ready.'; Start-Process $url; exit 0 } else { Write-Host 'Frontend did not become ready in time.'; exit 1 }"
if errorlevel 1 (
  echo.
  echo Services started, but the frontend did not become ready in time.
  echo Check logs with: docker compose logs -f frontend
  exit /b 1
)

echo.
echo ========================================
echo   Services are running
echo ========================================
echo   Frontend:    http://localhost:3000
echo   Backend API: http://localhost:8000
echo   API Docs:    http://localhost:8000/docs
echo   Qdrant:      http://localhost:6333
echo.
endlocal
