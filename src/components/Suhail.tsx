/* eslint-disable @next/next/no-img-element -- static export, small local art */
"use client";
import { useSettings } from "./settings";
import type { T } from "@/lib/game/types";

export type Mood = "normal" | "curious" | "thinking" | "warning" | "happy";

const BADGE: Partial<Record<Mood, { sym: string; bg: string }>> = {
  curious: { sym: "?", bg: "#50e3f0" },
  thinking: { sym: "…", bg: "#8c78ff" },
  warning: { sym: "!", bg: "#ff6b6b" },
  happy: { sym: "★", bg: "#ffad4d" },
};

/** SUHAIL — art from the team's identity board (Cosmic Discovery). A small badge shows the mood. */
export function SuhailBot({ mood = "normal", size = 96 }: { mood?: Mood; size?: number }) {
  const b = BADGE[mood];
  const ring = mood === "warning" ? "#ff6b6b" : "#50e3f0";
  return (
    <span className="anim-float relative inline-block shrink-0" style={{ width: size, height: size }} aria-hidden>
      <span
        className="block h-full w-full overflow-hidden rounded-full border-[3px] bg-midnight"
        style={{ borderColor: ring, boxShadow: `0 0 22px ${ring}66` }}
      >
        <img src="/art/suhail.png" alt="" width={size} height={size} className="h-full w-full scale-125 object-cover object-[50%_25%]" />
      </span>
      {b && (
        <span
          className="absolute -top-1 -end-1 grid place-items-center rounded-full border-2 border-space font-display font-bold text-space"
          style={{ width: size * 0.34, height: size * 0.34, background: b.bg, fontSize: size * 0.2 }}
        >
          {b.sym}
        </span>
      )}
    </span>
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
