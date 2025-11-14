# Automated Feature Testing Script
# Nurse Pro Academy LMS Platform

Write-Host "Nurse Pro Academy - Feature Testing" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$testResults = @()

# Helper function to test endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [string]$Body = $null,
        [bool]$RequiresAuth = $false
    )
    
    Write-Host "Testing: $Name..." -NoNewline
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $headers
            UseBasicParsing = $true
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-WebRequest @params
        
        if ($response.StatusCode -in 200..299) {
            Write-Host " PASSED" -ForegroundColor Green
            return @{
                Name = $Name
                Status = "PASSED"
                StatusCode = $response.StatusCode
            }
        } else {
            Write-Host " WARNING (Status: $($response.StatusCode))" -ForegroundColor Yellow
            return @{
                Name = $Name
                Status = "WARNING"
                StatusCode = $response.StatusCode
            }
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($RequiresAuth -and $statusCode -eq 401) {
            Write-Host " REQUIRES AUTH (Expected)" -ForegroundColor Yellow
            return @{
                Name = $Name
                Status = "REQUIRES_AUTH"
                StatusCode = 401
            }
        } else {
            Write-Host " FAILED (Status: $statusCode)" -ForegroundColor Red
            return @{
                Name = $Name
                Status = "FAILED"
                StatusCode = $statusCode
                Error = $_.Exception.Message
            }
        }
    }
}

Write-Host "1. Testing Public Endpoints" -ForegroundColor Cyan
Write-Host "----------------------------" -ForegroundColor Cyan
$testResults += Test-Endpoint -Name "Homepage" -Url "$baseUrl/"
$testResults += Test-Endpoint -Name "Login Page" -Url "$baseUrl/login"
$testResults += Test-Endpoint -Name "Register Page" -Url "$baseUrl/register"
$testResults += Test-Endpoint -Name "Forgot Password" -Url "$baseUrl/forgot-password"
Write-Host ""

Write-Host "2. Testing API Endpoints" -ForegroundColor Cyan
Write-Host "-------------------------" -ForegroundColor Cyan
$testResults += Test-Endpoint -Name "Health Check" -Url "$baseUrl/api/health" -RequiresAuth $true
$testResults += Test-Endpoint -Name "CSRF Token" -Url "$baseUrl/api/csrf"
$testResults += Test-Endpoint -Name "Get User Roles" -Url "$baseUrl/api/auth/get-roles"
$testResults += Test-Endpoint -Name "Auth Status" -Url "$baseUrl/api/auth/me" -RequiresAuth $true
Write-Host ""

Write-Host "3. Testing Course APIs" -ForegroundColor Cyan
Write-Host "----------------------" -ForegroundColor Cyan
$testResults += Test-Endpoint -Name "Public Courses" -Url "$baseUrl/api/student/courses"
$testResults += Test-Endpoint -Name "Admin Courses" -Url "$baseUrl/api/admin/courses" -RequiresAuth $true
Write-Host ""

Write-Host "4. Testing Blog APIs" -ForegroundColor Cyan
Write-Host "--------------------" -ForegroundColor Cyan
$testResults += Test-Endpoint -Name "Public Blogs" -Url "$baseUrl/api/blogs"
Write-Host ""

Write-Host "5. Testing Student Pages" -ForegroundColor Cyan
Write-Host "-------------------------" -ForegroundColor Cyan
$testResults += Test-Endpoint -Name "Student Dashboard" -Url "$baseUrl/student/dashboard" -RequiresAuth $true
$testResults += Test-Endpoint -Name "Student Courses" -Url "$baseUrl/student/courses"
$testResults += Test-Endpoint -Name "Student Profile" -Url "$baseUrl/student/profile" -RequiresAuth $true
Write-Host ""

Write-Host "6. Testing Admin Pages" -ForegroundColor Cyan
Write-Host "----------------------" -ForegroundColor Cyan
$testResults += Test-Endpoint -Name "Admin Dashboard" -Url "$baseUrl/admin" -RequiresAuth $true
$testResults += Test-Endpoint -Name "Admin Students" -Url "$baseUrl/admin/students" -RequiresAuth $true
$testResults += Test-Endpoint -Name "Admin Courses Page" -Url "$baseUrl/admin/courses" -RequiresAuth $true
Write-Host ""

# Summary
Write-Host ""
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "============" -ForegroundColor Cyan

$passed = ($testResults | Where-Object { $_.Status -eq "PASSED" }).Count
$requiresAuth = ($testResults | Where-Object { $_.Status -eq "REQUIRES_AUTH" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAILED" }).Count
$total = $testResults.Count

Write-Host "Total Tests:       $total" -ForegroundColor White
Write-Host "Passed:            $passed" -ForegroundColor Green
Write-Host "Requires Auth:     $requiresAuth" -ForegroundColor Yellow
Write-Host "Failed:            $failed" -ForegroundColor Red
Write-Host ""

if ($failed -gt 0) {
    Write-Host "Failed Tests:" -ForegroundColor Red
    $testResults | Where-Object { $_.Status -eq "FAILED" } | ForEach-Object {
        Write-Host "  - $($_.Name): $($_.Error)" -ForegroundColor Red
    }
    Write-Host ""
}

$successRate = [math]::Round((($passed + $requiresAuth) / $total) * 100, 2)
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if($successRate -gt 80) { "Green" } else { "Yellow" })
Write-Host ""

# Configuration Check
Write-Host "Configuration Status" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan

$envPath = ".env.local"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    
    Write-Host "DATABASE_URL:      " -NoNewline
    Write-Host $(if($envContent -match "DATABASE_URL=.+") { "Configured" } else { "Missing" }) -ForegroundColor $(if($envContent -match "DATABASE_URL=.+") { "Green" } else { "Red" })
    
    Write-Host "JWT_SECRET:        " -NoNewline
    Write-Host $(if($envContent -match "JWT_SECRET=.+") { "Configured" } else { "Missing" }) -ForegroundColor $(if($envContent -match "JWT_SECRET=.+") { "Green" } else { "Red" })
    
    Write-Host "STRIPE_SECRET_KEY: " -NoNewline
    Write-Host $(if($envContent -match "STRIPE_SECRET_KEY=sk_.+") { "Configured" } else { "Missing" }) -ForegroundColor $(if($envContent -match "STRIPE_SECRET_KEY=sk_.+") { "Green" } else { "Yellow" })
    
    Write-Host "SMTP_HOST:         " -NoNewline
    Write-Host $(if($envContent -match "SMTP_HOST=.+") { "Configured" } else { "Missing" }) -ForegroundColor $(if($envContent -match "SMTP_HOST=.+") { "Green" } else { "Yellow" })
    
    Write-Host "REDIS_HOST:        " -NoNewline
    Write-Host $(if($envContent -match "REDIS_HOST=.+") { "Configured" } else { "Missing (Optional)" }) -ForegroundColor $(if($envContent -match "REDIS_HOST=.+") { "Green" } else { "Yellow" })
    
    Write-Host "GEMINI_API_KEY:    " -NoNewline
    Write-Host $(if($envContent -match "GEMINI_API_KEY=.+") { "Configured" } else { "Missing (Optional)" }) -ForegroundColor $(if($envContent -match "GEMINI_API_KEY=.+") { "Green" } else { "Yellow" })
    
    Write-Host "CSRF_SECRET:       " -NoNewline
    Write-Host $(if($envContent -match "CSRF_SECRET=.+") { "Configured" } else { "Missing" }) -ForegroundColor $(if($envContent -match "CSRF_SECRET=.+") { "Green" } else { "Yellow" })
} else {
    Write-Host "ERROR: .env.local file not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "-----------" -ForegroundColor Cyan
Write-Host "1. Review CONFIGURATION_COMPLETE_GUIDE.md"
Write-Host "2. Add missing environment variables"
Write-Host "3. Test payment with Stripe"
Write-Host "4. Configure email notifications"
Write-Host "5. Test AI features with Gemini"
Write-Host ""
Write-Host "Full documentation available in project root" -ForegroundColor Green
Write-Host ""
