# 本地静态服务器（Windows PowerShell，无需 Node/Python）
# 用法：powershell -ExecutionPolicy Bypass -File .\serve.ps1 -Port 8080

param(
  [int]$Port = 8080,
  [string]$Root = "",
  [switch]$NoLog
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Root)) {
  $Root = $PSScriptRoot
}
$Root = [System.IO.Path]::GetFullPath($Root)

$mime = @{
  ".html"        = "text/html; charset=utf-8"
  ".css"         = "text/css; charset=utf-8"
  ".js"          = "text/javascript; charset=utf-8"
  ".mjs"         = "text/javascript; charset=utf-8"
  ".json"        = "application/json; charset=utf-8"
  ".webmanifest" = "application/manifest+json; charset=utf-8"
  ".xml"         = "application/xml; charset=utf-8"
  ".txt"         = "text/plain; charset=utf-8"
  ".svg"         = "image/svg+xml"
  ".png"         = "image/png"
  ".jpg"         = "image/jpeg"
  ".jpeg"        = "image/jpeg"
  ".webp"        = "image/webp"
  ".ico"         = "image/x-icon"
  ".woff2"       = "font/woff2"
  ".map"         = "application/json; charset=utf-8"
}

function Send-Bytes {
  param(
    [System.Net.HttpListenerContext]$Context,
    [byte[]]$Bytes,
    [string]$ContentType,
    [int]$StatusCode = 200,
    [string]$CacheControl = "no-cache"
  )

  $response = $Context.Response
  $response.StatusCode = $StatusCode
  $response.ContentType = $ContentType
  $response.Headers["Cache-Control"] = $CacheControl
  $response.Headers["X-Content-Type-Options"] = "nosniff"
  $response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
  $response.ContentLength64 = $Bytes.Length

  if ($Context.Request.HttpMethod -ne "HEAD") {
    $response.OutputStream.Write($Bytes, 0, $Bytes.Length)
  }
  $response.OutputStream.Close()
}

function Send-File {
  param(
    [System.Net.HttpListenerContext]$Context,
    [string]$FilePath,
    [string]$RelativePath
  )

  if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
    return $false
  }

  $extension = [System.IO.Path]::GetExtension($FilePath).ToLowerInvariant()
  $contentType = $mime[$extension]
  if (-not $contentType) { $contentType = "application/octet-stream" }

  $bytes = [System.IO.File]::ReadAllBytes($FilePath)
  $cache = "no-cache"
  if ($RelativePath -like "assets/*") { $cache = "public, max-age=86400" }
  if ($RelativePath -eq "sw.js") { $cache = "no-cache" }

  Send-Bytes -Context $Context -Bytes $bytes -ContentType $contentType -CacheControl $cache
  if (-not $NoLog) {
    Write-Host ("200 " + $Context.Request.HttpMethod + " " + $RelativePath)
  }
  return $true
}

if (-not (Test-Path -LiteralPath $Root -PathType Container)) {
  throw "Root directory not found: $Root"
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
} catch {
  throw "Cannot listen on $prefix. Try another -Port. $($_.Exception.Message)"
}

Write-Host ""
Write-Host "  Snake Classic static server"
Write-Host "  Serving : $Root"
Write-Host "  URL     : http://localhost:$Port/"
Write-Host "  Stop    : Ctrl+C"
Write-Host ""

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request

    try {
      $rawPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
      $relative = $rawPath.TrimStart("/")
      if ([string]::IsNullOrWhiteSpace($relative)) { $relative = "index.html" }
      $relative = $relative -replace "/", [System.IO.Path]::DirectorySeparatorChar

      $candidate = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Root, $relative))
      if (-not $candidate.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
        Send-Bytes -Context $context -Bytes $body -ContentType "text/plain; charset=utf-8" -StatusCode 403
        continue
      }

      if (Test-Path -LiteralPath $candidate -PathType Container) {
        $relative = [System.IO.Path]::Combine($relative, "index.html")
        $candidate = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Root, $relative))
      }

      $served = Send-File -Context $context -FilePath $candidate -RelativePath ($relative -replace "\\", "/")
      if (-not $served) {
        $notFoundPath = Join-Path $Root "404.html"
        if (Test-Path -LiteralPath $notFoundPath -PathType Leaf) {
          $bytes = [System.IO.File]::ReadAllBytes($notFoundPath)
          Send-Bytes -Context $context -Bytes $bytes -ContentType "text/html; charset=utf-8" -StatusCode 404
        } else {
          $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
          Send-Bytes -Context $context -Bytes $bytes -ContentType "text/plain; charset=utf-8" -StatusCode 404
        }
        if (-not $NoLog) {
          Write-Host ("404 " + $request.HttpMethod + " " + $rawPath)
        }
      }
    } catch {
      try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes("500 Internal Server Error")
        Send-Bytes -Context $context -Bytes $bytes -ContentType "text/plain; charset=utf-8" -StatusCode 500
      } catch {
        # Client may have disconnected.
      }
      if (-not $NoLog) {
        Write-Host ("500 " + $request.HttpMethod + " " + $request.Url.AbsolutePath + " - " + $_.Exception.Message)
      }
    }
  }
} finally {
  if ($listener.IsListening) { $listener.Stop() }
  $listener.Close()
  Write-Host "Server stopped."
}
