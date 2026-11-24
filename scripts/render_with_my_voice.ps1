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
    if (Test-Path "D:\26FIDIC") {
        $venvDir = "D:\26FIDIC\.voice_clone_env"
        $cacheRoot = "D:\26FIDIC\.voice_clone_cache"
        New-Item -ItemType Directory -Path $cacheRoot -Force | Out-Null
        $env:UV_CACHE_DIR = Join-Path $cacheRoot "uv"
        $env:TTS_HOME = Join-Path $cacheRoot "tts_models"
        $env:HF_HOME = Join-Path $cacheRoot "hf"
        $env:TORCH_HOME = Join-Path $cacheRoot "torch"
        $env:TMP = Join-Path $cacheRoot "tmp"
        $env:TEMP = Join-Path $cacheRoot "tmp"
        New-Item -ItemType Directory -Path $env:TMP -Force | Out-Null
    } else {
        $venvDir = Join-Path $env:LOCALAPPDATA "CircleFIDIC\voice_env"
    }
    $venvPy = Join-Path $venvDir "Scripts\python.exe"

    if (-not (Test-Path $venvPy)) {
        Write-RenderStatus "running" "1/3 İlk kurulum: Yerel GPU Türkçe ses klonlama ortamı hazırlanıyor..."
        uv venv $venvDir --python 3.11
        uv pip install --python $venvPy "torch==2.5.1" "torchaudio==2.5.1" --index-url https://download.pytorch.org/whl/cu124
        uv pip install --python $venvPy "coqui-tts==0.28.0" "transformers>=4.57.0,<5.0.0" six soundfile edge-tts
    }

    Write-RenderStatus "running" "2/3 Kendi ses profilinizle tüm sahneler yerel GPU üzerinde seslendiriliyor..."
    $env:COQUI_TOS_AGREED = "1"
    & $venvPy (Join-Path $PSScriptRoot "gen_fidic_voiceover.py") --engine clone
    if ($LASTEXITCODE -ne 0) { throw "Ses klonlama adımı başarısız oldu (kod: $LASTEXITCODE)." }

    Write-RenderStatus "running" "3/3 9:16 Reels ve 16:9 Sunum MP4 videoları kare-kare birleştiriliyor..."
    Push-Location $studioDir
    New-Item -ItemType Directory -Path $wwwVideos -Force | Out-Null
    $mp4Reels = Join-Path $wwwVideos "FIDIC_Felsefesi_9x16_Reels_Sesli.mp4"
    $mp4Wide  = Join-Path $wwwVideos "FIDIC_Felsefesi_16x9_Sunum_Sesli.mp4"

    npx remotion render FidicReels9x16 $mp4Reels --codec=h264
    if ($LASTEXITCODE -ne 0) { Pop-Location; throw "9:16 video birleştirme hatası." }
    npx remotion render FidicDeck16x9  $mp4Wide  --codec=h264
    if ($LASTEXITCODE -ne 0) { Pop-Location; throw "16:9 video birleştirme hatası." }
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
