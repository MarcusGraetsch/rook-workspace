# Chrome History Search - MoltCities Evidence
# PowerShell Script für Marcus

Write-Host "🔍 SUCHE NACH MOLTCITIES-SPuren..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Chrome History durchsuchen
Write-Host "`n📁 1. Chrome History..." -ForegroundColor Yellow
$ChromeHistoryPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\History"
if (Test-Path $ChromeHistoryPath) {
    Write-Host "   Chrome History gefunden: $ChromeHistoryPath" -ForegroundColor Green
    Write-Host "   (Kopiere die Datei und nutze SQLite Browser zum Ansehen)" -ForegroundColor Gray
    Write-Host "   Oder installiere: https://www.nirsoft.net/utils/chrome_history_view.html" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Chrome History nicht gefunden" -ForegroundColor Red
}

# 2. Chrome Login Data (gespeicherte Passwörter)
Write-Host "`n📁 2. Chrome Login Data..." -ForegroundColor Yellow
$ChromeLoginPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Login Data"
if (Test-Path $ChromeLoginPath) {
    Write-Host "   ✅ Login Data gefunden" -ForegroundColor Green
} else {
    Write-Host "   ❌ Nicht gefunden" -ForegroundColor Red
}

# 3. Chrome Preferences (Einstellungen, Autofill)
Write-Host "`n📁 3. Chrome Preferences durchsuchen..." -ForegroundColor Yellow
$ChromePrefsPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Preferences"
if (Test-Path $ChromePrefsPath) {
    $prefs = Get-Content $ChromePrefsPath -Raw
    if ($prefs -match "moltcities|moltbook|MoltCities") {
        Write-Host "   ✅ MoltCities-Einträge in Preferences gefunden!" -ForegroundColor Green
        # Extrahiere Kontext
        $matches = [regex]::Matches($prefs, ".{0,50}molt.{0,50}")
        foreach ($match in $matches) {
            Write-Host "   📝 $($match.Value)" -ForegroundColor White
        }
    } else {
        Write-Host "   ❌ Keine MoltCities-Einträge" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ Preferences nicht gefunden" -ForegroundColor Red
}

# 4. Windows Event Logs (System & Application)
Write-Host "`n📁 4. Windows Event Logs (2026-02-11)..." -ForegroundColor Yellow
try {
    $StartDate = Get-Date "2026-02-10"
    $EndDate = Get-Date "2026-02-13"
    
    $events = Get-WinEvent -FilterHashtable @{
        LogName = 'Application','System','Security'
        StartTime = $StartDate
        EndTime = $EndDate
    } -ErrorAction SilentlyContinue | Where-Object { 
        $_.Message -match "chrome|browser|curl|api|molt" 
    } | Select-Object -First 20
    
    if ($events) {
        Write-Host "   ✅ $($events.Count) relevante Events gefunden" -ForegroundColor Green
        $events | Format-Table TimeCreated, Id, LevelDisplayName, Message -AutoSize | Out-String | Write-Host
    } else {
        Write-Host "   ❌ Keine relevanten Events" -ForegroundColor Red
    }
} catch {
    Write-Host "   ⚠️  Fehler beim Lesen der Event Logs (Admin-Rechte nötig?)" -ForegroundColor Yellow
}

# 5. File System nach "molt" oder "evan" durchsuchen
Write-Host "`n📁 5. Dateisystem-Suche nach 'molt' oder 'evan'..." -ForegroundColor Yellow
$SearchPaths = @(
    "$env:USERPROFILE\Downloads",
    "$env:USERPROFILE\Documents",
    "$env:USERPROFILE\Desktop",
    "$env:LOCALAPPDATA\Temp"
)

foreach ($path in $SearchPaths) {
    if (Test-Path $path) {
        $files = Get-ChildItem -Path $path -Recurse -File -ErrorAction SilentlyContinue | 
                 Where-Object { $_.Name -match "molt|evan" -or $_.FullName -match "molt|evan" } |
                 Select-Object -First 10
        if ($files) {
            Write-Host "   ✅ Gefunden in $path`:" -ForegroundColor Green
            $files | ForEach-Object { Write-Host "      - $($_.FullName)" }
        }
    }
}

# 6. Browser Cache nach moltcities.org durchsuchen
Write-Host "`n📁 6. Chrome Cache durchsuchen..." -ForegroundColor Yellow
$ChromeCachePath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
if (Test-Path $ChromeCachePath) {
    Write-Host "   Cache-Verzeichnis: $ChromeCachePath" -ForegroundColor Gray
    Write-Host "   (Nutze: https://www.nirsoft.net/utils/chrome_cache_view.html)" -ForegroundColor Gray
}

# 7. Windows PowerShell History
Write-Host "`n📁 7. PowerShell History..." -ForegroundColor Yellow
$PSHistoryPath = (Get-PSReadlineOption).HistorySavePath
if (Test-Path $PSHistoryPath) {
    $history = Get-Content $PSHistoryPath | Where-Object { $_ -match "molt|curl|api" }
    if ($history) {
        Write-Host "   ✅ Relevante Befehle gefunden:" -ForegroundColor Green
        $history | ForEach-Object { Write-Host "      $_" }
    } else {
        Write-Host "   ❌ Keine relevanten Befehle" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🔍 SUCHE ABGESCHLOSSEN" -ForegroundColor Cyan
Write-Host "`nNützliche Tools:" -ForegroundColor Gray
Write-Host "  - SQLite Browser: https://sqlitebrowser.org/" -ForegroundColor Gray
Write-Host "  - Chrome History View: https://www.nirsoft.net/utils/chrome_history_view.html" -ForegroundColor Gray
Write-Host "  - Chrome Cache View: https://www.nirsoft.net/utils/chrome_cache_view.html" -ForegroundColor Gray
