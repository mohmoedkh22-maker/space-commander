"use client";
// Layered vector environments for the cinematic (no 3D engine, light enough for school laptops and phones).

/** Deterministic star field (same every render). */
function stars(n: number, seed = 7, w = 1920, h = 1080) {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => ({ x: r() * w, y: r() * h, r: 0.6 + r() * 1.6, o: 0.35 + r() * 0.65 }));
}
const STARS = stars(170);

export function StarField({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" className={`absolute inset-0 h-full w-full ${className}`} aria-hidden>
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#f3f6fc" opacity={s.o} />
      ))}
    </svg>
  );
}

function Earth() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="ce-earth" cx="38%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#9fd0ff" />
          <stop offset="45%" stopColor="#3a7bff" />
          <stop offset="100%" stopColor="#0b1a4a" />
        </radialGradient>
        <radialGradient id="ce-atmo" cx="50%" cy="50%" r="50%">
          <stop offset="85%" stopColor="#4fe5ff" stopOpacity="0" />
          <stop offset="95%" stopColor="#4fe5ff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#4fe5ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="100" fill="url(#ce-atmo)" />
      <circle cx="100" cy="100" r="86" fill="url(#ce-earth)" />
      <path d="M60 60 q20 -18 44 -4 q10 14 -6 24 q-18 4 -24 18 q-14 4 -20 -10 q-4 -16 6 -28z" fill="#43d9a3" opacity="0.75" />
      <path d="M118 108 q18 -6 30 8 q4 18 -12 26 q-14 2 -20 -10z" fill="#43d9a3" opacity="0.7" />
      <path d="M40 120 q30 10 60 4 M70 150 q30 -4 56 8" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M100 14 a86 86 0 0 1 0 172 a70 86 0 0 0 0 -172z" fill="#020617" opacity="0.45" />
    </svg>
  );
}

function Moon() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="ce-moon" cx="36%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#e8ecf5" />
          <stop offset="60%" stopColor="#9aa4b8" />
          <stop offset="100%" stopColor="#3a4258" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="url(#ce-moon)" />
      {[
        [70, 60, 14],
        [120, 80, 9],
        [90, 120, 18],
        [140, 130, 11],
        [55, 110, 7],
        [110, 160, 9],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill="#6b7489" opacity="0.55" />
          <circle cx={x - r * 0.15} cy={y - r * 0.15} r={r * 0.8} fill="#8c96aa" opacity="0.5" />
        </g>
      ))}
      <path d="M100 4 a96 96 0 0 1 0 192 a76 96 0 0 0 0 -192z" fill="#0b1026" opacity="0.35" />
    </svg>
  );
}

/** SCENE 01 — black → blue light → Earth → Moon approach (pure CSS timeline). */
export function DeepSpace() {
  return (
    <div className="absolute inset-0 bg-[#02040c]">
      <StarField className="c1-stars" />
      <div className="c1-earth absolute left-1/2 top-1/2" style={{ width: "min(46vh, 70vw)", height: "min(46vh, 70vw)" }}>
        <Earth />
      </div>
      <div className="c1-moon absolute left-1/2 top-1/2" style={{ width: "min(60vh, 90vw)", height: "min(60vh, 90vw)" }}>
        <Moon />
      </div>
    </div>
  );
}

/** SCENE 02 — SELENE-1 on the lunar surface: low Sun, long shadows, distant Earth. */
export function LunarVista() {
  const panels = [0, 1, 2, 3, 4];
  return (
    <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="lv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#02040c" />
          <stop offset="100%" stopColor="#0b1026" />
        </linearGradient>
        <radialGradient id="lv-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff1d6" />
          <stop offset="20%" stopColor="#ffcb77" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffad4d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lv-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7d869c" />
          <stop offset="45%" stopColor="#4a536c" />
          <stop offset="100%" stopColor="#1a2033" />
        </linearGradient>
        <linearGradient id="lv-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5d6680" />
          <stop offset="100%" stopColor="#2b3350" />
        </linearGradient>
        <radialGradient id="lv-dome" cx="45%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#d6ffe9" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#43d9a3" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#1f6d55" stopOpacity="0.5" />
        </radialGradient>
        <linearGradient id="lv-hab" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3f6fc" />
          <stop offset="100%" stopColor="#9aa4b8" />
        </linearGradient>
        <linearGradient id="lv-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2f5fd6" />
          <stop offset="100%" stopColor="#152a6e" />
        </linearGradient>
        <radialGradient id="lv-earth" cx="38%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#9fd0ff" />
          <stop offset="55%" stopColor="#3a7bff" />
          <stop offset="100%" stopColor="#0b1a4a" />
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#lv-sky)" />
      {STARS.slice(0, 110).map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y * 0.55} r={s.r * 0.9} fill="#f3f6fc" opacity={s.o * 0.8} />
      ))}
      {/* distant Earth */}
      <circle cx="1560" cy="190" r="74" fill="url(#lv-earth)" />
      <path d="M1525 165 q22 -16 44 2 q-10 20 -32 14z M1580 220 q16 -8 26 8 q-12 12 -26 -8z" fill="#43d9a3" opacity="0.7" />
      <path d="M1560 116 a74 74 0 0 1 0 148 a58 74 0 0 0 0 -148z" fill="#020617" opacity="0.5" />
      {/* low Sun on the horizon (south pole) */}
      <circle cx="130" cy="640" r="320" fill="url(#lv-sun)" />
      {/* far ridges with sunlit rims */}
      <path d="M0 650 L150 600 L300 630 L470 560 L640 615 L820 585 L1010 625 L1200 570 L1400 615 L1620 585 L1920 610 L1920 760 L0 760Z" fill="url(#lv-far)" />
      <path d="M0 650 L150 600 L300 630 L470 560" stroke="#ffcb77" strokeOpacity="0.7" strokeWidth="3" fill="none" />
      {/* long shadows cast to the right by the low Sun */}
      <path d="M470 560 L1400 700 L640 615Z" fill="#141a2c" opacity="0.55" />
      <path d="M1200 570 L1920 690 L1400 615Z" fill="#141a2c" opacity="0.5" />
      {/* foreground ground */}
      <path d="M0 720 Q480 680 960 700 T1920 690 L1920 1080 L0 1080Z" fill="url(#lv-ground)" />
      {/* craters */}
      {[
        [300, 900, 150, 34],
        [1500, 960, 190, 40],
        [980, 1010, 120, 24],
        [1750, 820, 80, 16],
      ].map(([cx, cy, rx, ry], i) => (
        <g key={i}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#1a2033" opacity="0.8" />
          <ellipse cx={cx + rx * 0.08} cy={cy - ry * 0.2} rx={rx * 0.86} ry={ry * 0.62} fill="#2b3350" opacity="0.8" />
          <path d={`M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`} stroke="#c3cbdb" strokeOpacity="0.45" strokeWidth="3" fill="none" />
        </g>
      ))}

      {/* ---- SELENE-1 ---- */}
      {/* base shadows (sun from the left) */}
      <path d="M760 760 L1500 800 L1460 820 L760 790Z" fill="#141a2c" opacity="0.6" />
      {/* solar arrays tilted toward the Sun */}
      {panels.map((i) => (
        <g key={i} transform={`translate(${520 + i * 62} ${700 - i * 4})`}>
          <line x1="20" y1="0" x2="20" y2="58" stroke="#aab6ca" strokeWidth="4" />
          <path d="M-6 -36 L46 -50 L52 -8 L0 6Z" fill="url(#lv-panel)" stroke="#7fa6ff" strokeWidth="1.5" />
          <path d="M20 -43 L26 -1 M-3 -15 L49 -29" stroke="#7fa6ff" strokeOpacity="0.6" strokeWidth="1.2" />
          <path d="M20 58 L60 66" stroke="#141a2c" strokeOpacity="0.6" strokeWidth="6" />
        </g>
      ))}
      {/* tunnels */}
      <rect x="860" y="716" width="420" height="22" rx="10" fill="#c3cbdb" />
      {/* habitat modules */}
      <g>
        <rect x="820" y="652" width="150" height="96" rx="44" fill="url(#lv-hab)" />
        <rect x="1000" y="630" width="170" height="118" rx="50" fill="url(#lv-hab)" />
        <rect x="1210" y="664" width="130" height="84" rx="38" fill="url(#lv-hab)" />
        {[850, 878, 906, 934].map((x) => (
          <rect key={x} x={x} y="684" width="18" height="12" rx="3" fill="#ffd59a" className="anim-glow" />
        ))}
        {[1030, 1060, 1090, 1120].map((x) => (
          <rect key={x} x={x} y="664" width="20" height="14" rx="3" fill="#ffd59a" />
        ))}
        <rect x="1032" y="700" width="104" height="14" rx="7" fill="#4fe5ff" opacity="0.8" />
        {[1236, 1266, 1296].map((x) => (
          <rect key={x} x={x} y="692" width="16" height="11" rx="3" fill="#ffd59a" />
        ))}
        <text x="1085" y="742" textAnchor="middle" fontSize="20" fontWeight="700" fill="#151f3d" fontFamily="Space Grotesk, sans-serif">
          SELENE-1
        </text>
      </g>
      {/* command tower + antenna */}
      <rect x="1070" y="560" width="30" height="74" rx="6" fill="#d9dfeb" />
      <rect x="1060" y="548" width="50" height="18" rx="6" fill="#aab6ca" />
      <line x1="1085" y1="548" x2="1085" y2="500" stroke="#aab6ca" strokeWidth="3" />
      <circle cx="1085" cy="496" r="6" fill="#ff6b6b" className="anim-glow" />
      {/* greenhouse dome */}
      <path d="M1360 748 A110 96 0 0 1 1580 748Z" fill="url(#lv-dome)" stroke="#d6ffe9" strokeOpacity="0.7" strokeWidth="2" />
      <path d="M1390 748 A80 80 0 0 1 1550 748 M1470 652 L1470 748 M1410 700 L1530 700" stroke="#d6ffe9" strokeOpacity="0.45" strokeWidth="1.5" fill="none" />
      <rect x="1350" y="744" width="240" height="12" rx="4" fill="#aab6ca" />
      <ellipse cx="1470" cy="740" rx="90" ry="10" fill="#43d9a3" opacity="0.5" className="anim-glow" />
      {/* rover */}
      <g transform="translate(1640 790)">
        <path d="M0 0 L120 0 L110 -34 L20 -34Z" fill="#e6ebf5" />
        <rect x="30" y="-52" width="48" height="20" rx="6" fill="#aab6ca" />
        <rect x="38" y="-48" width="32" height="10" rx="3" fill="#4fe5ff" opacity="0.8" />
        {[14, 60, 106].map((x) => (
          <circle key={x} cx={x} cy="6" r="13" fill="#1a2033" stroke="#aab6ca" strokeWidth="3" />
        ))}
        <path d="M120 10 L230 26 L220 34 L110 18Z" fill="#141a2c" opacity="0.5" />
      </g>
      {/* soft vignette */}
      <rect width="1920" height="1080" fill="url(#lv-sky)" opacity="0.12" />
    </svg>
  );
}

/** SCENES 03/04/07 — the command center: observation window, consoles, holo monitors. */
export function CommandCenter({ labels, animateOn = false, dim = false }: { labels: string[]; animateOn?: boolean; dim?: boolean }) {
  const mons = [
    { x: 230, y: 300, c: "#ffad4d", icon: "⚡" },
    { x: 230, y: 560, c: "#326bff", icon: "💧" },
    { x: 1450, y: 300, c: "#50e3f0", icon: "🫧" },
    { x: 1450, y: 560, c: "#43d9a3", icon: "🌱" },
  ];
  return (
    <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden style={{ opacity: dim ? 0.55 : 1 }}>
      <defs>
        <linearGradient id="cc-room" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d1433" />
          <stop offset="100%" stopColor="#060a1c" />
        </linearGradient>
        <linearGradient id="cc-win" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#02040c" />
          <stop offset="100%" stopColor="#0b1026" />
        </linearGradient>
        <linearGradient id="cc-desk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c2a55" />
          <stop offset="100%" stopColor="#0b1026" />
        </linearGradient>
        <radialGradient id="cc-cone" cx="50%" cy="100%" r="100%">
          <stop offset="0%" stopColor="#4fe5ff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#4fe5ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cc-earth" cx="38%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#9fd0ff" />
          <stop offset="55%" stopColor="#3a7bff" />
          <stop offset="100%" stopColor="#0b1a4a" />
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#cc-room)" />
      {/* observation window */}
      <rect x="380" y="90" width="1160" height="520" rx="60" fill="url(#cc-win)" stroke="#2a3a66" strokeWidth="14" />
      {STARS.slice(0, 60).map((s, i) => (
        <circle key={i} cx={420 + (s.x / 1920) * 1080} cy={120 + (s.y / 1080) * 300} r={s.r * 0.8} fill="#f3f6fc" opacity={s.o} />
      ))}
      <circle cx="1330" cy="230" r="58" fill="url(#cc-earth)" />
      <path d="M1330 172 a58 58 0 0 1 0 116 a46 58 0 0 0 0 -116z" fill="#020617" opacity="0.5" />
      <path d="M388 520 Q700 450 960 480 T1532 470 L1532 600 L388 600Z" fill="#5d6680" />
      <path d="M388 560 Q760 520 1100 545 T1532 540 L1532 604 L388 604Z" fill="#3a4258" />
      <path d="M960 90 L960 610 M380 350 L1540 350" stroke="#2a3a66" strokeWidth="10" opacity="0.8" />
      {/* side monitors */}
      {mons.map((m, i) => (
        <g key={i} className={animateOn ? "c3-mon" : ""} style={{ ["--i" as string]: i }}>
          <rect x={m.x} y={m.y} width="240" height="200" rx="18" fill="#0b1026" stroke={m.c} strokeWidth="3" />
          <rect x={m.x} y={m.y} width="240" height="200" rx="18" fill={m.c} opacity="0.08" />
          <text x={m.x + 120} y={m.y + 66} fontSize="44" textAnchor="middle">
            {m.icon}
          </text>
          <text x={m.x + 120} y={m.y + 140} fontSize="28" fontWeight="700" fill="#f3f6fc" textAnchor="middle" direction="ltr" fontFamily="IBM Plex Sans Arabic, Space Grotesk, sans-serif">
            {labels[i]}
          </text>
          <rect x={m.x + 26} y={m.y + 88} width="188" height="14" rx="7" fill="#1c2547" />
          <rect x={m.x + 26} y={m.y + 88} width={120 + i * 14} height="14" rx="7" fill={m.c} />
          <path d={`M${m.x + 26} ${m.y + 170} l30 -22 l26 12 l30 -26 l28 18 l30 -14 l24 10`} stroke={m.c} strokeWidth="3" fill="none" opacity="0.8" />
        </g>
      ))}
      {/* main holo display frame */}
      <g className={animateOn ? "c3-main" : ""}>
        <path d="M760 860 L700 690 L1220 690 L1160 860Z" fill="url(#cc-cone)" />
      </g>
      {/* consoles */}
      <path d="M0 860 L360 780 L1560 780 L1920 860 L1920 1080 L0 1080Z" fill="url(#cc-desk)" />
      <path d="M0 860 L360 780 L1560 780 L1920 860" stroke="#4fe5ff" strokeOpacity="0.5" strokeWidth="3" fill="none" />
      <ellipse cx="960" cy="870" rx="90" ry="18" fill="#4fe5ff" opacity="0.5" className="anim-glow" />
      {[420, 620, 1200, 1400].map((x, i) => (
        <g key={x} className={animateOn ? "c3-mon" : ""} style={{ ["--i" as string]: i + 0.5 }}>
          <rect x={x} y="820" width="150" height="54" rx="10" fill="#151f3d" stroke="#2a3a66" strokeWidth="2" />
          {[0, 1, 2, 3, 4].map((k) => (
            <rect key={k} x={x + 14 + k * 26} y="836" width="16" height="22" rx="4" fill={["#4fe5ff", "#ffad4d", "#43d9a3", "#8c78ff", "#4fe5ff"][k]} opacity="0.75" />
          ))}
        </g>
      ))}
      {/* soft blue ambient glow */}
      <rect width="1920" height="1080" fill="#326bff" opacity="0.05" />
    </svg>
  );
}

/** Deterministic dust motes: integer LCG + rounding, so the server and every browser render identical values (no hydration mismatch). */
const DUST = (() => {
  let seed = 42;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const q = (n: number, d = 2) => Number(n.toFixed(d));
  return Array.from({ length: 22 }, () => ({ x: q(r() * 100), y: q(30 + r() * 70), s: q(1 + r() * 2.5), d: q(7 + r() * 7), delay: q(-r() * 10), o: q(0.25 + r() * 0.45) }));
})();

export function Dust() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden>
      {DUST.map((p, i) => (
        <span
          key={i}
          className="dust"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.s}px`,
            height: `${p.s}px`,
            ["--d" as string]: `${p.d}s`,
            ["--delay" as string]: `${p.delay}s`,
            ["--o" as string]: String(p.o),
          }}
        />
      ))}
    </div>
  );
}

