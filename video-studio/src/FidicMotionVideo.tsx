// Copyright (c) 2026 thezencirs - Frame-Deterministic Architectural Motion Graphics for Circle FIDIC
import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import manifest from "./scenes_manifest.json";

export const THEME = {
  bgTop: "#FAF9F5",
  bgBot: "#F1F0EA",
  ink: "#0F172A",
  muted: "#475569",
  border: "#CBD5E1",
  cobalt: "#1D4ED8",
  crimson: "#DC2626",
  emerald: "#059669",
  amber: "#D97706",
  font: '"Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif',
  mono: "Consolas, monospace",
} as const;

type SceneData = (typeof manifest.scenes)[number];

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const SceneArtwork: React.FC<{ id: string; frame: number; fps: number }> = ({ id, frame, fps }) => {
  if (id === "s01") {
    const lineDraw = interpolate(frame, [5, 38], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
    const towerRise = spring({ frame: frame - 14, fps, config: { damping: 18, stiffness: 120 } });
    const craneExt = interpolate(frame, [28, 62], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
    const pills = ["ADİL DENGE", "NET GÖREV", "SIFIR KARMAŞA"];

    return (
      <svg viewBox="0 0 860 560" style={{ width: "100%", height: "100%" }}>
        <g stroke="#CBD5E1" strokeWidth={1.2} opacity={0.65}>
          <line x1={80} y1={90} x2={780} y2={90} />
          <line x1={80} y1={210} x2={780} y2={210} />
          <line x1={80} y1={330} x2={780} y2={330} />
          {[220, 430, 640].map((x, i) => (
            <line
              key={x}
              x1={x}
              y1={45}
              x2={x}
              y2={45 + 430 * lineDraw}
              strokeDasharray="7,6"
            />
          ))}
        </g>
        {["A", "B", "C"].map((lbl, i) => {
          const x = 220 + i * 210;
          const p = spring({ frame: frame - i * 6, fps, config: { damping: 12, stiffness: 180 } });
          return (
            <g key={lbl} transform={`translate(${x}, 40) scale(${p})`}>
              <circle r={16} fill="#FFF" stroke={THEME.ink} strokeWidth={2.5} />
              <text y={5} textAnchor="middle" fontSize={14} fontWeight={800} fill={THEME.ink}>
                {lbl}
              </text>
            </g>
          );
        })}

        {/* Ground & Raft Foundation */}
        <line x1={90} y1={430} x2={90 + 680 * lineDraw} y2={430} stroke={THEME.ink} strokeWidth={4} />
        <rect
          x={245}
          y={430}
          width={310}
          height={42 * towerRise}
          fill="#FFFFFF"
          stroke={THEME.ink}
          strokeWidth={3}
        />

        {/* Rising Building Cross-Section */}
        <g style={{ opacity: towerRise }}>
          <rect
            x={275}
            y={430 - 285 * towerRise}
            width={250}
            height={285 * towerRise}
            fill="#FFFFFF"
            stroke={THEME.ink}
            strokeWidth={3.5}
          />
          {[1, 2, 3, 4].map((lvl) => {
            const y = 430 - lvl * 57 * towerRise;
            return <line key={lvl} x1={275} y1={y} x2={525} y2={y} stroke={THEME.ink} strokeWidth={2} />;
          })}
          <line x1={400} y1={430 - 285 * towerRise} x2={400} y2={430} stroke={THEME.ink} strokeWidth={2} />
        </g>

        {/* Animated Tower Crane */}
        <g stroke={THEME.cobalt} strokeWidth={3.5} fill="none" opacity={craneExt}>
          <line x1={640} y1={430} x2={640} y2={430 - 340 * craneExt} />
          <line x1={640 - 250 * craneExt} y1={95} x2={640 + 95 * craneExt} y2={95} />
          <polyline points="605,95 640,62 680,95" />
          <line x1={455} y1={95} x2={455} y2={145} />
        </g>

        <text x={112} y={418} fontFamily={THEME.mono} fontSize={15} fontWeight={800} fill={THEME.cobalt} opacity={lineDraw}>
          ±0.00 ZEMİN
        </text>
        <text x={112} y={152} fontFamily={THEME.mono} fontSize={15} fontWeight={800} fill={THEME.cobalt} opacity={craneExt}>
          +38.40 ÇATI
        </text>

        {/* Staggered 3 Pillars */}
        {pills.map((txt, idx) => {
          const s = spring({ frame: frame - (42 + idx * 9), fps, config: { damping: 15, mass: 0.7 } });
          return (
            <g
              key={txt}
              transform={`translate(${135 + idx * 205}, ${495 + (1 - s) * 24})`}
              opacity={s}
            >
              <rect width={185} height={44} rx={8} fill={idx === 1 ? THEME.cobalt : THEME.ink} />
              <text x={92.5} y={28} textAnchor="middle" fontSize={14.5} fontWeight={800} fill="#FFF">
                {txt}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  if (id === "s02") {
    const baseEnter = spring({ frame: frame - 4, fps, config: { damping: 16 } });
    const tiltDeg = interpolate(frame, [0, 22, 48, 72], [-8, 5, -1.8, 0], clamp);
    const leftCard = spring({ frame: frame - 24, fps, config: { damping: 14 } });
    const rightCard = spring({ frame: frame - 44, fps, config: { damping: 14 } });
    const engBadge = spring({ frame: frame - 66, fps, config: { damping: 15 } });

    return (
      <svg viewBox="0 0 860 560" style={{ width: "100%", height: "100%" }}>
        <line x1={100} y1={450} x2={760} y2={450} stroke={THEME.border} strokeWidth={2.5} />
        <g opacity={baseEnter}>
          <polygon points="430,275 375,450 485,450" fill="#FFFFFF" stroke={THEME.ink} strokeWidth={3.5} />
          <line x1={396} y1={388} x2={464} y2={388} stroke={THEME.ink} strokeWidth={2.2} />
        </g>

        {/* Balanced Beam with Damped Engineering Settle */}
        <g transform={`rotate(${tiltDeg} 430 275)`}>
          <line x1={125} y1={275} x2={735} y2={275} stroke={THEME.ink} strokeWidth={6.5} />
          <circle cx={430} cy={275} r={14} fill={THEME.cobalt} />

          <g opacity={leftCard} transform={`translate(70, ${92 + (1 - leftCard) * 22})`}>
            <rect width={250} height={140} rx={12} fill="#FFF" stroke={THEME.ink} strokeWidth={3} />
            <text x={125} y={38} textAnchor="middle" fontSize={18} fontWeight={800} fill={THEME.ink}>
              YATIRIMCI (MD. 2)
            </text>
            <text x={125} y={76} textAnchor="middle" fontSize={15.5} fill={THEME.muted}>
              Arsa &amp; Yer Teslimi
            </text>
            <text x={125} y={104} textAnchor="middle" fontSize={15.5} fill={THEME.muted}>
              Finansman &amp; Ödeme
            </text>
            <line x1={125} y1={140} x2={125} y2={183} stroke={THEME.ink} strokeWidth={3} />
          </g>

          <g opacity={rightCard} transform={`translate(540, ${92 + (1 - rightCard) * 22})`}>
            <rect width={250} height={140} rx={12} fill="#FFF" stroke={THEME.ink} strokeWidth={3} />
            <text x={125} y={38} textAnchor="middle" fontSize={18} fontWeight={800} fill={THEME.ink}>
              YÜKLENİCİ (MD. 4)
            </text>
            <text x={125} y={76} textAnchor="middle" fontSize={15.5} fill={THEME.muted}>
              Üretim, Ekip &amp; Hız
            </text>
            <text x={125} y={104} textAnchor="middle" fontSize={15.5} fill={THEME.muted}>
              Kalite, İSG &amp; İaşe
            </text>
            <line x1={125} y1={140} x2={125} y2={183} stroke={THEME.ink} strokeWidth={3} />
          </g>
        </g>

        <g opacity={engBadge} transform={`translate(285, ${475 + (1 - engBadge) * 20})`}>
          <rect width={290} height={58} rx={10} fill={THEME.cobalt} />
          <text x={145} y={26} textAnchor="middle" fontSize={15.5} fontWeight={800} fill="#FFF">
            TARAFSIZ MÜHENDİS (MD. 3.7)
          </text>
          <text x={145} y={46} textAnchor="middle" fontSize={13} fill="#DBEAFE">
            42 + 42 Gün Adil Karar Noktası
          </text>
        </g>
      </svg>
    );
  }

  if (id === "s03") {
    const books = [
      { name: "YEŞİL", sub: "15 Madde", scale: "Villa / Mikro", h: 115, color: "#059669" },
      { name: "KIRMIZI", sub: "Birim Fiyat", scale: "İşveren Çizer", h: 165, color: "#DC2626" },
      { name: "ZÜMRÜT", sub: "GBR Zemin", scale: "Tünel / Metro", h: 205, color: "#047857" },
      { name: "SARI", sub: "Götürü", scale: "Tasarla-Yap", h: 245, color: "#D97706" },
      { name: "GÜMÜŞ", sub: "%84 Risk", scale: "EPC Turnkey", h: 295, color: "#334155" },
    ];
    const arrowDraw = interpolate(frame, [75, 120], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

    return (
      <svg viewBox="0 0 860 560" style={{ width: "100%", height: "100%" }}>
        <line x1={55} y1={435} x2={805} y2={435} stroke={THEME.ink} strokeWidth={3.5} />
        {books.map((b, i) => {
          const grow = spring({ frame: frame - (12 + i * 16), fps, config: { damping: 14, stiffness: 120 } });
          const bh = b.h * grow;
          const x = 75 + i * 148;
          return (
            <g key={b.name}>
              <rect x={x} y={435 - bh} width={118} height={bh} rx={8} fill={b.color} />
              {grow > 0.45 && (
                <g opacity={interpolate(grow, [0.45, 0.95], [0, 1], clamp)}>
                  <text x={x + 59} y={435 - bh + 42} textAnchor="middle" fontSize={16} fontWeight={800} fill="#FFF">
                    {b.name}
                  </text>
                  <text x={x + 59} y={435 - bh + 68} textAnchor="middle" fontSize={13} fill="rgba(255,255,255,0.9)">
                    {b.sub}
                  </text>
                </g>
              )}
              <text x={x + 59} y={468} textAnchor="middle" fontSize={13.5} fontWeight={800} fill={THEME.ink} opacity={grow}>
                {b.scale}
              </text>
            </g>
          );
        })}
        <line x1={85} y1={512} x2={85 + 690 * arrowDraw} y2={512} stroke={THEME.cobalt} strokeWidth={3} />
        <text x={430} y={540} textAnchor="middle" fontSize={14} fontWeight={800} fill={THEME.cobalt} opacity={arrowDraw}>
          SAĞA GİTTİKÇE TASARIM VE ZEMİN RİSKİ YÜKLENİCİYE GEÇER ───►
        </text>
      </svg>
    );
  }

  if (id === "s04") {
    const boxIn = spring({ frame: frame - 4, fps, config: { damping: 16 } });
    const memDraw = interpolate(frame, [16, 56], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
    const steps = ["01 Numune", "02 Uygulama", "03 Muayene", "04 Beton"];

    return (
      <svg viewBox="0 0 860 560" style={{ width: "100%", height: "100%" }}>
        <g opacity={boxIn}>
          <rect x={95} y={85} width={670} height={240} rx={12} fill="#FFF" stroke={THEME.ink} strokeWidth={3} />
          <text x={430} y={142} textAnchor="middle" fontSize={18} fontWeight={800} fill={THEME.crimson}>
            DUR! TUTANAKSIZ ÜSTÜ KAPATILAMAZ (MD. 7.3)
          </text>
          <line
            x1={135}
            y1={215}
            x2={135 + 590 * memDraw}
            y2={215}
            stroke={THEME.cobalt}
            strokeWidth={6}
            strokeDasharray="16,7"
          />
          <text x={430} y={195} textAnchor="middle" fontSize={14} fontWeight={800} fill={THEME.cobalt} opacity={memDraw}>
            SU YALITIMI &amp; DEMİR DONATI HATTI
          </text>
          <line x1={145} y1={260} x2={715} y2={260} stroke={THEME.ink} strokeWidth={3} />
          <line x1={145} y1={290} x2={715} y2={290} stroke={THEME.ink} strokeWidth={3} />
          {[190, 285, 380, 475, 570, 665].map((cx) => (
            <circle key={cx} cx={cx} cy={275} r={7} fill={THEME.ink} />
          ))}
        </g>

        {steps.map((st, i) => {
          const p = spring({ frame: frame - (38 + i * 14), fps, config: { damping: 14 } });
          const x = 85 + i * 176;
          return (
            <g key={st} transform={`translate(${x}, ${390 + (1 - p) * 24})`} opacity={p}>
              <rect
                width={160}
                height={94}
                rx={10}
                fill={i === 2 ? THEME.cobalt : "#FFFFFF"}
                stroke={i === 2 ? THEME.cobalt : THEME.ink}
                strokeWidth={2.5}
              />
              <text
                x={80}
                y={54}
                textAnchor="middle"
                fontSize={16.5}
                fontWeight={800}
                fill={i === 2 ? "#FFFFFF" : THEME.ink}
              >
                {st}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  if (id === "s05") {
    const rawCount = interpolate(frame, [10, 52], [0, 28], { ...clamp, easing: Easing.out(Easing.cubic) });
    const dayNum = Math.round(rawCount);
    const dimProgress = interpolate(frame, [10, 52], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
    const day84Enter = spring({ frame: frame - 64, fps, config: { damping: 15 } });

    return (
      <svg viewBox="0 0 860 560" style={{ width: "100%", height: "100%" }}>
        <line x1={110} y1={150} x2={110 + 380 * dimProgress} y2={150} stroke={THEME.crimson} strokeWidth={4} />
        <line x1={110} y1={120} x2={110} y2={310} stroke={THEME.ink} strokeWidth={2.2} strokeDasharray="6,5" />
        <line x1={490} y1={120} x2={490} y2={310} stroke={THEME.crimson} strokeWidth={3} strokeDasharray="6,5" opacity={dimProgress} />
        <line x1={750} y1={120} x2={750} y2={310} stroke={THEME.cobalt} strokeWidth={2.2} strokeDasharray="6,5" opacity={day84Enter} />

        <rect x={200} y={114} width={200} height={68} rx={10} fill={THEME.crimson} />
        <text
          x={300}
          y={158}
          textAnchor="middle"
          fontSize={30}
          fontWeight={900}
          fill="#FFF"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {dayNum} GÜN
        </text>

        <line x1={75} y1={310} x2={795} y2={310} stroke={THEME.ink} strokeWidth={5} />
        <circle cx={110} cy={310} r={16} fill={THEME.ink} />
        <circle cx={490} cy={310} r={19} fill={THEME.crimson} opacity={dimProgress} />
        <circle cx={750} cy={310} r={16} fill={THEME.cobalt} opacity={day84Enter} />

        <text x={110} y={362} textAnchor="middle" fontSize={16} fontWeight={800} fill={THEME.ink}>GÜN 0</text>
        <text x={110} y={388} textAnchor="middle" fontSize={14} fill={THEME.muted}>Olay &amp; Fotoğraf</text>

        <g opacity={dimProgress}>
          <text x={490} y={362} textAnchor="middle" fontSize={16} fontWeight={900} fill={THEME.crimson}>GÜN 28 · TIME-BAR</text>
          <text x={490} y={388} textAnchor="middle" fontSize={14.5} fontWeight={700} fill={THEME.ink}>Resmi Bildirim Sınırı</text>
        </g>

        <g opacity={day84Enter}>
          <text x={750} y={362} textAnchor="middle" fontSize={16} fontWeight={800} fill={THEME.cobalt}>GÜN 84</text>
          <text x={750} y={388} textAnchor="middle" fontSize={14} fill={THEME.muted}>Tam Dosya</text>
        </g>

        <rect x={120} y={448} width={620} height={64} rx={10} fill="#FFF" stroke={THEME.ink} strokeWidth={2.5} opacity={day84Enter} />
        <text x={430} y={487} textAnchor="middle" fontSize={16} fontWeight={800} fill={THEME.ink} opacity={day84Enter}>
          28. gün kaçırılırsa süre ve maliyet hakkı düşer (Md. 20.2.1).
        </text>
      </svg>
    );
  }

  if (id === "s06") {
    const c1 = spring({ frame: frame - 6, fps, config: { damping: 14 } });
    const c2 = spring({ frame: frame - 24, fps, config: { damping: 14 } });
    const c3 = spring({ frame: frame - 42, fps, config: { damping: 14 } });
    const hnd = spring({ frame: frame - 66, fps, config: { damping: 15 } });

    return (
      <svg viewBox="0 0 860 560" style={{ width: "100%", height: "100%" }}>
        <text x={75} y={70} fontSize={15} fontWeight={800} fill={THEME.cobalt}>AYLIK HAKEDİŞ ZİNCİRİ (MADDE 14)</text>

        <g opacity={c1} transform={`translate(75, ${95 + (1 - c1) * 18})`}>
          <rect width={210} height={115} rx={10} fill="#FFF" stroke={THEME.ink} strokeWidth={2.5} />
          <text x={105} y={50} textAnchor="middle" fontSize={24} fontWeight={900} fill={THEME.ink}>GÜN 0</text>
          <text x={105} y={82} textAnchor="middle" fontSize={14.5} fill={THEME.muted}>Metraj &amp; Rapor</text>
        </g>

        <g opacity={c2} transform={`translate(325, ${95 + (1 - c2) * 18})`}>
          <rect width={210} height={115} rx={10} fill="#EFF6FF" stroke={THEME.cobalt} strokeWidth={3} />
          <text x={105} y={50} textAnchor="middle" fontSize={24} fontWeight={900} fill={THEME.cobalt}>GÜN 28</text>
          <text x={105} y={82} textAnchor="middle" fontSize={14.5} fontWeight={700} fill={THEME.cobalt}>IPC Onayı</text>
        </g>

        <g opacity={c3} transform={`translate(575, ${95 + (1 - c3) * 18})`}>
          <rect width={210} height={115} rx={10} fill={THEME.ink} />
          <text x={105} y={50} textAnchor="middle" fontSize={24} fontWeight={900} fill="#FFF">GÜN 56</text>
          <text x={105} y={82} textAnchor="middle" fontSize={14.5} fill="#93C5FD">Banka Ödemesi</text>
        </g>

        <g opacity={hnd} transform={`translate(0, ${(1 - hnd) * 20})`}>
          <rect x={75} y={280} width={340} height={200} rx={12} fill="#FFF" stroke={THEME.emerald} strokeWidth={3} />
          <text x={245} y={326} textAnchor="middle" fontSize={18} fontWeight={800} fill={THEME.emerald}>GEÇİCİ KABUL (MD. 10)</text>
          <text x={245} y={366} textAnchor="middle" fontSize={15} fill={THEME.ink}>• Gecikme cezası durur</text>
          <text x={245} y={398} textAnchor="middle" fontSize={15} fill={THEME.ink}>• Bina riski Yatırımcıya geçer</text>
          <text x={245} y={434} textAnchor="middle" fontSize={15} fontWeight={800} fill={THEME.emerald}>• İlk %50 Teminat İadesi</text>

          <rect x={445} y={280} width={340} height={200} rx={12} fill="#FFF" stroke={THEME.ink} strokeWidth={3} />
          <text x={615} y={326} textAnchor="middle" fontSize={18} fontWeight={800} fill={THEME.ink}>KESİN KABUL (MD. 11.9)</text>
          <text x={615} y={366} textAnchor="middle" fontSize={15} fill={THEME.ink}>• 365 gün garanti (DNP) biter</text>
          <text x={615} y={398} textAnchor="middle" fontSize={15} fill={THEME.ink}>• Eksikler &amp; As-Built kapanır</text>
          <text x={615} y={434} textAnchor="middle" fontSize={15} fontWeight={800} fill={THEME.cobalt}>• Kalan %50 + Kesin Teminat</text>
        </g>
      </svg>
    );
  }

  // Scene 07 — Open Source Circle FIDIC Hub & CTA
  const hubPop = spring({ frame: frame - 4, fps, config: { damping: 12, stiffness: 160 } });
  const roles = [
    { lbl: "YATIRIMCI", x: 345, y: 28, dark: false },
    { lbl: "YÜRÜTÜCÜ", x: 635, y: 145, dark: false },
    { lbl: "BAŞ MİMAR", x: 635, y: 285, dark: false },
    { lbl: "ŞANTİYE ŞEFİ", x: 55, y: 145, dark: false },
    { lbl: "SAHA USTASI", x: 55, y: 285, dark: true },
  ];
  const ctaEnter = spring({ frame: frame - 52, fps, config: { damping: 16 } });

  return (
    <svg viewBox="0 0 860 560" style={{ width: "100%", height: "100%" }}>
      <circle cx={430} cy={235} r={168} fill="none" stroke={THEME.border} strokeWidth={2.2} strokeDasharray="8,6" opacity={hubPop} />
      <g transform={`translate(430, 235) scale(${hubPop})`}>
        <circle r={76} fill={THEME.ink} />
        <circle r={44} fill="none" stroke="#FFF" strokeWidth={7} />
        <circle cx={27} cy={-27} r={9} fill="#F59E0B" />
      </g>

      {roles.map((r, i) => {
        const rp = spring({ frame: frame - (16 + i * 7), fps, config: { damping: 13 } });
        return (
          <g key={r.lbl} transform={`translate(${r.x}, ${r.y + (1 - rp) * 16})`} opacity={rp}>
            <rect
              width={170}
              height={46}
              rx={23}
              fill={r.dark ? THEME.cobalt : "#FFF"}
              stroke={r.dark ? THEME.cobalt : THEME.ink}
              strokeWidth={2.5}
            />
            <text x={85} y={29} textAnchor="middle" fontSize={14} fontWeight={800} fill={r.dark ? "#FFF" : THEME.ink}>
              {r.lbl}
            </text>
          </g>
        );
      })}

      <g opacity={ctaEnter} transform={`translate(85, ${442 + (1 - ctaEnter) * 24})`}>
        <rect width={690} height={94} rx={14} fill={THEME.ink} />
        <text x={345} y={36} textAnchor="middle" fontSize={14.5} fontWeight={700} fill="#93C5FD">
          ÜCRETSİZ &amp; AÇIK KAYNAK · MASAÜSTÜ (.EXE) + WEB + MOBİL
        </text>
        <text x={345} y={70} textAnchor="middle" fontFamily={THEME.mono} fontSize={23} fontWeight={800} fill="#FFFFFF">
          github.com/thezencirs/CircleFIDIC
        </text>
      </g>
    </svg>
  );
};

const SingleSceneSlide: React.FC<{
  scene: SceneData;
  orientation: "portrait" | "landscape";
}> = ({ scene, orientation }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterFade = interpolate(frame, [0, 10], [0, 1], clamp);
  const exitFade = interpolate(
    frame,
    [scene.durationInFrames - 9, scene.durationInFrames],
    [1, 0],
    clamp
  );
  const titleRise = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  const progressPct = interpolate(frame, [0, scene.durationInFrames], [0, 100], clamp);

  const isPortrait = orientation === "portrait";

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${THEME.bgTop} 0%, ${THEME.bgBot} 100%)`,
        fontFamily: THEME.font,
        color: THEME.ink,
        padding: isPortrait ? "72px 62px" : "48px 74px",
        opacity: Math.min(enterFade, exitFade),
      }}
    >
      <Audio src={staticFile(scene.audioFile)} />

      <div
        style={{
          width: "100%",
          height: "100%",
          border: `2px solid ${THEME.border}`,
          borderRadius: 12,
          padding: isPortrait ? "48px 50px" : "36px 54px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "rgba(255,255,255,0.68)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1.5px solid ${THEME.border}`,
            paddingBottom: isPortrait ? 24 : 16,
          }}
        >
          <div style={{ fontSize: isPortrait ? 28 : 24, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: THEME.cobalt, fontSize: isPortrait ? 32 : 26 }}>◯</span>
            <span>Circle FIDIC</span>
          </div>
          <div
            style={{
              fontFamily: THEME.mono,
              fontSize: isPortrait ? 24 : 20,
              fontWeight: 800,
              background: "#E2E8F0",
              padding: "6px 18px",
              borderRadius: 8,
              color: THEME.muted,
            }}
          >
            {scene.num}
          </div>
        </div>

        {/* Body Layout: Stacked in 9:16 Portrait, Side-by-Side in 16:9 Landscape */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: isPortrait ? "column" : "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: isPortrait ? 28 : 54,
            margin: isPortrait ? "28px 0" : "16px 0",
          }}
        >
          <div
            style={{
              flex: isPortrait ? "0 0 auto" : "0 0 44%",
              width: isPortrait ? "100%" : "44%",
              transform: `translateY(${(1 - titleRise) * 18}px)`,
            }}
          >
            <div
              style={{
                fontFamily: THEME.mono,
                fontSize: isPortrait ? 21 : 18,
                fontWeight: 800,
                color: THEME.cobalt,
                letterSpacing: "0.05em",
                marginBottom: 16,
              }}
            >
              {scene.kicker}
            </div>
            <div
              style={{
                fontSize: isPortrait ? 58 : 50,
                lineHeight: 1.13,
                fontWeight: 800,
                letterSpacing: "-0.025em",
                marginBottom: 22,
              }}
            >
              {scene.title}
            </div>
            <div
              style={{
                fontSize: isPortrait ? 31 : 26,
                lineHeight: 1.42,
                color: THEME.muted,
                fontWeight: 500,
              }}
            >
              {scene.subtitle}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              width: isPortrait ? "100%" : "56%",
              height: isPortrait ? 680 : "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SceneArtwork id={scene.id} frame={frame} fps={fps} />
          </div>
        </div>

        {/* Footer + Synced Audio Progress Bar */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: `1.5px solid ${THEME.border}`,
              paddingTop: isPortrait ? 22 : 14,
              fontFamily: THEME.mono,
              fontSize: isPortrait ? 22 : 18,
              fontWeight: 700,
              color: THEME.muted,
            }}
          >
            <span>github.com/thezencirs/CircleFIDIC</span>
            <span style={{ color: THEME.cobalt }}>FIDIC FELSEFESİ · AÇIK KAYNAK</span>
          </div>
          <div
            style={{
              height: 6,
              background: "#E2E8F0",
              borderRadius: 999,
              marginTop: 14,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: THEME.cobalt,
              }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const FidicMotionVideo: React.FC<{ orientation: "portrait" | "landscape" }> = ({ orientation }) => {
  let offset = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: THEME.bgTop }}>
      {manifest.scenes.map((sc) => {
        const from = offset;
        offset += sc.durationInFrames;
        return (
          <Sequence key={sc.id} from={from} durationInFrames={sc.durationInFrames}>
            <SingleSceneSlide scene={sc} orientation={orientation} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
