"use client";
import { useId } from "react";

/**
 * Orbit Star logo mark (direction A). TEMPORARY vector placeholder until the
 * design team delivers the approved SVG/PNG logo files.
 */
export function OrbitStarLogo({ size = 112 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
      <defs>
        <radialGradient id={`p${id}`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#326bff" />
          <stop offset="100%" stopColor="#151f3d" />
        </radialGradient>
        <linearGradient id={`o${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#50e3f0" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#50e3f0" />
          <stop offset="100%" stopColor="#8c78ff" />
        </linearGradient>
      </defs>
      {/* back half of the orbit */}
      <path d="M8 66 A54 18 -18 0 1 112 54" fill="none" stroke={`url(#o${id})`} strokeWidth="3" opacity="0.6" />
      <circle cx="60" cy="60" r="32" fill={`url(#p${id})`} stroke="#50e3f0" strokeOpacity="0.6" strokeWidth="1.5" />
      <path d="M38 50 a26 26 0 0 1 20 -18" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* star */}
      <path d="M60 38 L65.5 53.5 L82 54.5 L69 64.5 L73.5 80.5 L60 71 L46.5 80.5 L51 64.5 L38 54.5 L54.5 53.5 Z" fill="#ffad4d" />
      {/* front half of the orbit */}
      <path d="M112 54 A54 18 -18 0 1 8 66" fill="none" stroke={`url(#o${id})`} strokeWidth="3.5" />
      <circle cx="104" cy="44" r="4" fill="#50e3f0" />
    </svg>
  );
}

/** Cinematic SELENE-1 backdrop: lunar horizon, Earth, low Sun, lit base. Decorative only. */
export function LunarHorizon() {
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="lh-earth" cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#8ab8ff" />
          <stop offset="55%" stopColor="#326bff" />
          <stop offset="100%" stopColor="#0b1026" />
        </radialGradient>
        <radialGradient id="lh-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd59a" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#ffad4d" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffad4d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lh-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b3350" />
          <stop offset="100%" stopColor="#141a2e" />
        </linearGradient>
        <linearGradient id="lh-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a536c" />
          <stop offset="100%" stopColor="#0b1026" />
        </linearGradient>
      </defs>
      <circle cx="180" cy="640" r="260" fill="url(#lh-sun)" className="anim-glow" />
      {/* far ridges — long polar shadows */}
      <path d="M0 640 L140 600 L260 625 L420 570 L560 610 L720 585 L900 620 L1060 575 L1240 610 L1440 590 L1440 900 L0 900Z" fill="url(#lh-far)" />
      <path d="M0 640 L140 600 L260 625" stroke="#ffad4d" strokeOpacity="0.5" strokeWidth="2" fill="none" />
      {/* near ground */}
      <path d="M0 720 Q360 670 720 700 T1440 690 L1440 900 L0 900Z" fill="url(#lh-near)" />
      <ellipse cx="300" cy="800" rx="140" ry="22" fill="#0b1026" opacity="0.55" />
      <ellipse cx="1150" cy="830" rx="170" ry="26" fill="#0b1026" opacity="0.55" />
      {/* soft vignette for text contrast */}
      <rect width="1440" height="900" fill="#0b1026" opacity="0.25" />
    </svg>
  );
}
