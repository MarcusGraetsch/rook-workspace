# Chrome History Search - MoltCities Evidence
# PowerShell Script fuer Marcus - OHNE Sonderzeichen

Write-Host "SUCHE NACH MOLTCITIES-SPuren" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Chrome History
Write-Host "1. Chrome History..." -ForegroundColor Yellow
$ChromeHistoryPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\History"
if (Test-Path $ChromeHistoryPath) {
    Write-Host "   GEFUNDEN: $ChromeHistoryPath" -ForegroundColor Green
    Write-Host "   (SQLite DB - mit SQLite Browser oeffnen)" -ForegroundColor Gray
} else {
    Write-Host "   NICHT GEFUNDEN" -ForegroundColor Red
}
Write-Host ""

# Chrome Login Data  
Write-Host "2. Chrome Login Data..." -ForegroundColor Yellow
$ChromeLoginPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Login Data"
if (Test-Path $ChromeLoginPath) {
    Write-Host "   GEFUNDEN" -ForegroundColor Green
} else {
    Write-Host "   NICHT GEFUNDEN" -ForegroundColor Red
}
Write-Host ""

# Chrome Preferences
Write-Host "3. Chrome Preferences..." -ForegroundColor Yellow
$ChromePrefsPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Preferences"
if (Test-Path $ChromePrefsPath) {
    Write-Host "   GEFUNDEN" -ForegroundColor Green
    $prefs = Get-Content $ChromePrefsPath -Raw
    if ($prefs -match "molt") {
        Write-Host "   --> MOLTCITIES-EINTRAG GEFUNDEN!" -ForegroundColor Green
    } else {
        Write-Host "   Keine MoltCities-Eintraege" -ForegroundColor Gray
    }
} else {
    Write-Host "   NICHT GEFUNDEN" -ForegroundColor Red
}
Write-Host ""

# Firefox
Write-Host "4. Firefox History..." -ForegroundColor Yellow
$FirefoxPath = "$env:APPDATA\Mozilla\Firefox\Profiles"
if (Test-Path $FirefoxPath) {
    Write-Host "   Firefox Profile gefunden" -ForegroundColor Green
} else {
    Write-Host "   Firefox nicht gefunden" -ForegroundColor Red
}
Write-Host ""

# PowerShell History
Write-Host "5. PowerShell History..." -ForegroundColor Yellow
try {
    $PSHistoryPath = (Get-PSReadlineOption).HistorySavePath
    if (Test-Path $PSHistoryPath) {
        $history = Get-Content $PSHistoryPath -ErrorAction SilentlyContinue | Where-Object { $_ -match "molt|curl|api" }
        if ($history) {
            Write-Host "   GEFUNDEN:" -ForegroundColor Green
            $history | Select-Object -First 3 | ForEach-Object { Write-Host "      $_" }
        } else {
            Write-Host "   Keine relevanten Befehle" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   Fehler beim Lesen" -ForegroundColor Yellow
}
Write-Host ""

# Downloads
Write-Host "6. Downloads durchsuchen..." -ForegroundColor Yellow
$Downloads = "$env:USERPROFILE\Downloads"
if (Test-Path $Downloads) {
    $files = Get-ChildItem -Path $Downloads -File | Where-Object { $_.Name -match "molt|config|api" } | Select-Object -First 5
    if ($files) {
        Write-Host "   Dateien gefunden:" -ForegroundColor Green
        $files | ForEach-Object { Write-Host "      $($_.Name)" }
    } else {
        Write-Host "   Keine passenden Dateien" -ForegroundColor Gray
    }
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SUCHE ABGESCHLOSSEN" -ForegroundColor Cyan
Write-Host ""
Write-Host "Nuetzliche Tools:" -ForegroundColor Gray
Write-Host "  - SQLite Browser: sqlitebrowser.org" -ForegroundColor Gray
Write-Host "  - Chrome History View: nirsoft.net" -ForegroundColor Gray
