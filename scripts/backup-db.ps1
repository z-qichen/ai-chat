# backup-db.ps1 — SQLite 数据库自动备份 (Windows)
param(
    [int]$RetentionDays = 30
)
$ErrorActionPreference = "Stop"

$projectDir = Split-Path $PSScriptRoot -Parent
$backupDir = Join-Path $projectDir "backups"
$dbPath = Join-Path $projectDir "data\ai-chat.db"
$filesDir = Join-Path $projectDir "data\files"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

if (Test-Path $dbPath) {
    Copy-Item $dbPath -Destination (Join-Path $backupDir "db_${timestamp}.sqlite")
    Write-Host "数据库备份完成: db_${timestamp}.sqlite"
} else {
    Write-Host "数据库文件不存在: $dbPath"
}

if ((Test-Path $filesDir) -and (Get-ChildItem $filesDir -ErrorAction SilentlyContinue)) {
    Compress-Archive -Path $filesDir -DestinationPath (Join-Path $backupDir "files_${timestamp}.zip")
    Write-Host "文件备份完成: files_${timestamp}.zip"
}

Get-ChildItem $backupDir | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } | Remove-Item -Force
Write-Host "已清理 ${RetentionDays} 天前的旧备份"
