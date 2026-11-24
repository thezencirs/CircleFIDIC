# Copyright (c) 2026 thezencirs - Circle FIDIC Build & Single-File Package Script
$ErrorActionPreference = "Stop"
$projRoot = $PSScriptRoot
$wwwDir = Join-Path $projRoot "wwwroot"
$assetsDir = Join-Path $projRoot "Assets"
$zipPath = Join-Path $assetsDir "wwwroot.zip"
$distDir = Join-Path $projRoot "dist"

Stop-Process -Name "CircleFIDIC" -Force -ErrorAction SilentlyContinue

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $wwwDir "*") -DestinationPath $zipPath -Force

if (Test-Path $distDir) { Remove-Item $distDir -Recurse -Force }
New-Item -ItemType Directory -Path $distDir | Out-Null

dotnet publish (Join-Path $projRoot "CircleFIDIC.csproj") `
  -c Release `
  -r win-x64 `
  --self-contained false `
  -p:PublishSingleFile=true `
  -o $distDir

$exeOut = Join-Path $distDir "CircleFIDIC.exe"
$hash = (Get-FileHash -LiteralPath $exeOut -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath (Join-Path $distDir "SHA256SUMS.txt") -Value "$hash  CircleFIDIC.exe" -Encoding UTF8

if (Test-Path "D:\26FIDIC") {
    Copy-Item -LiteralPath $exeOut -Destination "D:\26FIDIC\CircleFIDIC.exe" -Force
}

Write-Host "BUILD COMPLETE: $exeOut"
Get-Item $exeOut | Select-Object FullName, @{N="SizeMB";E={[math]::Round($_.Length/1MB,2)}}
