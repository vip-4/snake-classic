param(
  [string]$Url = "http://localhost:8080/",
  [int]$Width = 390,
  [int]$Height = 844,
  [string]$Out = "preview-mobile-390.png",
  [int]$Port = 9223
)

$ErrorActionPreference = "Stop"
$chrome = (Get-Process chrome -ErrorAction Stop | Select-Object -First 1).Path
$profile = Join-Path $env:TEMP ("chrome-cdp-" + [guid]::NewGuid().ToString("N"))
$chromeArgs = @(
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--force-device-scale-factor=1",
  "--remote-debugging-port=$Port",
  "--remote-allow-origins=*",
  "--user-data-dir=$profile",
  "about:blank"
)

$proc = Start-Process -FilePath $chrome -ArgumentList $chromeArgs -PassThru -WindowStyle Hidden
$ws = $null
try {
  $targets = $null
  for ($i = 0; $i -lt 50; $i++) {
    Start-Sleep -Milliseconds 200
    try {
      $json = & curl.exe -s --noproxy "*" "http://127.0.0.1:$Port/json/list" 2>$null
      if ($json) {
        $targets = $json | ConvertFrom-Json
        if ($targets) { break }
      }
    } catch {}
  }
  if (-not $targets) { throw "Chrome DevTools endpoint did not start" }

  $page = $targets | Where-Object { $_.type -eq "page" } | Select-Object -First 1
  if (-not $page) { throw "No page target found" }

  $ws = New-Object System.Net.WebSockets.ClientWebSocket
  $ws.Options.Proxy = $null
  $cts = New-Object System.Threading.CancellationTokenSource
  $ws.ConnectAsync([Uri]$page.webSocketDebuggerUrl, $cts.Token).Wait()

  $script:messageId = 0
  function Send-Cdp([string]$Method, $Params) {
    $script:messageId++
    $payload = @{ id = $script:messageId; method = $Method; params = $Params } | ConvertTo-Json -Compress -Depth 20
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
    $segment = [System.ArraySegment[byte]]::new($bytes)
    $ws.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).Wait()
    return $script:messageId
  }

  function Receive-Cdp {
    $buffer = New-Object byte[] 1048576
    $stream = New-Object System.IO.MemoryStream
    do {
      $segment = [System.ArraySegment[byte]]::new($buffer)
      $result = $ws.ReceiveAsync($segment, $cts.Token).Result
      if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
        throw "WebSocket closed"
      }
      $stream.Write($buffer, 0, $result.Count)
    } while (-not $result.EndOfMessage)
    $text = [System.Text.Encoding]::UTF8.GetString($stream.ToArray())
    $stream.Dispose()
    return ($text | ConvertFrom-Json)
  }

  function Invoke-Cdp([string]$Method, $Params) {
    $id = Send-Cdp $Method $Params
    while ($true) {
      $msg = Receive-Cdp
      if ($msg.id -eq $id) {
        if ($msg.error) { throw ("CDP error: " + ($msg.error | ConvertTo-Json -Compress)) }
        return $msg.result
      }
    }
  }

  Invoke-Cdp "Page.enable" @{} | Out-Null
  Invoke-Cdp "Emulation.setDeviceMetricsOverride" @{
    width = $Width
    height = $Height
    deviceScaleFactor = 1
    mobile = $true
    screenWidth = $Width
    screenHeight = $Height
  } | Out-Null
  Invoke-Cdp "Emulation.setTouchEmulationEnabled" @{ enabled = $true } | Out-Null
  Invoke-Cdp "Page.navigate" @{ url = $Url } | Out-Null

  Start-Sleep -Seconds 2

  $inner = Invoke-Cdp "Runtime.evaluate" @{ expression = "String(innerWidth) + 'x' + String(innerHeight)"; returnByValue = $true }
  Write-Host ("Viewport: " + $inner.result.value)

  $metrics = Invoke-Cdp "Page.getLayoutMetrics" @{}
  $contentWidth = [Math]::Ceiling($metrics.cssContentSize.width)
  $contentHeight = [Math]::Ceiling($metrics.cssContentSize.height)
  Write-Host ("Content: " + $contentWidth + "x" + $contentHeight)

  $shot = Invoke-Cdp "Page.captureScreenshot" @{
    format = "png"
    captureBeyondViewport = $true
    clip = @{ x = 0; y = 0; width = $contentWidth; height = $contentHeight; scale = 1 }
  }
  $outPath = if ([System.IO.Path]::IsPathRooted($Out)) { $Out } else { Join-Path (Split-Path -Parent $PSScriptRoot) $Out }
  [System.IO.File]::WriteAllBytes($outPath, [Convert]::FromBase64String($shot.data))
  Write-Host ("Wrote " + $outPath)
} finally {
  if ($ws) {
    try { $ws.Dispose() } catch {}
  }
  $owned = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine.Contains($profile) }
  foreach ($item in $owned) {
    try {
      $null = & taskkill.exe /PID $item.ProcessId /T /F 2>&1
    } catch {}
  }
  Start-Sleep -Milliseconds 600
  if (Test-Path $profile) { Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue }
}

