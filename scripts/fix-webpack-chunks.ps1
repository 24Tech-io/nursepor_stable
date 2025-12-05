# PowerShell script to permanently fix webpack chunk errors
# Run this script whenever you encounter module resolution errors

Write-Host "🔧 Fixing Webpack Chunk Errors..." -ForegroundColor Cyan

# Stop all Node processes
Write-Host "`n1. Stopping Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Clean build caches
Write-Host "2. Cleaning build caches..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ Removed .next directory" -ForegroundColor Green
}

if (Test-Path "node_modules/.cache") {
    Remove-Item -Path "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ Removed node_modules/.cache" -ForegroundColor Green
}

# Clean npm cache
Write-Host "3. Cleaning npm cache..." -ForegroundColor Yellow
npm cache clean --force 2>&1 | Out-Null
Write-Host "   ✓ NPM cache cleaned" -ForegroundColor Green

# Rebuild
Write-Host "`n4. Rebuilding application..." -ForegroundColor Yellow
npm run build 2>&1 | Select-String -Pattern "Compiled|error|Error" | Select-Object -First 5

Write-Host "`n✅ Webpack chunk fix complete!" -ForegroundColor Green
Write-Host "   You can now run 'npm run dev' to start the development server." -ForegroundColor Cyan

