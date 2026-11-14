"use client";
import { useId } from "react";
import { useSettings } from "./settings";
import type { T } from "@/lib/game/types";

export type Mood = "normal" | "curious" | "thinking" | "warning" | "happy";

export function SuhailBot({ mood = "normal", size = 96 }: { mood?: Mood; size?: number }) {
  const eye = mood === "warning" ? "#ff6b6b" : "#50e3f0";
  const eyes = {
    normal: (
      <>
        <rect x="34" y="44" width="10" height="14" rx="5" fill={eye} />
        <rect x="56" y="44" width="10" height="14" rx="5" fill={eye} />
      </>
    ),
    curious: (
      <>
        <circle cx="39" cy="50" r="7" fill={eye} />
        <rect x="56" y="47" width="10" height="9" rx="4.5" fill={eye} />
      </>
    ),
    thinking: (
      <>
        <rect x="33" y="49" width="12" height="5" rx="2.5" fill={eye} />
        <rect x="55" y="45" width="12" height="9" rx="4.5" fill={eye} />
      </>
    ),
    warning: (
      <>
        <path d="M32 44 L46 50 L32 54 Z" fill={eye} />
        <path d="M68 44 L54 50 L68 54 Z" fill={eye} />
      </>
    ),
    happy: (
      <>
        <path d="M33 54 Q39 42 45 54" stroke={eye} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M55 54 Q61 42 67 54" stroke={eye} strokeWidth="4" fill="none" strokeLinecap="round" />
      </>
    ),
  }[mood];
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="anim-float shrink-0" aria-hidden>
      <defs>
        <radialGradient id={`b${id}`} cx="35%" cy="25%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#e6ebf5" />
          <stop offset="100%" stopColor="#aab6ca" />
        </radialGradient>
        <linearGradient id={`f${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c2547" />
          <stop offset="100%" stopColor="#070a18" />
        </linearGradient>
        <filter id={`g${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* hover shadow */}
      <ellipse cx="50" cy="95" rx="18" ry="2.6" fill="#50e3f0" opacity="0.35" className="anim-glow" />
      {/* antenna with orange tip */}
      <line x1="50" y1="12" x2="50" y2="20" stroke="#aab6ca" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="10" r="3.6" fill="#ffad4d" filter={`url(#g${id})`} />
      {/* orange side ear-pods */}
      <rect x="9" y="42" width="9" height="18" rx="4.5" fill="#ffad4d" />
      <rect x="82" y="42" width="9" height="18" rx="4.5" fill="#ffad4d" />
      {/* smooth rounded white body */}
      <rect x="16" y="20" width="68" height="64" rx="32" fill={`url(#b${id})`} />
      {/* glossy dark face */}
      <rect x="24" y="32" width="52" height="34" rx="17" fill={`url(#f${id})`} />
      <path d="M30 37 Q50 31 70 37" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <g filter={`url(#g${id})`}>{eyes}</g>
      {/* orange chest light */}
      <rect x="44" y="72" width="12" height="4" rx="2" fill="#ffad4d" />
      {/* body gloss */}
      <ellipse cx="34" cy="27" rx="9" ry="3.5" fill="#ffffff" opacity="0.8" transform="rotate(-20 34 27)" />
    </svg>
  );
}

export function SuhailSays({ text, mood = "normal", compact = false }: { text: T; mood?: Mood; compact?: boolean }) {
  const { tx } = useSettings();
  return (
    <div className="flex items-end gap-3 anim-rise" role="status" aria-live="polite">
      <SuhailBot mood={mood} size={compact ? 64 : 88} />
      <div className="panel relative px-4 py-3 text-base leading-relaxed sm:text-lg" style={{ borderColor: "#50e3f055" }}>
        <span className="mb-1 block font-display text-xs font-bold tracking-widest text-holo">SUHAIL · سهيل</span>
        {tx(text)}
      </div>
    </div>
  );
}
