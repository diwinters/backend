# Raceef Admin Dashboard - Build & Deploy Script
# Run this script to build the dashboard for production

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Raceef Admin Dashboard Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to dashboard directory
$dashboardPath = Join-Path $PSScriptRoot "dashboard"

if (-not (Test-Path $dashboardPath)) {
    Write-Host "Error: Dashboard directory not found at $dashboardPath" -ForegroundColor Red
    exit 1
}

Set-Location $dashboardPath

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

# Build the dashboard
Write-Host "Building dashboard..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Dashboard built successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Files are in: $dashboardPath\dist" -ForegroundColor Gray
Write-Host ""
Write-Host "To deploy to server:" -ForegroundColor Yellow
Write-Host "  1. Upload the 'dist' folder to ~/backend/dashboard/dist on the server"
Write-Host "  2. Restart the backend: pm2 restart raceef-backend"
Write-Host "  3. Access dashboard at: http://44.218.114.60:3001/admin"
Write-Host ""
