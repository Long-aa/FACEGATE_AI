# dev.ps1 — Khởi động dev server sạch, tự động giải phóng port 3000
# Dùng: .\dev.ps1

Write-Host "🔍 Kiểm tra port 3000..." -ForegroundColor Cyan

$connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($connections) {
    foreach ($conn in $connections) {
        $pid = $conn.OwningProcess
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "⚡ Đang dừng process '$($proc.Name)' (PID: $pid) trên port 3000..." -ForegroundColor Yellow
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Milliseconds 500
    Write-Host "✅ Port 3000 đã được giải phóng" -ForegroundColor Green
} else {
    Write-Host "✅ Port 3000 đang trống" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Khởi động Next.js dev server tại http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

npm run dev
