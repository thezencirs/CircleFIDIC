# -*- coding: utf-8 -*-
# Copyright (c) 2026 thezencirs - Circle FIDIC Studio Voiceover & Zero-Shot Local GPU Voice Cloning Generator
import argparse
import asyncio
import json
import os
import re
import subprocess

FFMPEG = r"C:\Users\zenci\Desktop\Circle_Mix_Record\bin\ffmpeg.exe"
STUDIO_DIR = r"C:\Users\zenci\.gemini\antigravity\scratch\CircleFIDIC\video-studio"
PUBLIC_AUDIO_DIR = os.path.join(STUDIO_DIR, "public", "audio")
os.makedirs(PUBLIC_AUDIO_DIR, exist_ok=True)

LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", os.path.expanduser(r"~\AppData\Local"))
REF_CANDIDATES = [
    os.path.join(LOCAL_APPDATA, "CircleFIDIC", "uploads", "master_voice_ref.wav"),
    r"D:\26FIDIC\Instagram_FIDIC_Carousel_Kartlari\Benim_Ses_Profilim_Referans.wav",
]

DEFAULT_VOICE = "tr-TR-AhmetNeural"
FPS = 30
HANDLE_SEC = 0.45

DEFAULT_SCENES = [
    {
        "id": "s01",
        "num": "01 / 07",
        "kicker": "MİMARİ & MÜHENDİSLİK FELSEFESİ · 1913",
        "title": "FIDIC bir evrak değil, şantiyenin adalet omurgasıdır.",
        "subtitle": "Şantiyelerde en büyük kayıp belirsizlikten doğar; FIDIC görev ve yetkiyi tek çizgide toplar.",
        "tts": "Şantiyelerde en büyük para; demire ya da betona değil, belirsizliğe ve sözlü talimatlara gider. İşte fidik, yüz yılı aşkın süredir bu kaosu bitiren mühendislik felsefesidir."
    },
    {
        "id": "s02",
        "num": "02 / 07",
        "kicker": "TEMEL İLKE · RİSK TERAZİSİ",
        "title": "Riski gizleme. Onu en iyi yönetebilecek tarafa ver.",
        "subtitle": "Yatırımcı arsayı ve finansı, yüklenici üretimi üstlenir; mühendis merkezde tarafsız kalır.",
        "tts": "Temel kural basittir: Riski gizleme, onu en iyi yönetebilecek tarafa ver. Yatırımcı arsayı ve finansı üstlenir; yüklenici üretimi yönetir; mühendis ise merkezde tarafsız dengeyi korur."
    },
    {
        "id": "s03",
        "num": "03 / 07",
        "kicker": "GÖKKUŞAĞI SİSTEMİ · 5 KİTAP 5 ÖLÇEK",
        "title": "Projeyi kim çiziyorsa, sözleşmenin rengi ona göre seçilir.",
        "subtitle": "Villada Yeşil, işveren çiziminde Kırmızı, tünelde Zümrüt, tasarla-yapta Sarı, anahtar teslimde Gümüş.",
        "tts": "Tek kalıp sözleşme yoktur. Küçük villada on beş maddelik Yeşil Kitap, işveren çiziminde Kırmızı, tünelde Zümrüt, tasarla yapta Sarı, anahtar teslimde Gümüş Kitap seçilir."
    },
    {
        "id": "s04",
        "num": "04 / 07",
        "kicker": "SAHA DİSİPLİNİ · MADDE 7.3 MUAYENE",
        "title": "Görülmeden kapatılan imalat, yarının gizli kusurudur.",
        "subtitle": "Donatı ve su yalıtımı kontrol tutanağına bağlanmadan tek kürek beton dökülemez.",
        "tts": "Sahada altın kural: Görülmeden kapatılan her imalat, yarının gizli kusurudur. Su yalıtımı ve demir donatı muayene edilip tutanağa bağlanmadan tek kürek beton dökülemez."
    },
    {
        "id": "s05",
        "num": "05 / 07",
        "kicker": "ZAMAN KALKANI · MADDE 20.2 TIME-BAR",
        "title": "Şantiyede kayıt yoksa hak yoktur. 28 gün geçerse ses duyulmaz.",
        "subtitle": "Gecikme veya zemin sürprizinde 28 takvim günü içinde resmi bildirim zorunludur.",
        "tts": "Şantiyede kayıt yoksa hak da yoktur. Bir gecikme ya da zemin sürprizi yaşandığında, yirmi sekiz gün içinde resmi bildirim yapılmazsa tüm hak düşer."
    },
    {
        "id": "s06",
        "num": "06 / 07",
        "kicker": "NAKİT RİTMİ & TESLİM · MADDE 10 – 14",
        "title": "Hakediş 28 günde onaylanır, 56 günde ödenir.",
        "subtitle": "Kesintiler ustanın verimini eritir; geçici kabul ise bina riskini yatırımcıya devreder.",
        "tts": "Nakit şantiyenin kan dolaşımıdır: Hakediş yirmi sekiz günde onaylanır, elli altı günde ödenir. Geçici kabulle birlikte bina riski yatırımcıya devredilir."
    },
    {
        "id": "s07",
        "num": "07 / 07",
        "kicker": "AÇIK KAYNAK SİSTEM · CIRCLE FIDIC",
        "title": "Bu felsefeyi şantiyeye indirdik: Circle FIDIC.",
        "subtitle": "Yatırımcı, yürütücü, mimar, şef ve usta tek yalın omurgada — GitHub'da ücretsiz açık kaynak.",
        "tts": "Bu felsefeyi yatırımcı, yürütücü, mimar, şantiye şefi ve sahadaki ustanın karmaşasız kullanacağı açık kaynak bir sisteme dönüştürdük. Sörkıl fidik, GitHub üzerinde ücretsiz yayında."
    }
]


def find_voice_reference():
    for path in REF_CANDIDATES:
        if os.path.isfile(path) and os.path.getsize(path) > 4096:
            return path
    return None


def get_duration_sec(filepath):
    p = subprocess.run([FFMPEG, "-i", filepath], capture_output=True, text=True)
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", p.stderr)
    if not m:
        return 6.0
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def normalize_broadcast_wav(raw_in, norm_out):
    subprocess.run(
        [
            FFMPEG, "-y", "-i", raw_in,
            "-af", "highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=5:release=90,loudnorm=I=-16:TP=-1.5:LRA=11",
            "-ar", "48000", "-ac", "2", norm_out,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if os.path.exists(raw_in):
        os.remove(raw_in)


def synthesize_cloned_gpu(scenes, ref_wav):
    os.environ["COQUI_TOS_AGREED"] = "1"
    os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
    if os.path.isdir(r"D:\26FIDIC"):
        cache_root = r"D:\26FIDIC\.voice_clone_cache"
        os.makedirs(cache_root, exist_ok=True)
        os.environ.setdefault("TTS_HOME", os.path.join(cache_root, "tts_models"))
        os.environ.setdefault("HF_HOME", os.path.join(cache_root, "hf"))
        os.environ.setdefault("TORCH_HOME", os.path.join(cache_root, "torch"))

    if os.name == "nt":
        import shutil
        _orig_symlink = os.symlink
        def _safe_symlink(src, dst, *a, **kw):
            try:
                return _orig_symlink(src, dst, *a, **kw)
            except OSError:
                real_src = src if os.path.isabs(src) else os.path.normpath(os.path.join(os.path.dirname(dst), src))
                if os.path.isdir(real_src):
                    shutil.copytree(real_src, dst, dirs_exist_ok=True)
                else:
                    shutil.copy2(real_src, dst)
        os.symlink = _safe_symlink

    import torch
    # PyTorch 2.6+ weights_only compatibility for local TTS checkpoints
    _orig_load = torch.load
    def _compat_load(*a, **kw):
        kw.setdefault("weights_only", False)
        return _orig_load(*a, **kw)
    torch.load = _compat_load

    from TTS.api import TTS

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[VOICE-CLONE] Device={device} | Reference={ref_wav}")
    tts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)

    for sc in scenes:
        raw_wav = os.path.join(PUBLIC_AUDIO_DIR, f"{sc['id']}_raw.wav")
        norm_wav = os.path.join(PUBLIC_AUDIO_DIR, f"{sc['id']}.wav")
        tts_model.tts_to_file(
            text=sc["tts"],
            speaker_wav=ref_wav,
            language="tr",
            file_path=raw_wav,
            split_sentences=True,
        )
        normalize_broadcast_wav(raw_wav, norm_wav)


async def synthesize_fallback_tts(scenes):
    import edge_tts

    for sc in scenes:
        raw_mp3 = os.path.join(PUBLIC_AUDIO_DIR, f"{sc['id']}_raw.mp3")
        norm_wav = os.path.join(PUBLIC_AUDIO_DIR, f"{sc['id']}.wav")
        comm = edge_tts.Communicate(sc["tts"], DEFAULT_VOICE, rate="+5%")
        await comm.save(raw_mp3)
        normalize_broadcast_wav(raw_mp3, norm_wav)


def build_manifest(scenes, voice_mode):
    manifest = []
    total_frames = 0
    for idx, sc in enumerate(scenes, 1):
        norm_wav = os.path.join(PUBLIC_AUDIO_DIR, f"{sc['id']}.wav")
        dur = round(get_duration_sec(norm_wav), 3)
        extra = 1.6 if idx == len(scenes) else HANDLE_SEC
        frames = int(round((dur + extra) * FPS))
        total_frames += frames
        manifest.append(
            {
                **sc,
                "audioFile": f"audio/{sc['id']}.wav",
                "audioSec": dur,
                "durationInFrames": frames,
            }
        )
        print(f"{sc['id']} | {dur:5.2f}s audio -> {frames:3d} frames ({voice_mode})")

    out_json = os.path.join(STUDIO_DIR, "src", "scenes_manifest.json")
    os.makedirs(os.path.dirname(out_json), exist_ok=True)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(
            {
                "fps": FPS,
                "voiceMode": voice_mode,
                "totalFrames": total_frames,
                "scenes": manifest,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    print(f"TOTAL VIDEO: {total_frames} frames ({total_frames / FPS:.1f}s @ {FPS}fps)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--engine", choices=["auto", "clone", "standard"], default="auto")
    parser.add_argument("--scenes-json", default="")
    args = parser.parse_args()

    scenes = DEFAULT_SCENES
    if args.scenes_json and os.path.isfile(args.scenes_json):
        with open(args.scenes_json, "r", encoding="utf-8") as f:
            scenes = json.load(f)

    ref_wav = find_voice_reference()
    use_clone = (args.engine == "clone") or (args.engine == "auto" and ref_wav is not None)

    if use_clone and ref_wav:
        synthesize_cloned_gpu(scenes, ref_wav)
        build_manifest(scenes, "custom_voice_clone")
    else:
        asyncio.run(synthesize_fallback_tts(scenes))
        build_manifest(scenes, "standard_tr")


if __name__ == "__main__":
    main()
