# 将站点内的本地地址替换为正式域名。
# 用法：powershell -ExecutionPolicy Bypass -File .\set-site-url.ps1 -SiteUrl "https://snake.example.com/"
# 提示：SiteUrl 末尾的斜杠会自动补齐；替换后请重新生成 sitemap 并提交 Search Console。

param(
  [Parameter(Mandatory = $true)]
  [string]$SiteUrl
)

$ErrorActionPreference = "Stop"

$SiteUrl = $SiteUrl.Trim()
if ($SiteUrl -notmatch "^https?://") {
  throw "SiteUrl must start with http:// or https://"
}
if (-not $SiteUrl.EndsWith("/")) { $SiteUrl += "/" }

$root = $PSScriptRoot
$old = "http://localhost:8080/"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$changed = 0

$files = @(
  "index.html",
  "robots.txt",
  "sitemap.xml",
  "llms.txt"
)

foreach ($name in $files) {
  $path = Join-Path $root $name
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { continue }

  $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  if (-not $text.Contains($old)) {
    Write-Host ("skip  " + $name + " (no local URL found)")
    continue
  }

  $text = $text.Replace($old, $SiteUrl)
  [System.IO.File]::WriteAllText($path, $text, $utf8NoBom)
  Write-Host ("write " + $name)
  $changed++
}

if ($changed -eq 0) {
  Write-Warning "Nothing changed. The site may already use a custom URL."
} else {
  Write-Host ""
  Write-Host "Site URL set to: $SiteUrl"
  Write-Host "Next:"
  Write-Host "  1. Preview with: powershell -ExecutionPolicy Bypass -File .\serve.ps1"
  Write-Host "  2. Deploy the folder to Netlify / Cloudflare Pages / GitHub Pages"
  Write-Host "  3. Submit $($SiteUrl)sitemap.xml to Google Search Console and Bing Webmaster Tools"
}
