# Своя Игра — Windows launcher
# Проверяет Node.js, при отсутствии предлагает установить через winget.
# Ставит зависимости, собирает и запускает локальный preview-сервер с открытием браузера.

$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectDir

function Write-Step($msg) { Write-Host $msg -ForegroundColor Yellow }
function Write-Ok  ($msg) { Write-Host $msg -ForegroundColor Green }
function Write-Err ($msg) { Write-Host $msg -ForegroundColor Red }

function Ask-YN($prompt, [bool]$defaultYes = $true) {
    $hint = if ($defaultYes) { "[Y/n]" } else { "[y/N]" }
    $reply = Read-Host "$prompt $hint"
    if ([string]::IsNullOrWhiteSpace($reply)) { return $defaultYes }
    return $reply -match '^(y|Y|yes|YES|да|Да)$'
}

function Find-Node {
    $cmd = Get-Command node -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Path }
    $candidates = @(
        "$env:ProgramFiles\nodejs\node.exe",
        "$env:ProgramFiles(x86)\nodejs\node.exe",
        "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
    )
    foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
    return $null
}

function Install-Node {
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        Write-Step "Устанавливаю Node.js через winget…"
        & winget install -e --id OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
        return ($LASTEXITCODE -eq 0)
    }
    $choco = Get-Command choco -ErrorAction SilentlyContinue
    if ($choco) {
        Write-Step "Устанавливаю Node.js через Chocolatey…"
        & choco install -y nodejs-lts
        return ($LASTEXITCODE -eq 0)
    }
    Write-Err "Ни winget, ни choco не найдены. Скачайте Node.js LTS: https://nodejs.org"
    return $false
}

# --- 0. Node ---
$nodePath = Find-Node
if (-not $nodePath) {
    Write-Err "Node.js не найден."
    if (Ask-YN "Попробовать установить Node.js LTS автоматически?" $true) {
        if (-not (Install-Node)) {
            Write-Err "Установка не удалась. Скачайте https://nodejs.org и запустите скрипт снова."
            exit 1
        }
        # Обновим переменные окружения текущей сессии
        $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
        $nodePath = Find-Node
        if (-not $nodePath) {
            Write-Err "Node.js всё ещё не доступен. Закройте и откройте терминал/перезагрузите ПК и запустите скрипт снова."
            exit 1
        }
    } else {
        Write-Err "Установите Node.js (https://nodejs.org) и запустите скрипт снова."
        exit 1
    }
}

$nodeDir = Split-Path -Parent $nodePath
$npmCmd  = Join-Path $nodeDir "npm.cmd"
if (-not (Test-Path $npmCmd)) { $npmCmd = "npm" }

Write-Ok ("Node.js: " + (& $nodePath --version) + " ($nodePath)")
Write-Ok ("npm:     " + (& $npmCmd  --version))

# --- 1. Зависимости ---
$installedFlag = "node_modules\.installed"
$needInstall = $false
if (-not (Test-Path "node_modules")) { $needInstall = $true }
elseif (-not (Test-Path $installedFlag)) { $needInstall = $true }
elseif ((Get-Item "package.json").LastWriteTime -gt (Get-Item $installedFlag).LastWriteTime) { $needInstall = $true }

if ($needInstall) {
    Write-Step "Устанавливаю зависимости…"
    & $npmCmd install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { Write-Err "npm install завершился с ошибкой."; exit 1 }
    New-Item -Type File -Force $installedFlag | Out-Null
} else {
    Write-Ok "Зависимости актуальны."
}

# --- 2. Сборка ---
$needBuild = $false
if (-not (Test-Path "dist")) { $needBuild = $true }
else {
    $latestSrc = (Get-ChildItem -Recurse -File src,package.json | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
    $distTime  = (Get-Item "dist").LastWriteTime
    if ($latestSrc -gt $distTime) { $needBuild = $true }
}
if ($needBuild) {
    Write-Step "Собираю приложение…"
    & $npmCmd run build
    if ($LASTEXITCODE -ne 0) { Write-Err "Сборка не удалась."; exit 1 }
}

# --- 3. Старт ---
$port = if ($env:PORT) { $env:PORT } else { "5173" }
Write-Step "Запускаю Своя Игра на http://localhost:$port"

# Откроем браузер через 1.5 секунды
Start-Job -ScriptBlock {
    param($u)
    Start-Sleep -Seconds 2
    Start-Process $u
} -ArgumentList "http://localhost:$port" | Out-Null

& $npmCmd run preview -- --host --port $port
exit $LASTEXITCODE
