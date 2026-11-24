# Copyright (c) 2026 thezencirs - Circle FIDIC Automated Local GPU Voice Cloning & Video Renderer
$ErrorActionPreference = "Stop"

$projRoot = Split-Path -Parent $PSScriptRoot
$studioDir = Join-Path $projRoot "video-studio"
$wwwVideos = Join-Path $projRoot "wwwroot\videos"
$dOutDir = "D:\26FIDIC\Instagram_FIDIC_Carousel_Kartlari"
$uploadsDir = Join-Path $env:LOCALAPPDATA "CircleFIDIC\uploads"
New-Item -ItemType Directory -Path $uploadsDir -Force | Out-Null
$statusFile = Join-Path $uploadsDir "voice_render_status.json"

function Write-RenderStatus([string]$state, [string]$msg) {
    $ver = [DateTime]::UtcNow.Ticks.ToString()
    $obj = @{ state = $state; message = $msg; videoVer = $ver } | ConvertTo-Json -Compress
    Set-Content -LiteralPath $statusFile -Value $obj -Encoding UTF8
}

try {
    $venvDir = if (Test-Path "D:\26FIDIC") { "D:\26FIDIC\.voice_clone_env" } else { Join-Path $env:LOCALAPPDATA "CircleFIDIC\voice_env" }
    $venvPy = Join-Path $venvDir "Scripts\python.exe"

    if (-not (Test-Path $venvPy)) {
        Write-RenderStatus "running" "1/3 İlk kurulum: Yerel GPU Türkçe ses klonlama ortamı hazırlanıyor..."
        uv venv $venvDir --python 3.11
        uv pip install --python $venvPy torch torchaudio --index-url https://download.pytorch.org/whl/cu124
        uv pip install --python $venvPy "coqui-tts>=0.25.0" edge-tts
    }

    Write-RenderStatus "running" "2/3 Kendi ses profilinizle tüm sahneler yerel GPU üzerinde seslendiriliyor..."
    $env:COQUI_TOS_AGREED = "1"
    & $venvPy (Join-Path $PSScriptRoot "gen_fidic_voiceover.py") --engine clone

    Write-RenderStatus "running" "3/3 9:16 Reels ve 16:9 Sunum MP4 videoları kare-kare birleştiriliyor..."
    Push-Location $studioDir
    New-Item -ItemType Directory -Path $wwwVideos -Force | Out-Null
    $mp4Reels = Join-Path $wwwVideos "FIDIC_Felsefesi_9x16_Reels_Sesli.mp4"
    $mp4Wide  = Join-Path $wwwVideos "FIDIC_Felsefesi_16x9_Sunum_Sesli.mp4"

    npx remotion render FidicReels9x16 $mp4Reels --codec=h264
    npx remotion render FidicWide16x9  $mp4Wide  --codec=h264
    Pop-Location

    if (Test-Path $dOutDir) {
        Copy-Item -LiteralPath $mp4Reels -Destination (Join-Path $dOutDir "FIDIC_Felsefesi_9x16_Reels_Sesli.mp4") -Force
        Copy-Item -LiteralPath $mp4Wide  -Destination (Join-Path $dOutDir "FIDIC_Felsefesi_16x9_Sunum_Sesli.mp4") -Force
    }

    Write-RenderStatus "done" "Tamamlandı! 9:16 Reels ve 16:9 Sunum videoları kendi sesinizle güncellendi."
}
catch {
    Write-RenderStatus "error" ("Hata oluştu: " + $_.Exception.Message)
    exit 1
}
