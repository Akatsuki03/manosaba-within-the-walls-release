Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

function U([int[]]$codes) {
    return -join ($codes | ForEach-Object { [char]$_ })
}

# Strings via Unicode codepoints so the script works under any Windows codepage without BOM
$strLlmEdition   = U @(0x6B63,0x5F0F,0x0020,0x004C,0x004C,0x004D,0x0020,0x7248) # 正式 LLM 版
$strTitlePrefix  = U @(0x9B54,0x6CD5,0x5C11,0x5973,0x7684,0x9B54,0x5973,0x88C1,0x5224,0xFF1A,0x9AD8,0x5899,0x4E4B,0x5185,0x0020,0x2014,0x0020,0x542F,0x52A8,0x5668) # 魔法少女的魔女裁判：高墙之内 — 启动器
$strReady        = U @(0x51C6,0x5907,0x5C31,0x7EEA)                             # 准备就绪
$strLocalUrl     = U @(0x672C,0x673A,0x5730,0x5740,0x003A,0x0020)               # 本机地址: 
$strBtnStop      = U @(0x505C,0x6B62,0x670D,0x52A1)                             # 停止服务
$strBtnStart     = U @(0x542F,0x52A8,0x670D,0x52A1)                             # 启动服务
$strBtnBrowser   = U @(0x6253,0x5F00,0x6E38,0x620F,0x7F51,0x9875)               # 打开游戏网页
$strBtnClear     = U @(0x6E05,0x7A7A,0x65E5,0x5FD7)                             # 清空日志
$strStarting     = U @(0x6B63,0x5728,0x68C0,0x67E5,0x73AF,0x5883,0x5E76,0x542F,0x52A8,0x670D,0x52A1,0x002E,0x002E,0x002E) # 正在检查环境并启动服务...
$strRunning      = U @(0x540E,0x53F0,0x670D,0x52A1,0x8FD0,0x884C,0x4E2D)         # 后台服务运行中
$strStopping     = U @(0x6B63,0x5728,0x505C,0x6B62,0x540E,0x53F0,0x670D,0x52A1,0x002E,0x002E,0x002E) # 正在停止后台服务...
$strStoppedLog   = U @(0x540E,0x53F0,0x670D,0x52A1,0x5DF2,0x505C,0x6B62,0x3002) # 后台服务已停止。
$strStopped      = U @(0x670D,0x52A1,0x5DF2,0x505C,0x6B62)                      # 服务已停止
$strStartBanner  = U @(0x003D,0x003D,0x003D,0x0020,0x5F00,0x59CB,0x542F,0x52A8) # === 开始启动
$strExitedErr    = U @(0x670D,0x52A1,0x5F02,0x5E38,0x9000,0x51FA,0x0020,0x0028,0x4EE3,0x7801,0x0020) # 服务异常退出 (代码 
$strReadyMatch   = U @(0x9B54,0x6CD5,0x5C11,0x5973,0x7684,0x9B54,0x5973,0x88C1,0x5224) # 魔法少女的魔女裁判

$script:llmEdition = $true
$env:MANOSABA_EDITION = 'llm'
if (-not $env:MANOSABA_DATA_DIR) { $env:MANOSABA_DATA_DIR = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.manosaba\llm-test-v1' }
$script:port = 3211
if ($env:PORT) {
    $parsed = 0
    if ([int]::TryParse($env:PORT, [ref]$parsed) -and $parsed -ge 1 -and $parsed -le 65535) {
        $script:port = $parsed
    }
}
$env:PORT = [string]$script:port
$script:url = 'http://127.0.0.1:' + $script:port

$script:workerProcess = $null
$script:outEvent = $null
$script:errEvent = $null
$script:logQueue = [System.Collections.Queue]::Synchronized((New-Object System.Collections.Queue))
$script:serviceState = 'stopped'

function Enqueue-Log([string]$text) {
    if ($null -eq $text) { return }
    $timestamp = (Get-Date).ToString('HH:mm:ss')
    foreach ($line in ($text -split "`r?`n")) {
        if ($line.Length -gt 0) {
            $script:logQueue.Enqueue("[$timestamp] $line")
        }
    }
}

$form = New-Object System.Windows.Forms.Form
$editionTitle = $strLlmEdition
$form.Text = "$strTitlePrefix ($editionTitle)"
$form.Size = New-Object System.Drawing.Size(760, 480)
$form.MinimumSize = New-Object System.Drawing.Size(620, 360)
$form.StartPosition = 'CenterScreen'
$form.BackColor = [System.Drawing.Color]::FromArgb(24, 24, 30)
$form.ForeColor = [System.Drawing.Color]::FromArgb(235, 235, 242)
$form.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 9.5)

$topPanel = New-Object System.Windows.Forms.Panel
$topPanel.Dock = 'Top'
$topPanel.Height = 64
$topPanel.Padding = New-Object System.Windows.Forms.Padding(14, 12, 14, 12)
$topPanel.BackColor = [System.Drawing.Color]::FromArgb(32, 32, 42)

$statusDot = New-Object System.Windows.Forms.Label
$statusDot.Text = [string][char]0x25CF
$statusDot.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 14, [System.Drawing.FontStyle]::Bold)
$statusDot.ForeColor = [System.Drawing.Color]::FromArgb(140, 140, 155)
$statusDot.AutoSize = $true
$statusDot.Location = New-Object System.Drawing.Point(14, 18)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = $strReady
$statusLabel.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 10.5, [System.Drawing.FontStyle]::Bold)
$statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(235, 235, 242)
$statusLabel.AutoSize = $true
$statusLabel.Location = New-Object System.Drawing.Point(40, 12)

$urlLabel = New-Object System.Windows.Forms.Label
$urlLabel.Text = $strLocalUrl + $script:url
$urlLabel.Font = New-Object System.Drawing.Font('Consolas', 9)
$urlLabel.ForeColor = [System.Drawing.Color]::FromArgb(165, 165, 185)
$urlLabel.AutoSize = $true
$urlLabel.Location = New-Object System.Drawing.Point(42, 36)

$btnPanel = New-Object System.Windows.Forms.FlowLayoutPanel
$btnPanel.Dock = 'Right'
$btnPanel.AutoSize = $true
$btnPanel.FlowDirection = 'LeftToRight'
$btnPanel.WrapContents = $false
$btnPanel.Padding = New-Object System.Windows.Forms.Padding(0, 4, 0, 0)

function New-StyledButton([string]$text, [int]$width, [System.Drawing.Color]$bg) {
    $btn = New-Object System.Windows.Forms.Button
    $btn.Text = $text
    $btn.Size = New-Object System.Drawing.Size($width, 34)
    $btn.FlatStyle = 'Flat'
    $btn.FlatAppearance.BorderSize = 1
    $btn.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(70, 70, 90)
    $btn.BackColor = $bg
    $btn.ForeColor = [System.Drawing.Color]::White
    $btn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $btn.Margin = New-Object System.Windows.Forms.Padding(6, 0, 0, 0)
    return $btn
}

$btnToggle = New-StyledButton $strBtnStop 108 ([System.Drawing.Color]::FromArgb(170, 52, 62))
$btnBrowser = New-StyledButton $strBtnBrowser 124 ([System.Drawing.Color]::FromArgb(58, 96, 175))
$btnClear = New-StyledButton $strBtnClear 88 ([System.Drawing.Color]::FromArgb(52, 52, 66))

$btnPanel.Controls.Add($btnToggle)
$btnPanel.Controls.Add($btnBrowser)
$btnPanel.Controls.Add($btnClear)

$topPanel.Controls.Add($btnPanel)
$topPanel.Controls.Add($statusDot)
$topPanel.Controls.Add($statusLabel)
$topPanel.Controls.Add($urlLabel)

$logBox = New-Object System.Windows.Forms.RichTextBox
$logBox.Dock = 'Fill'
$logBox.ReadOnly = $true
$logBox.BackColor = [System.Drawing.Color]::FromArgb(16, 16, 22)
$logBox.ForeColor = [System.Drawing.Color]::FromArgb(215, 220, 228)
$logBox.Font = New-Object System.Drawing.Font('Consolas', 9.5)
$logBox.BorderStyle = 'None'
$logBox.ScrollBars = 'Vertical'
$logBox.DetectUrls = $true
$logBox.add_LinkClicked({
    param($sender, $e)
    try { Start-Process $e.LinkText } catch { }
})

$form.Controls.Add($logBox)
$form.Controls.Add($topPanel)

function Update-UiState([string]$state, [string]$statusText) {
    $script:serviceState = $state
    $statusLabel.Text = $statusText
    switch ($state) {
        'starting' {
            $statusDot.ForeColor = [System.Drawing.Color]::FromArgb(230, 175, 45)
            $btnToggle.Text = $strBtnStop
            $btnToggle.BackColor = [System.Drawing.Color]::FromArgb(170, 52, 62)
            $btnBrowser.Enabled = $false
        }
        'running' {
            $statusDot.ForeColor = [System.Drawing.Color]::FromArgb(65, 195, 105)
            $btnToggle.Text = $strBtnStop
            $btnToggle.BackColor = [System.Drawing.Color]::FromArgb(170, 52, 62)
            $btnBrowser.Enabled = $true
        }
        default {
            $statusDot.ForeColor = [System.Drawing.Color]::FromArgb(140, 140, 155)
            $btnToggle.Text = $strBtnStart
            $btnToggle.BackColor = [System.Drawing.Color]::FromArgb(46, 138, 82)
            $btnBrowser.Enabled = $false
        }
    }
}

function Stop-GameService {
    if ($script:outEvent) {
        Unregister-Event -SourceIdentifier $script:outEvent.Name -ErrorAction SilentlyContinue
        Remove-Job -Id $script:outEvent.Id -Force -ErrorAction SilentlyContinue
        $script:outEvent = $null
    }
    if ($script:errEvent) {
        Unregister-Event -SourceIdentifier $script:errEvent.Name -ErrorAction SilentlyContinue
        Remove-Job -Id $script:errEvent.Id -Force -ErrorAction SilentlyContinue
        $script:errEvent = $null
    }
    if ($script:workerProcess) {
        try {
            if (-not $script:workerProcess.HasExited) {
                Enqueue-Log $strStopping
                & taskkill.exe /PID $script:workerProcess.Id /T /F 2>&1 | Out-Null
            }
        } catch { }
        try { $script:workerProcess.Dispose() } catch { }
        $script:workerProcess = $null
        Enqueue-Log $strStoppedLog
    }
    Update-UiState 'stopped' $strStopped
}

function Start-GameService([bool]$openBrowserOnStart = $true) {
    if ($script:workerProcess -and -not $script:workerProcess.HasExited) {
        return
    }
    Update-UiState 'starting' $strStarting
    Enqueue-Log "$strStartBanner ($editionTitle) ==="

    $startScript = Join-Path $PSScriptRoot 'start-game.ps1'
    $argsList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$startScript`"")
    if (-not $openBrowserOnStart) { $argsList += '-NoBrowser' }

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'powershell.exe'
    $psi.Arguments = ($argsList -join ' ')
    $psi.WorkingDirectory = $root
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
    $psi.StandardErrorEncoding = [System.Text.Encoding]::UTF8

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi
    $proc.EnableRaisingEvents = $true

    $outId = 'ManosabaOut_' + [Guid]::NewGuid().ToString('N')
    $errId = 'ManosabaErr_' + [Guid]::NewGuid().ToString('N')

    $script:outEvent = Register-ObjectEvent -InputObject $proc -EventName OutputDataReceived -SourceIdentifier $outId -MessageData $script:logQueue -Action {
        if ($null -ne $EventArgs.Data -and $EventArgs.Data.Length -gt 0) {
            $ts = (Get-Date).ToString('HH:mm:ss')
            $Event.MessageData.Enqueue("[$ts] " + $EventArgs.Data)
        }
    }
    $script:errEvent = Register-ObjectEvent -InputObject $proc -EventName ErrorDataReceived -SourceIdentifier $errId -MessageData $script:logQueue -Action {
        if ($null -ne $EventArgs.Data -and $EventArgs.Data.Length -gt 0) {
            $ts = (Get-Date).ToString('HH:mm:ss')
            $Event.MessageData.Enqueue("[$ts] [ERR] " + $EventArgs.Data)
        }
    }

    [void]$proc.Start()
    $proc.BeginOutputReadLine()
    $proc.BeginErrorReadLine()
    $script:workerProcess = $proc
}

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 120
$timer.add_Tick({
    $batch = New-Object System.Text.StringBuilder
    while ($script:logQueue.Count -gt 0) {
        $line = [string]$script:logQueue.Dequeue()
        [void]$batch.AppendLine($line)
        if ($line.Contains($strReadyMatch) -or $line.Contains('Game is already running:') -or $line.Contains('http://127.0.0.1:')) {
            if ($script:serviceState -eq 'starting' -and ($line.Contains($strReadyMatch) -or $line.Contains('Game is already running:'))) {
                Update-UiState 'running' $strRunning
            }
        }
    }
    if ($batch.Length -gt 0) {
        $logBox.AppendText($batch.ToString())
        $logBox.SelectionStart = $logBox.TextLength
        $logBox.ScrollToCaret()
    }
    if ($script:workerProcess -and $script:workerProcess.HasExited) {
        $exitCode = $script:workerProcess.ExitCode
        Stop-GameService
        if ($exitCode -ne 0) {
            Update-UiState 'stopped' ($strExitedErr + $exitCode + ')')
            $statusDot.ForeColor = [System.Drawing.Color]::FromArgb(220, 75, 75)
        } else {
            Update-UiState 'stopped' $strStopped
        }
        $batchAfter = New-Object System.Text.StringBuilder
        while ($script:logQueue.Count -gt 0) {
            [void]$batchAfter.AppendLine([string]$script:logQueue.Dequeue())
        }
        if ($batchAfter.Length -gt 0) {
            $logBox.AppendText($batchAfter.ToString())
            $logBox.SelectionStart = $logBox.TextLength
            $logBox.ScrollToCaret()
        }
    }
})

$btnToggle.add_Click({
    if ($script:serviceState -eq 'stopped') {
        Start-GameService $false
    } else {
        Stop-GameService
    }
})

$btnBrowser.add_Click({
    try { Start-Process $script:url } catch { }
})

$btnClear.add_Click({
    $logBox.Clear()
})

$form.add_Shown({
    $timer.Start()
    Start-GameService $true
})

$form.add_FormClosing({
    $timer.Stop()
    Stop-GameService
})

[void]$form.ShowDialog()
