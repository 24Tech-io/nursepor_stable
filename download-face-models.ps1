# Script to download face-api.js models
# Alternative: Download manually from https://github.com/justadudewhohacks/face-api.js-models

Write-Host "Downloading face-api.js models..." -ForegroundColor Cyan
Write-Host "Note: If automatic download fails, please download manually from:" -ForegroundColor Yellow
Write-Host "https://github.com/justadudewhohacks/face-api.js-models" -ForegroundColor Cyan
Write-Host ""

$modelsDir = "public\models"
if (-not (Test-Path $modelsDir)) {
    New-Item -ItemType Directory -Path $modelsDir -Force | Out-Null
}

# Try multiple sources
$sources = @(
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master",
    "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js-models@master"
)

$models = @(
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model-shard1",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1"
)

$downloaded = 0
foreach ($model in $models) {
    $output = "$modelsDir\$model"
    $success = $false
    
    foreach ($source in $sources) {
        $url = "$source/$model"
        Write-Host "Trying to download $model from $source..." -ForegroundColor Yellow
        
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -ErrorAction Stop
            [System.IO.File]::WriteAllBytes($output, $response.Content)
            Write-Host "Downloaded $model" -ForegroundColor Green
            $downloaded++
            $success = $true
            break
        } catch {
            # Try next source
            continue
        }
    }
    
    if (-not $success) {
        Write-Host "Failed to download $model from all sources" -ForegroundColor Red
        Write-Host "Please download manually from: https://github.com/justadudewhohacks/face-api.js-models" -ForegroundColor Yellow
    }
}

Write-Host ""
if ($downloaded -eq $models.Count) {
    Write-Host "All models downloaded successfully!" -ForegroundColor Green
    Write-Host "Models are in: $modelsDir" -ForegroundColor Green
} else {
    Write-Host "Only $downloaded of $($models.Count) models downloaded" -ForegroundColor Yellow
    Write-Host "Please download the remaining models manually" -ForegroundColor Yellow
    Write-Host "See FACE_LOGIN_SETUP.md for instructions" -ForegroundColor Yellow
}
