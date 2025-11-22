# Setup script for .env.local (PowerShell version for Windows)
Write-Host "Creating .env.local file..." -ForegroundColor Green

$envContent = @"
# Database - Neon Postgres
DATABASE_URL="postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

# JWT Secret (32+ characters)
JWT_SECRET="nurse-pro-academy-super-secret-jwt-key-2024-production-ready"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Stripe (test keys - replace with your real keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51NXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ"
STRIPE_SECRET_KEY="sk_test_51NXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ"

# SMTP (optional - for password reset emails)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Nurse Pro Academy <noreply@nurseproacademy.com>"

# Google Gemini API (optional - for AI features)
GOOGLE_GEMINI_API_KEY=""
"@

Set-Content -Path ".env.local" -Value $envContent

Write-Host "✅ .env.local file created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: npx drizzle-kit push" -ForegroundColor Cyan
Write-Host "2. Run: npm run dev" -ForegroundColor Cyan
Write-Host "3. Visit: http://localhost:3000/api/test/create-nurse-pro" -ForegroundColor Cyan
Write-Host "4. Run: npm run seed:demo-data" -ForegroundColor Cyan

