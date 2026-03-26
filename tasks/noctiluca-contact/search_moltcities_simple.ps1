# Chrome History Search - MoltCities Evidence
# PowerShell Script für Marcus

Write-Host "🔍 SUCHE NACH MOLTCITIES-SPuren" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Chrome History durchsuchen
Write-Host "`n📁 1. Chrome History..." -ForegroundColor Yellow
$ChromeHistoryPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\History"
if (Test-Path $ChromeHistoryPath) {
    Write-Host "   Chrome History gefunden: $ChromeHistoryPath" -ForegroundColor Green
    Write-Host "   (Kopiere die Datei und nutze SQLite Browser)" -ForegroundColor Gray
} else {
    Write-Host "   Chrome History nicht gefunden" -ForegroundColor Red
}

# 2. Chrome Login Data
Write-Host "`n📁 2. Chrome Login Data..." -ForegroundColor Yellow
$ChromeLoginPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Login Data"
if (Test-Path $ChromeLoginPath) {
    Write-Host "   Login Data gefunden" -ForegroundColor Green
} else {
    Write-Host "   Nicht gefunden" -ForegroundColor Red
}

# 3. Chrome Preferences
Write-Host "`n📁 3. Chrome Preferences..." -ForegroundColor Yellow
$ChromePrefsPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Preferences"
if (Test-Path $ChromePrefsPath) {
    Write-Host "   Preferences gefunden" -ForegroundColor Green
    $prefs = Get-Content $ChromePrefsPath -Raw
    if ($prefs -match "moltcities|moltbook|MoltCities") {
        Write-Host "   MoltCities-Eintrage gefunden!" -ForegroundColor Green
    } else {
        Write-Host "   Keine MoltCities-Eintrage" -ForegroundColor Red
    }
} else {
    Write-Host "   Preferences nicht gefunden" -ForegroundColor Red
}

# 4. Windows Event Logs
Write-Host "`n📁 4. Windows Event Logs..." -ForegroundColor Yellow
try {
    $events = Get-WinEvent -FilterHashtable @{LogName='Application','System'; StartTime=(Get-Date).AddDays(-60)} -ErrorAction SilentlyContinue | Where-Object { $_.Message -match "chrome|browser" } | Select-Object -First 10
    if ($events) {
        Write-Host "   $($events.Count) Events gefunden" -ForegroundColor Green
    } else {
        Write-Host "   Keine Events" -ForegroundColor Red
    }
} catch {
    Write-Host "   Fehler beim Lesen (Admin-Rechte?)" -ForegroundColor Yellow
}

# 5. PowerShell History
Write-Host "`n📁 5. PowerShell History..." -ForegroundColor Yellow
$PSHistoryPath = (Get-PSReadlineOption).HistorySavePath
if (Test-Path $PSHistoryPath) {
    $history = Get-Content $PSHistoryPath | Where-Object { $_ -match "molt|curl|api" }
    if ($history) {
        Write-Host "   Relevante Befehle gefunden:" -ForegroundColor Green
        $history | Select-Object -First 5 | ForEach-Object { Write-Host "      $_" }
    } else {
        Write-Host "   Keine relevanten Befehle" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🔍 SUCHE ABGESCHLOSSEN" -ForegroundColor Cyan
