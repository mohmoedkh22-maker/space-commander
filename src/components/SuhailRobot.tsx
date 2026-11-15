"use client";
// PHASE 2 — SUHAIL, expressive vector version of the approved character (Cosmic Discovery identity):
// small floating white robot · rounded body · dark glossy face display · bright cyan digital eyes · orange details.
// Eight expressions; every animation is CSS (transform/opacity) and stops with Reduce Motion.
import { useId } from "react";

export type SuhailExpression = "idle" | "curious" | "thinking" | "explaining" | "warning" | "happy" | "encouraging" | "concerned";

export const SUHAIL_EXPRESSIONS: SuhailExpression[] = ["idle", "curious", "thinking", "explaining", "warning", "happy", "encouraging", "concerned"];

const CYAN = "#50E3F0";
const ORANGE = "#FFAD4D";
const CORAL = "#FF6B6B";
const MINT = "#43D9A3";
const PURPLE = "#8C78FF";

/** Accent per expression: antenna light, ear glow and the little indicator. */
export const EXPRESSION_ACCENT: Record<SuhailExpression, string> = {
  idle: CYAN,
  curious: CYAN,
  thinking: PURPLE,
  explaining: CYAN,
  warning: CORAL,
  happy: ORANGE,
  encouraging: MINT,
  concerned: ORANGE,
};

/* Eyes are drawn on the face display (centre x=100, eyes at x=78 and x=122, y=82). */
function Eyes({ e }: { e: SuhailExpression }) {
  const glow = { fill: CYAN, stroke: CYAN };
  switch (e) {
    case "happy":
      return (
        <g className="sb-eyes" fill="none" stroke={CYAN} strokeWidth="7" strokeLinecap="round">
          <path d="M66 88 Q78 72 90 88" />
          <path d="M110 88 Q122 72 134 88" />
        </g>
      );
    case "encouraging":
      return (
        <g className="sb-eyes" fill="none" stroke={CYAN} strokeWidth="7" strokeLinecap="round">
          <path d="M66 88 Q78 72 90 88" />
          {/* wink */}
          <path d="M111 84 L133 84" />
        </g>
      );
    case "curious":
      return (
        <g className="sb-eyes sb-blink" {...glow}>
          <rect x="68" y="70" width="20" height="26" rx="10" />
          <rect x="111" y="66" width="24" height="32" rx="12" />
        </g>
      );
    case "thinking":
      return (
        <g className="sb-eyes sb-blink" {...glow}>
          {/* looking up and to the side */}
          <rect x="72" y="68" width="16" height="18" rx="8" />
          <rect x="116" y="68" width="16" height="18" rx="8" />
          <path d="M66 62 L90 58 M110 58 L134 62" stroke={CYAN} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.7" />
        </g>
      );
    case "warning":
      return (
        <g className="sb-eyes" {...glow}>
          {/* alert, not angry: wide eyes and raised straight brows */}
          <rect x="68" y="72" width="20" height="26" rx="10" />
          <rect x="112" y="72" width="20" height="26" rx="10" />
          <path d="M66 62 L90 62 M110 62 L134 62" stroke={CYAN} strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </g>
      );
    case "concerned":
      return (
        <g className="sb-eyes sb-blink" {...glow}>
          <rect x="69" y="78" width="18" height="20" rx="9" />
          <rect x="113" y="78" width="18" height="20" rx="9" />
          {/* brows rise in the middle */}
          <path d="M66 72 L88 64 M134 72 L112 64" stroke={CYAN} strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </g>
      );
    case "explaining":
      return (
        <g className="sb-eyes sb-blink" {...glow}>
          <rect x="68" y="70" width="20" height="26" rx="10" />
          <rect x="112" y="70" width="20" height="26" rx="10" />
        </g>
      );
    default:
      return (
        <g className="sb-eyes sb-blink" {...glow}>
          <rect x="68" y="72" width="20" height="24" rx="10" />
          <rect x="112" y="72" width="20" height="24" rx="10" />
        </g>
      );
  }
}

function Indicator({ e }: { e: SuhailExpression }) {
  const c = EXPRESSION_ACCENT[e];
  switch (e) {
    case "curious":
      return (
        <text x="162" y="38" fontSize="30" fontWeight="700" fill={c} fontFamily="Space Grotesk, sans-serif" className="sb-pop">
          ?
        </text>
      );
    case "thinking":
      return (
        <g fill={c}>
          <circle className="sb-dot" cx="150" cy="34" r="5" style={{ animationDelay: "0s" }} />
          <circle className="sb-dot" cx="164" cy="26" r="6" style={{ animationDelay: "0.25s" }} />
          <circle className="sb-dot" cx="180" cy="16" r="7" style={{ animationDelay: "0.5s" }} />
        </g>
      );
    case "warning":
      return (
        <g className="sb-pulse">
          <circle cx="168" cy="30" r="15" fill={c} />
          <text x="168" y="38" fontSize="22" fontWeight="800" fill="#0B1026" textAnchor="middle" fontFamily="Space Grotesk, sans-serif">
            !
          </text>
        </g>
      );
    case "encouraging":
    case "happy":
      return (
        <path
          className="sb-sparkle"
          d="M168 12 L172 26 L186 30 L172 34 L168 48 L164 34 L150 30 L164 26 Z"
          fill={c}
          opacity="0.95"
        />
      );
    case "concerned":
      return <path d="M166 22 q6 10 0 16 q-6 -6 0 -16z" fill={CYAN} opacity="0.8" className="sb-pop" />;
    default:
      return null;
  }
}

/** Arms change with the expression: resting, waving, pointing at a hologram, or hands together. */
function Arms({ e }: { e: SuhailExpression }) {
  const arm = (d: string, cls = "") => <path d={d} className={cls} stroke="#E4E9F3" strokeWidth="14" strokeLinecap="round" fill="none" />;
  const hand = (cx: number, cy: number) => <circle cx={cx} cy={cy} r="9" fill={ORANGE} />;
  if (e === "happy" || e === "encouraging")
    return (
      <g>
        {arm("M60 168 Q44 182 46 200")}
        {hand(46, 202)}
        <g className="sb-wave" style={{ transformOrigin: "142px 166px" }}>
          {arm("M142 166 Q164 150 170 128")}
          {hand(171, 124)}
        </g>
      </g>
    );
  if (e === "explaining")
    return (
      <g>
        {arm("M60 168 Q44 182 46 200")}
        {hand(46, 202)}
        {arm("M142 166 Q166 160 178 146")}
        {hand(180, 143)}
        {/* small hologram he is presenting */}
        <g className="sb-holo">
          <path d="M184 136 L214 112 L214 172 L184 150 Z" fill={CYAN} opacity="0.12" />
          <rect x="196" y="118" width="22" height="16" rx="3" fill="none" stroke={CYAN} strokeWidth="2" opacity="0.8" />
          <path d="M199 128 l5 -4 l5 3 l6 -5" stroke={CYAN} strokeWidth="2" fill="none" />
        </g>
      </g>
    );
  if (e === "thinking")
    return (
      <g>
        {arm("M60 168 Q44 182 46 200")}
        {hand(46, 202)}
        {/* hand to the chin */}
        {arm("M140 168 Q160 158 150 140")}
        {hand(148, 137)}
      </g>
    );
  if (e === "concerned")
    return (
      <g>
        {/* arms drawn in, hands held close */}
        {arm("M60 168 Q58 188 74 200")}
        {hand(76, 202)}
        {arm("M140 168 Q142 188 126 200")}
        {hand(124, 202)}
      </g>
    );
  if (e === "warning")
    return (
      <g>
        {arm("M60 166 Q38 156 34 136")}
        {hand(33, 132)}
        {arm("M140 166 Q162 156 166 136")}
        {hand(167, 132)}
      </g>
    );
  return (
    <g>
      {arm("M60 168 Q44 182 46 200")}
      {hand(46, 202)}
      {arm("M140 168 Q156 182 154 200")}
      {hand(154, 202)}
    </g>
  );
}

const TILT: Record<SuhailExpression, number> = {
  idle: 0,
  curious: 9,
  thinking: -6,
  explaining: 4,
  warning: 0,
  happy: -3,
  encouraging: 5,
  concerned: -8,
};

/**
 * SUHAIL in one of eight expressions. `size` is the width in px (height is 1.1×).
 * Purely decorative (aria-hidden): what SUHAIL says is always shown as text next to him.
 */
export function SuhailRobot({ expression = "idle", size = 120, float = true }: { expression?: SuhailExpression; size?: number | string; float?: boolean }) {
  const id = useId().replace(/:/g, "");
  const accent = EXPRESSION_ACCENT[expression];
  return (
    <span className={`relative inline-block shrink-0 ${float ? "sb-float" : ""}`} style={{ width: size, aspectRatio: "220 / 242" }} aria-hidden data-expression={expression}>
      <svg viewBox="0 0 220 242" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id={`${id}-shell`} cx="38%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#E9EEF7" />
            <stop offset="100%" stopColor="#AAB6CA" />
          </radialGradient>
          <linearGradient id={`${id}-visor`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1D2A55" />
            <stop offset="100%" stopColor="#070B1C" />
          </linearGradient>
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* soft shadow / hover glow under him */}
        <ellipse cx="100" cy="232" rx="46" ry="7" fill={accent} opacity="0.25" className="sb-shadow" />
        <g style={{ transform: `rotate(${TILT[expression]}deg)`, transformOrigin: "100px 120px", transition: "transform 0.4s ease" }} className="sb-body">
          {/* body */}
          <ellipse cx="100" cy="182" rx="44" ry="38" fill={`url(#${id}-shell)`} />
          <path d="M60 176 Q100 196 140 176" stroke={ORANGE} strokeWidth="7" fill="none" strokeLinecap="round" />
          <circle cx="100" cy="196" r="7" fill={accent} opacity="0.9" />
          <Arms e={expression} />
          {/* antenna */}
          <line x1="100" y1="30" x2="100" y2="14" stroke="#AAB6CA" strokeWidth="5" strokeLinecap="round" />
          <circle cx="100" cy="11" r="7" fill={accent} className="sb-antenna" />
          {/* head */}
          <rect x="30" y="26" width="140" height="118" rx="56" fill={`url(#${id}-shell)`} />
          {/* ears */}
          <circle cx="30" cy="86" r="17" fill={ORANGE} />
          <circle cx="30" cy="86" r="8" fill="#FFD59A" className={expression === "warning" ? "sb-pulse" : ""} />
          <circle cx="170" cy="86" r="17" fill={ORANGE} />
          <circle cx="170" cy="86" r="8" fill="#FFD59A" className={expression === "warning" ? "sb-pulse" : ""} />
          {/* glossy face display */}
          <rect x="48" y="44" width="104" height="84" rx="38" fill={`url(#${id}-visor)`} />
          <path d="M62 56 Q86 46 112 50" stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="6" strokeLinecap="round" fill="none" />
          <g filter={`url(#${id}-glow)`}>
            <Eyes e={expression} />
          </g>
        </g>
        <Indicator e={expression} />
      </svg>
    </span>
  );
}
