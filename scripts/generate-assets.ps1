# Generates PNG icons and the Open Graph image with System.Drawing.
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\generate-assets.ps1
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root "assets"
if (-not (Test-Path $assets)) { New-Item -ItemType Directory -Path $assets | Out-Null }

function New-RoundedPath([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = [single]($r * 2)
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Fill-RoundedRect($g, $brush, [single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $p = New-RoundedPath $x $y $w $h $r
  $g.FillPath($brush, $p)
  $p.Dispose()
}

function Draw-CenteredText($g, [string]$text, $font, $brush, [single]$x, [single]$y, [single]$w, [single]$h) {
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF($x, $y, $w, $h)
  $g.DrawString($text, $font, $brush, $rect, $fmt)
  $fmt.Dispose()
}

function New-Icon([int]$size, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::Transparent)

  $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(255, 18, 30, 58),
    [System.Drawing.Color]::FromArgb(255, 8, 13, 24),
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
  )
  Fill-RoundedRect $g $bg 0 0 $size $size ([single]($size * 0.22))
  $bg.Dispose()

  # Subtle grid
  $gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(18, 140, 173, 230), [single]([Math]::Max(1, $size / 256)))
  $step = $size / 8.0
  for ($i = 1; $i -lt 8; $i++) {
    $g.DrawLine($gridPen, [single]($i * $step), 0, [single]($i * $step), $size)
    $g.DrawLine($gridPen, 0, [single]($i * $step), $size, [single]($i * $step))
  }
  $gridPen.Dispose()

  $s = $size / 64.0
  $blocks = @(
    @{ x = 14; y = 36; c = "#7cff6b" },
    @{ x = 26; y = 36; c = "#7cff6b" },
    @{ x = 26; y = 24; c = "#a8ff9c" },
    @{ x = 38; y = 24; c = "#7cff6b" }
  )
  foreach ($b in $blocks) {
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($b.c))
    Fill-RoundedRect $g $brush ([single]($b.x * $s)) ([single]($b.y * $s)) ([single](12 * $s)) ([single](12 * $s)) ([single](3 * $s))
    $brush.Dispose()
  }

  # Food
  $foodBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#ff5a7a"))
  $g.FillEllipse($foodBrush, [single](41.5 * $s), [single](10.5 * $s), [single](9 * $s), [single](9 * $s))
  $foodBrush.Dispose()

  # Eye on head
  $eyeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 11, 26, 16))
  $g.FillEllipse($eyeBrush, [single](40.5 * $s), [single](27 * $s), [single](2.6 * $s), [single](2.6 * $s))
  $g.FillEllipse($eyeBrush, [single](44.9 * $s), [single](27 * $s), [single](2.6 * $s), [single](2.6 * $s))
  $eyeBrush.Dispose()

  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "Wrote $path"
}

function New-OgImage([string]$path) {
  $w = 1200
  $h = 630
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $rect = New-Object System.Drawing.RectangleF(0, 0, $w, $h)
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(255, 9, 15, 28),
    [System.Drawing.Color]::FromArgb(255, 4, 7, 14),
    90
  )
  $g.FillRectangle($bg, $rect)
  $bg.Dispose()

  # Ambient glows
  $glowGreen = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(26, 124, 255, 107))
  $g.FillEllipse($glowGreen, -180, -220, 760, 620)
  $glowGreen.Dispose()
  $glowBlue = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, 80, 130, 255))
  $g.FillEllipse($glowBlue, 720, -180, 720, 640)
  $glowBlue.Dispose()

  # Grid
  $gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(14, 140, 173, 230), 1)
  for ($x = 0; $x -le $w; $x += 60) { $g.DrawLine($gridPen, $x, 0, $x, $h) }
  for ($y = 0; $y -le $h; $y += 60) { $g.DrawLine($gridPen, 0, $y, $w, $y) }
  $gridPen.Dispose()

  # Left copy
  $green = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#7cff6b"))
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 234, 240, 255))
  $muted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 154, 169, 201))
  $dim = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 111, 127, 164))

  $fontBrand = New-Object System.Drawing.Font("Segoe UI", 96, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fontBrand2 = New-Object System.Drawing.Font("Segoe UI", 96, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fontCn = New-Object System.Drawing.Font("Microsoft YaHei", 40, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fontTag = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $fontChip = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

  # Build CJK text from code points so this script stays ASCII-safe on Windows PowerShell 5.1.
  $cnTitle = -join ([int[]](0x8D2A, 0x5403, 0x86C7, 0x7ECF, 0x5178, 0x7248) | ForEach-Object { [char]$_ })
  $dot = [char]0x00B7
  $times = [char]0x00D7

  $g.DrawString("SNAKE", $fontBrand, $white, 80, 132)
  $g.DrawString("CLASSIC", $fontBrand2, $green, 80, 232)
  $g.DrawString($cnTitle, $fontCn, $white, 84, 356)
  $g.DrawString("FREE  $dot  OPEN SOURCE  $dot  LIGHTWEIGHT", $fontTag, $muted, 86, 424)

  # Chips
  $chipBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 25, 48))
  $chipPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90, 124, 255, 107), 1)
  $chipY = 492
  $chips = @("20${times}15 GRID", "150 MS TICK", "MIT LICENSE")
  $chipX = 84
  foreach ($chip in $chips) {
    $sizeF = $g.MeasureString($chip, $fontChip)
    $cw = [single]($sizeF.Width + 34)
    $ch = [single]40
    Fill-RoundedRect $g $chipBrush $chipX $chipY $cw $ch 20
    $g.DrawPath($chipPen, (New-RoundedPath $chipX $chipY $cw $ch 20))
    $g.DrawString($chip, $fontChip, $green, ($chipX + 17), ($chipY + 7))
    $chipX += $cw + 12
  }
  $chipBrush.Dispose()
  $chipPen.Dispose()

  # Board illustration
  $bx = 760
  $by = 150
  $bw = 360
  $bh = 270
  $boardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 8, 14, 25))
  Fill-RoundedRect $g $boardBrush $bx $by $bw $bh 22
  $boardBrush.Dispose()
  $boardPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, 124, 255, 107), 2)
  $g.DrawPath($boardPen, (New-RoundedPath $bx $by $bw $bh 22))
  $boardPen.Dispose()

  $cell = 18
  $cols = 20
  $rows = 15
  $gridPen2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(24, 140, 173, 230), 1)
  for ($i = 0; $i -le $cols; $i++) {
    $px = $bx + ($i * $cell)
    $g.DrawLine($gridPen2, $px, $by, $px, ($by + $rows * $cell))
  }
  for ($j = 0; $j -le $rows; $j++) {
    $py = $by + ($j * $cell)
    $g.DrawLine($gridPen2, $bx, $py, ($bx + $cols * $cell), $py)
  }
  $gridPen2.Dispose()

  $sx = $bx + 2
  $sy = $by + 2
  $segments = @(
    @{ x = 4; y = 7 }, @{ x = 5; y = 7 }, @{ x = 6; y = 7 }, @{ x = 7; y = 7 },
    @{ x = 7; y = 6 }, @{ x = 7; y = 5 }, @{ x = 8; y = 5 }, @{ x = 9; y = 5 },
    @{ x = 9; y = 4 }, @{ x = 10; y = 4 }
  )
  $segIndex = 0
  foreach ($seg in $segments) {
    if ($segIndex -eq ($segments.Count - 1)) {
      $segBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#c3ffb5"))
    } else {
      $segBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#6bf05c"))
    }
    $px = $sx + ($seg.x * $cell) + 1.5
    $py = $sy + ($seg.y * $cell) + 1.5
    Fill-RoundedRect $g $segBrush $px $py ($cell - 4) ($cell - 4) 4
    $segBrush.Dispose()
    $segIndex++
  }

  $foodBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#ff5a7a"))
  $g.FillEllipse($foodBrush, ($sx + 13 * $cell + 5), ($sy + 2 * $cell + 5), 12, 12)
  $foodBrush.Dispose()

  $fontScore = New-Object System.Drawing.Font("Consolas", 20, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $g.DrawString("SCORE  120", $fontScore, $green, $bx + 18, ($by + $bh + 22))
  $g.DrawString("BEST  120", $fontScore, $dim, ($bx + 210), ($by + $bh + 22))

  # Footer line
  $linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(40, 148, 173, 230), 1)
  $g.DrawLine($linePen, 80, 580, 1120, 580)
  $linePen.Dispose()
  $fontSmall = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $g.DrawString("Play instantly in your browser  $dot  No download  $dot  No tracking", $fontSmall, $dim, 82, 592)
  $g.DrawString("snake classic", $fontSmall, $dim, 1010, 592)

  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "Wrote $path"
}

New-Icon 192 (Join-Path $assets "icon-192.png")
New-Icon 512 (Join-Path $assets "icon-512.png")
New-Icon 180 (Join-Path $assets "apple-touch-icon.png")
New-OgImage (Join-Path $assets "og-image.png")
Write-Host "Done."
