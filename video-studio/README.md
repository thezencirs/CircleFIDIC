# 🎬 Circle FIDIC — Open-Source Motion-Graphics & Turkish Voiceover Video Studio

Built with **Remotion (`remotion-dev/remotion`) + Neural Turkish TTS (`edge-tts` `tr-TR-AhmetNeural`) + FFmpeg `-16 LUFS` Mastering** — zero paid APIs, 100% deterministic frame-by-frame architectural animation locked to per-scene voiceover duration.

## Quick Commands

```powershell
# 1. Generate / update 7 Turkish voiceover WAVs & frame-exact scenes_manifest.json
uv run --with edge-tts python ..\scripts\gen_fidic_voiceover.py

# 2. Install & open live interactive Remotion Studio preview
npm install
npm run studio

# 3. Render 9:16 Vertical Reels (1080x1920) & 16:9 Presentation (1920x1080) MP4
npm run render:reels
npm run render:wide
```
