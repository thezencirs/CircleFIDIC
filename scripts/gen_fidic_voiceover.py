# -*- coding: utf-8 -*-
# Copyright (c) 2026 thezencirs - Circle FIDIC Studio Voiceover & Frame-Exact Timing Generator
import asyncio, json, os, re, subprocess
import edge_tts

FFMPEG = r"C:\Users\zenci\Desktop\Circle_Mix_Record\bin\ffmpeg.exe"
STUDIO_DIR = r"C:\Users\zenci\.gemini\antigravity\scratch\CircleFIDIC\video-studio"
PUBLIC_AUDIO_DIR = os.path.join(STUDIO_DIR, "public", "audio")
os.makedirs(PUBLIC_AUDIO_DIR, exist_ok=True)

VOICE = "tr-TR-AhmetNeural"
FPS = 30
HANDLE_SEC = 0.45  # breathing room after voice ends per presentation-video skill

SCENES = [
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

def get_duration_sec(filepath):
    p = subprocess.run([FFMPEG, "-i", filepath], capture_output=True, text=True)
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", p.stderr)
    if not m:
        return 6.0
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))

async def main():
    manifest = []
    total_frames = 0
    for idx, sc in enumerate(SCENES, 1):
        raw_mp3 = os.path.join(PUBLIC_AUDIO_DIR, f"{sc['id']}_raw.mp3")
        norm_wav = os.path.join(PUBLIC_AUDIO_DIR, f"{sc['id']}.wav")
        comm = edge_tts.Communicate(sc["tts"], VOICE, rate="+5%")
        await comm.save(raw_mp3)

        # Normalize to broadcast -16 LUFS clean 48kHz WAV via FFmpeg
        subprocess.run([
            FFMPEG, "-y", "-i", raw_mp3,
            "-af", "highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=5:release=90,loudnorm=I=-16:TP=-1.5:LRA=11",
            "-ar", "48000", "-ac", "2", norm_wav
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        os.remove(raw_mp3)

        dur = round(get_duration_sec(norm_wav), 3)
        extra = 1.6 if idx == len(SCENES) else HANDLE_SEC  # Hold final CTA frame >= 2s
        frames = int(round((dur + extra) * FPS))
        total_frames += frames
        item = {
            **sc,
            "audioFile": f"audio/{sc['id']}.wav",
            "audioSec": dur,
            "durationInFrames": frames
        }
        manifest.append(item)
        print(f"{sc['id']} | {dur:5.2f}s audio -> {frames:3d} frames")

    out_json = os.path.join(STUDIO_DIR, "src", "scenes_manifest.json")
    os.makedirs(os.path.dirname(out_json), exist_ok=True)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump({"fps": FPS, "totalFrames": total_frames, "scenes": manifest}, f, ensure_ascii=False, indent=2)
    print(f"TOTAL VIDEO: {total_frames} frames ({total_frames / FPS:.1f}s @ {FPS}fps)")

if __name__ == "__main__":
    asyncio.run(main())
