# Metro'yu temiz başlatmak için: portları temizle, ADB yönlendir, Metro başlat

$adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

# 1) 8081 ve 8082 portlarını temizle
foreach ($port in @(8081, 8082)) {
    Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "Port $port kapatiliyor (PID: $($_.OwningProcess))..."
        Stop-Process -Id $_.OwningProcess -Force
    }
}

# 2) ADB port yönlendirmesi (Android fiziksel cihaz varsa)
if (Test-Path $adbPath) {
    $devices = & $adbPath devices | Select-String -Pattern "device$"
    if ($devices) {
        Write-Host "Android cihaz bulundu, ADB port yonlendirmesi yapiliyor..."
        & $adbPath reverse tcp:8081 tcp:8081
    } else {
        Write-Host "Bagli Android cihaz yok, ADB adimi atlaniyor."
    }
} else {
    Write-Host "ADB bulunamadi, adim atlaniyor."
}

# 3) Metro'yu dev-client moduyla ve temiz onbellekle baslatir
Write-Host "Metro baslatiliyor (--dev-client --clear)..."
Set-Location (Join-Path $PSScriptRoot "..")
npx expo start --dev-client --clear
