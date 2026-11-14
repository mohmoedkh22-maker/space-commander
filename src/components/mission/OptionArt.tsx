/* eslint-disable @next/next/no-img-element -- static export, small local art */
"use client";

/**
 * Illustration header for a decision option: team art as the scene
 * (greenhouse for farm options, SELENE-1 for the rest) plus a glowing icon for the action.
 */
type Icon = "sun" | "dim" | "balance" | "inspect" | "recycle" | "leafDrop" | "wrench" | "drop" | "flask" | "shield" | "battery";

const ART: Record<string, { bg: "greenhouse" | "base"; icon: Icon; color: string; dim?: boolean }> = {
  "farm-full": { bg: "greenhouse", icon: "sun", color: "#43d9a3" },
  "save-energy": { bg: "greenhouse", icon: "battery", color: "#ffad4d", dim: true },
  balance: { bg: "base", icon: "balance", color: "#50e3f0" },
  boost: { bg: "base", icon: "recycle", color: "#4fe5ff" },
  "cut-farm": { bg: "greenhouse", icon: "leafDrop", color: "#ffad4d", dim: true },
  repair: { bg: "base", icon: "wrench", color: "#43d9a3" },
  "full-ops": { bg: "base", icon: "flask", color: "#8c78ff" },
  essential: { bg: "base", icon: "shield", color: "#43d9a3" },
  conserve: { bg: "base", icon: "battery", color: "#ff6b6b", dim: true },
};

function Glyph({ icon }: { icon: Icon }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (icon) {
    case "sun":
      return (
        <g {...s}>
          <circle cx="24" cy="24" r="8" fill="currentColor" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="24" y1="8" x2="24" y2="3" transform={`rotate(${a} 24 24)`} />
          ))}
        </g>
      );
    case "dim":
      return (
        <g {...s}>
          <path d="M30 8a16 16 0 1 0 10 26A13 13 0 0 1 30 8z" fill="currentColor" fillOpacity="0.25" />
          <path d="M14 40h20" />
        </g>
      );
    case "balance":
      return (
        <g {...s}>
          <path d="M24 6v34M12 40h24M8 14h32" />
          <path d="M8 14l-5 12h10zM40 14l-5 12h10z" fill="currentColor" fillOpacity="0.3" />
        </g>
      );
    case "inspect":
      return (
        <g {...s}>
          <circle cx="20" cy="20" r="11" />
          <path d="M28 28l12 12" strokeWidth="4" />
          <path d="M14 20h12M20 14v12" strokeWidth="2" />
        </g>
      );
    case "recycle":
      return (
        <g {...s}>
          <path d="M24 6c-8 10-12 15-12 21a12 12 0 0 0 24 0c0-6-4-11-12-21z" fill="currentColor" fillOpacity="0.25" />
          <path d="M18 28a6 6 0 0 0 10 4M30 26l-2 6-6-2" />
        </g>
      );
    case "leafDrop":
      return (
        <g {...s}>
          <path d="M10 38c0-16 10-26 28-28-2 18-12 28-28 28z" fill="currentColor" fillOpacity="0.25" />
          <path d="M10 38l16-16" />
          <path d="M34 26l-6 12" strokeWidth="2" />
        </g>
      );
    case "wrench":
      return (
        <g {...s}>
          <path d="M30 6a9 9 0 0 0-8 12L8 32l8 8 14-14a9 9 0 0 0 12-8l-6 2-4-4z" fill="currentColor" fillOpacity="0.25" />
        </g>
      );
    case "drop":
      return (
        <g {...s}>
          <path d="M24 5c-9 11-13 17-13 23a13 13 0 0 0 26 0c0-6-4-12-13-23z" fill="currentColor" fillOpacity="0.25" />
          <path d="M17 30h14" />
        </g>
      );
    case "flask":
      return (
        <g {...s}>
          <path d="M18 6h12M20 6v12L9 38a3 3 0 0 0 3 4h24a3 3 0 0 0 3-4L28 18V6" fill="currentColor" fillOpacity="0.2" />
          <circle cx="20" cy="32" r="2" fill="currentColor" />
          <circle cx="28" cy="35" r="1.5" fill="currentColor" />
        </g>
      );
    case "shield":
      return (
        <g {...s}>
          <path d="M24 4l16 6v12c0 10-7 17-16 22C15 39 8 32 8 22V10z" fill="currentColor" fillOpacity="0.2" />
          <path d="M17 24l5 5 9-10" />
        </g>
      );
    case "battery":
      return (
        <g {...s}>
          <rect x="6" y="14" width="32" height="20" rx="4" />
          <path d="M42 21v6" strokeWidth="4" />
          <rect x="10" y="18" width="8" height="12" rx="1" fill="currentColor" />
        </g>
      );
  }
}

export function OptionArt({ optionId, locked = false }: { optionId: string; locked?: boolean }) {
  const a = ART[optionId] ?? { bg: "base" as const, icon: "inspect" as Icon, color: "#50e3f0" };
  return (
    <div className="relative h-36 overflow-hidden rounded-xl sm:h-40" aria-hidden>
      <img
        src={`/art/${a.bg}.png`}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: locked ? "grayscale(1) brightness(0.45)" : a.dim ? "brightness(0.55) saturate(0.7)" : "none" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/30 to-transparent" />
      <div
        className="absolute bottom-3 end-3 grid size-16 place-items-center rounded-full border-2 bg-space/80 backdrop-blur"
        style={{ borderColor: a.color, color: a.color, boxShadow: `0 0 22px ${a.color}88` }}
      >
        <svg viewBox="0 0 48 48" width="36" height="36">
          <Glyph icon={a.icon} />
        </svg>
      </div>
      {locked && <div className="absolute start-3 top-3 rounded-full bg-coral px-3 py-1 text-sm font-bold text-space">🔒</div>}
    </div>
  );
}
