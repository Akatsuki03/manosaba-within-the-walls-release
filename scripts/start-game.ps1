param([switch]$CheckOnly, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

$env:MANOSABA_EDITION = 'llm'
$llmEdition = $true
if (-not $env:MANOSABA_DATA_DIR) { $env:MANOSABA_DATA_DIR = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.manosaba\llm-test-v1' }

function Get-ProfileId {
    # Match the server's canonical data directory without exposing its path to
    # other browser tabs. This check never creates or modifies a data profile.
    $identity = & node.exe --input-type=module -e "import { createHash } from 'node:crypto'; import { existsSync, realpathSync } from 'node:fs'; import { resolve, join } from 'node:path'; import { homedir } from 'node:os'; const directory = resolve(process.env.MANOSABA_DATA_DIR || join(homedir(), '.manosaba', 'llm-test-v1')); if (!existsSync(directory)) { console.log('missing'); } else { const canonical = realpathSync(directory); console.log(createHash('sha256').update(process.platform === 'win32' ? canonical.toLowerCase() : canonical).digest('hex')); }"
    if ($LASTEXITCODE -ne 0 -or -not $identity) { throw 'Could not identify the requested game data profile.' }
    return $identity.Trim()
}

function Refresh-Path {
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + $env:Path
}
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
function Test-Node {
    $node = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $node) { return $false }
    & $node.Source -e "if (Number(process.versions.node.split('.')[0]) < 24) process.exit(1); require('node:sqlite');"
    return ($LASTEXITCODE -eq 0)
}
function Require-Dependencies {
    Write-Host '[1/3] Checking Node.js 24+ and SQLite...'
    if (-not (Test-Node)) {
        if ($CheckOnly) { throw 'Node.js 24+ with built-in SQLite is required.' }
        $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
        if (-not $winget) { throw 'Automatic installation needs winget. Install Node.js 24+ from https://nodejs.org/ and run this launcher again.' }
        Write-Host 'Installing/upgrading Node.js LTS via winget. Windows may ask for administrator approval.'
        & $winget.Source install --id OpenJS.NodeJS.LTS --exact --source winget --accept-package-agreements --accept-source-agreements --disable-interactivity
        Refresh-Path
        if (-not (Test-Node)) { throw 'Node.js installation did not provide a compatible runtime. Restart this launcher, or install Node.js 24+ from https://nodejs.org/.' }
    }
    Write-Host ('Node.js ' + (& node.exe --version))
    Write-Host '[2/3] Checking project modules, dependencies and UI assets...'
    # Import the engine without constructing it: missing scenario modules must fail
    # before reporting readiness, opening a browser, or touching a game database.
    & node.exe --input-type=module -e "import './src/prologue.mjs';"
    if ($LASTEXITCODE -ne 0) { throw 'Game modules could not be loaded. Restore missing or invalid src files before launching.' }
    if ($llmEdition) {
        # Syntax checking is inert: no profile initialization or model request.
        & node.exe --check 'scripts/start-llm.mjs'
        if ($LASTEXITCODE -ne 0) { throw 'The LLM launch entry is missing or invalid. Restore scripts/start-llm.mjs before launching.' }
    }
    $package = Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
    $deps = @()
    if ($package.dependencies) { $deps += @($package.dependencies.PSObject.Properties.Name) }
    if ($package.devDependencies) { $deps += @($package.devDependencies.PSObject.Properties.Name) }
    if ($deps.Count -gt 0) {
        $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
        if (-not $npm) { throw 'npm is missing. Repair the Node.js installation and retry.' }
        if ($CheckOnly) {
            & $npm.Source ls --depth=0
        } elseif (Test-Path -LiteralPath (Join-Path $root 'package-lock.json')) {
            & $npm.Source ci --no-audit --no-fund
        } else {
            & $npm.Source install --no-audit --no-fund
        }
        if ($LASTEXITCODE -ne 0) { throw 'Project dependency check/installation failed. Check network access and the npm output above.' }
    } else { Write-Host 'No third-party npm dependencies are required.' }
    # User-supplied scenery ships with the project; never replace it with title artwork.
    $backgrounds = & node.exe --input-type=module -e "import { BACKGROUND_FILES } from './public/scene-backgrounds.mjs'; for (const name of BACKGROUND_FILES) console.log(name)"
    if ($LASTEXITCODE -ne 0 -or -not $backgrounds) { throw 'Could not read the scene background list from public/scene-backgrounds.mjs.' }
    foreach ($name in @($backgrounds)) {
        if (-not (Test-Path -LiteralPath (Join-Path $root ('public/assets/backgrounds/' + $name)))) {
            throw ('Missing scene background: public/assets/backgrounds/' + $name + '. Restore the supplied background folder.')
        }
    }
    # Download only version-pinned image assets; never execute upstream project code.
    # Use exactly the HTTP resource manifest; a second handwritten list had
    # drifted behind the server and omitted save/load, avatar and map assets.
    $assetJson = & node.exe --input-type=module -e "import { VENDOR_DOWNLOADS } from './src/host/static-assets.mjs'; console.log(JSON.stringify(VENDOR_DOWNLOADS));"
    if ($LASTEXITCODE -ne 0 -or -not $assetJson) { throw 'Could not read the runtime UI asset list.' }
    $assets = $assetJson | ConvertFrom-Json
    foreach ($asset in @($assets)) {
        $relative = $asset.file
        $target = Join-Path $root $relative
        if (-not (Test-Path -LiteralPath $target)) {
            if ($CheckOnly) { throw ('Missing UI asset: ' + $relative) }
            $null = New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force
            $url = $asset.url
            Write-Host ('Downloading UI asset: ' + $relative)
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            try { Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile ($target + '.download') }
            catch { Remove-Item -LiteralPath ($target + '.download') -Force -ErrorAction SilentlyContinue; throw }
            Move-Item -LiteralPath ($target + '.download') -Destination $target -Force
        }
    }
    # Check local derivatives too, without creating a profile or starting HTTP.
    & node.exe --input-type=module -e "import { statSync } from 'node:fs'; import { join } from 'node:path'; import { STATIC_FILES } from './src/host/static-assets.mjs'; for (const [file] of Object.values(STATIC_FILES)) { if (!statSync(join('public', file)).isFile()) throw new Error('Missing runtime asset: ' + file); }"
    if ($LASTEXITCODE -ne 0) { throw 'Required local runtime assets are missing. Restore the release files before launching.' }
}

try {
    Require-Dependencies
    if ($CheckOnly) { Write-Host 'All launch requirements passed.'; exit 0 }
    $port = 3211
    if ($env:PORT) {
        $parsed = 0
        if (-not [int]::TryParse($env:PORT, [ref]$parsed) -or $parsed -lt 1 -or $parsed -gt 65535) { throw 'PORT must be an integer between 1 and 65535.' }
        $port = $parsed
    }
    $env:PORT = [string]$port
    $entryPoint = 'scripts/start-llm.mjs'
    # Initialization copies only encrypted settings. Never launch src/server.mjs
    # merely to prepare a profile, and never prepare anything in CheckOnly mode.
    if ($llmEdition) {
        & node.exe 'scripts/start-llm.mjs' --prepare-only
        if ($LASTEXITCODE -ne 0) { throw 'The isolated LLM profile could not be prepared.' }
    }
    $url = 'http://127.0.0.1:' + $port
    try { $existing = Invoke-RestMethod -Uri ($url + '/api/view') -TimeoutSec 2 }
    catch { $existing = $null }
    if ($existing -and ($existing.prototypeNotice -or $existing.exampleId -eq 'agent') -and $existing.csrfToken -and $null -ne $existing.generation) {
        try { $health = Invoke-RestMethod -Uri ($url + '/api/health') -TimeoutSec 2 }
        catch { $health = $null }
        if (-not $health -or $health.application -ne 'manosaba-local' -or $health.profileId -ne (Get-ProfileId)) {
            throw ('A game is already running on port ' + $port + ', but its data profile does not match or cannot be verified. Close that instance or set PORT to another number; no progress was changed and no process was stopped.')
        }
        Write-Host ('Game is already running: ' + $url)
        if (-not $NoBrowser) { Start-Process $url }
        exit 0
    }
    # Built-in .NET works even when Windows' optional NetTCPIP module cannot load.
    $listener = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() | Where-Object { $_.Port -eq $port }
    if ($listener) { throw ('Port ' + $port + ' is in use by another service. Set PORT to a different number; no process was stopped.') }
    Write-Host ('[3/3] Starting game: ' + $url)
    Write-Host 'Keep this window open. Press Ctrl+C to stop the game.'
    $process = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList $entryPoint -WorkingDirectory $root -NoNewWindow -PassThru
    try {
        $ready = $false
        for ($i = 0; $i -lt 40; $i++) {
            if ($process.HasExited) { throw ('Game service exited with code ' + $process.ExitCode) }
            try {
                $view = Invoke-RestMethod -Uri ($url + '/api/view') -TimeoutSec 1
                if ($view.csrfToken -and ($view.prototypeNotice -or $view.exampleId -eq 'agent')) {
                    $health = Invoke-RestMethod -Uri ($url + '/api/health') -TimeoutSec 1
                    if ($health.application -eq 'manosaba-local' -and $health.profileId -eq (Get-ProfileId)) { $ready = $true; break }
                }
            } catch { }
            Start-Sleep -Milliseconds 250
        }
        if (-not $ready) { throw 'Game service did not become ready. Check the output above.' }
        if (-not $NoBrowser) { Start-Process $url }
        $process.WaitForExit()
        if ($process.ExitCode -ne 0) { throw ('Game service exited with code ' + $process.ExitCode) }
    } finally {
        if (-not $process.HasExited) {
            # The LLM entry owns one server child. Stop only this launch's tree
            # on a readiness failure; never stop a process discovered by port.
            if ($llmEdition) { & taskkill.exe /PID $process.Id /T /F | Out-Null }
            else { Stop-Process -Id $process.Id -ErrorAction SilentlyContinue }
        }
    }
} catch {
    Write-Host ('Launch failed: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
