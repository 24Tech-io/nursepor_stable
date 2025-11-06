# Comprehensive Startup Check Script
Write-Host "=== LMS Platform Startup Check ===" -ForegroundColor Cyan

# Check Node.js
Write-Host "`n[1/6] Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not found!" -ForegroundColor Red
    exit 1
}

# Check .env.local
Write-Host "`n[2/6] Checking .env.local..." -ForegroundColor Yellow
if (Test-Path .env.local) {
    Write-Host "✓ .env.local exists" -ForegroundColor Green
    
    # Check for required variables
    $envContent = Get-Content .env.local -Raw
    if ($envContent -match "JWT_SECRET") {
        $jwtSecret = ($envContent | Select-String -Pattern "JWT_SECRET=(.+)").Matches.Groups[1].Value
        if ($jwtSecret.Length -ge 32) {
            Write-Host "✓ JWT_SECRET is set and valid (length: $($jwtSecret.Length))" -ForegroundColor Green
        } else {
            Write-Host "⚠ JWT_SECRET is too short (must be at least 32 characters)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠ JWT_SECRET not found in .env.local" -ForegroundColor Yellow
    }
    
    if ($envContent -match "DATABASE_URL") {
        Write-Host "✓ DATABASE_URL is set" -ForegroundColor Green
    } else {
        Write-Host "⚠ DATABASE_URL not found - will use SQLite fallback" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ .env.local not found!" -ForegroundColor Red
    Write-Host "Creating .env.local template..." -ForegroundColor Yellow
    
    $envTemplate = @"
# JWT Secret (REQUIRED - must be at least 32 characters)
JWT_SECRET="$(New-Guid)$(New-Guid)$(New-Guid)"

# Database URL (REQUIRED for Neon Postgres)
DATABASE_URL=""

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# SMTP Configuration (Optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="LMS Platform <noreply@example.com>"
"@
    
    $envTemplate | Out-File -FilePath .env.local -Encoding UTF8
    Write-Host "✓ Created .env.local with template" -ForegroundColor Green
    Write-Host "⚠ Please update DATABASE_URL with your Neon DB connection string!" -ForegroundColor Yellow
}

# Check node_modules
Write-Host "`n[3/6] Checking dependencies..." -ForegroundColor Yellow
if (Test-Path node_modules) {
    Write-Host "✓ node_modules exists" -ForegroundColor Green
} else {
    Write-Host "⚠ node_modules not found - installing..." -ForegroundColor Yellow
    npm install
}

# Check database connection
Write-Host "`n[4/6] Testing database connection..." -ForegroundColor Yellow
# This will be tested when server starts

# Clean build
Write-Host "`n[5/6] Cleaning build cache..." -ForegroundColor Yellow
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
    Write-Host "✓ Cleaned .next directory" -ForegroundColor Green
}

# Start server
Write-Host "`n[6/6] Starting development server..." -ForegroundColor Yellow
Write-Host "`n=== Starting Server ===" -ForegroundColor Cyan
Write-Host "Server will be available at: http://localhost:3000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Yellow

npm run dev

