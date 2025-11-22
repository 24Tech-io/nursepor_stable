# PowerShell Database Backup Script for Windows

param(
    [string]$BackupDir = "./backups",
    [int]$MaxBackups = 30
)

$ErrorActionPreference = "Stop"

Write-Host "=== LMS Platform Database Backup ===" -ForegroundColor Green
Write-Host "Timestamp: $(Get-Date)"

# Create backup directory
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Check DATABASE_URL
if (-not $env:DATABASE_URL) {
    Write-Host "Error: DATABASE_URL environment variable is not set" -ForegroundColor Red
    exit 1
}

$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "lms_backup_$Date.sql"

Write-Host "Starting backup..." -ForegroundColor Yellow

try {
    # Check if pg_dump is available
    $pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
    
    if (-not $pgDump) {
        Write-Host "Error: pg_dump not found. Please install PostgreSQL client tools." -ForegroundColor Red
        exit 1
    }

    # Perform backup
    & pg_dump $env:DATABASE_URL > $BackupFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        # Compress the backup
        Compress-Archive -Path $BackupFile -DestinationPath "$BackupFile.zip" -Force
        Remove-Item $BackupFile
        $BackupFile = "$BackupFile.zip"
        
        $Size = (Get-Item $BackupFile).Length / 1MB
        Write-Host "✓ Backup completed successfully" -ForegroundColor Green
        Write-Host "File: $BackupFile"
        Write-Host ("Size: {0:N2} MB" -f $Size)
        
        # Clean up old backups
        Write-Host "Cleaning up old backups (keeping last $MaxBackups)..." -ForegroundColor Yellow
        $Backups = Get-ChildItem -Path $BackupDir -Filter "lms_backup_*.zip" | Sort-Object CreationTime -Descending
        
        if ($Backups.Count -gt $MaxBackups) {
            $Backups | Select-Object -Skip $MaxBackups | Remove-Item -Force
        }
        
        $Remaining = (Get-ChildItem -Path $BackupDir -Filter "lms_backup_*.zip").Count
        Write-Host "✓ Cleanup complete. $Remaining backups retained." -ForegroundColor Green
        
        exit 0
    } else {
        Write-Host "✗ Backup failed" -ForegroundColor Red
        Get-Content $BackupFile
        exit 1
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
