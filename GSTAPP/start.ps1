# ─────────────────────────────────────────────────────────────────
#  GST ReconGraph — Single-Port Startup Script
#  Builds the React frontend, then serves everything via FastAPI
#  on http://127.0.0.1:8000
# ─────────────────────────────────────────────────────────────────

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GST ReconGraph — Starting up..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Build the React frontend ──────────────────────────────
Write-Host "[1/2] Building React frontend (npm run build)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "" 
    Write-Host "ERROR: npm build failed. Fix the errors above and retry." -ForegroundColor Red
    exit 1
}
Write-Host "      React build complete -> dist/" -ForegroundColor Green
Write-Host ""

# ── Step 2: Activate Python venv (if present) and start FastAPI ───
Write-Host "[2/2] Starting FastAPI backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
Write-Host "      React app  -> http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "      API docs   -> http://127.0.0.1:8000/docs" -ForegroundColor Green
Write-Host ""

$venvPython = Join-Path $root "backend\venv\Scripts\python.exe"
Set-Location (Join-Path $root "backend")
if (Test-Path $venvPython) {
    & $venvPython -m uvicorn main:app --reload --port 8000
} else {
    uvicorn main:app --reload --port 8000
}

