# setup-env.ps1 — 初始环境配置脚本
$serverDir = Join-Path $PSScriptRoot "..\ai-chat-server"
$envPath = Join-Path $serverDir ".env"
$envExample = Join-Path $serverDir ".env.example"

if (Test-Path $envPath) {
    Write-Host "⚠️  .env 已存在，跳过生成" -ForegroundColor Yellow
} else {
    $content = Get-Content $envExample -Raw
    $jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
    $content = $content -replace 'change-me-to-a-random-string', $jwtSecret
    Set-Content -Path $envPath -Value $content -Encoding UTF8
    Write-Host "✅ .env 已生成，JWT_SECRET 已随机生成" -ForegroundColor Green
}

Write-Host "下一步: 编辑 $envPath 填写 DEEPSEEK_API_KEY 等必填项" -ForegroundColor Cyan
