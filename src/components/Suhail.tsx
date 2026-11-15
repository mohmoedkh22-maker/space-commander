/* eslint-disable @next/next/no-img-element -- static export, small local art */
"use client";
import { useSettings } from "./settings";
import type { T } from "@/lib/game/types";
import { EXPRESSION_ACCENT, SuhailRobot, type SuhailExpression } from "./SuhailRobot";

/** SUHAIL's mood = one of the eight expressions ("normal" is kept as an alias of "idle" for older callers). */
export type Mood = SuhailExpression | "normal";
export const toExpression = (m: Mood): SuhailExpression => (m === "normal" ? "idle" : m);

const LABEL: Record<SuhailExpression, T> = {
  idle: { ar: "سهيل", en: "SUHAIL" },
  curious: { ar: "سهيل · فضولي", en: "SUHAIL · curious" },
  thinking: { ar: "سهيل · يفكّر", en: "SUHAIL · thinking" },
  explaining: { ar: "سهيل · يشرح", en: "SUHAIL · explaining" },
  warning: { ar: "سهيل · تنبيه", en: "SUHAIL · warning" },
  happy: { ar: "سهيل · سعيد", en: "SUHAIL · happy" },
  encouraging: { ar: "سهيل · يشجّعك", en: "SUHAIL · encouraging" },
  concerned: { ar: "سهيل · قلق", en: "SUHAIL · concerned" },
};

/** The expressive SUHAIL (vector). Decorative; his words are always shown as text. */
export function SuhailBot({ mood = "normal", size = 96 }: { mood?: Mood; size?: number }) {
  return <SuhailRobot expression={toExpression(mood)} size={size} />;
}

/** The team's original SUHAIL artwork (identity board), for portrait moments. */
export function SuhailPortrait({ size = 96 }: { size?: number }) {
  return (
    <span className="relative inline-block shrink-0 overflow-hidden rounded-full border-[3px] border-holo bg-midnight" style={{ width: size, height: size }} aria-hidden>
      <img src="/art/suhail.png" alt="" width={size} height={size} className="h-full w-full scale-125 object-cover object-[50%_25%]" />
    </span>
  );
}

export function SuhailSays({ text, mood = "normal", compact = false }: { text: T; mood?: Mood; compact?: boolean }) {
  const { tx } = useSettings();
  const e = toExpression(mood);
  const accent = EXPRESSION_ACCENT[e];
  return (
    <div className="flex items-end gap-3 anim-rise" role="status" aria-live="polite" data-suhail-mood={e}>
      <SuhailBot mood={e} size={compact ? 64 : 88} />
      <div className="panel relative px-4 py-3 text-base leading-relaxed sm:text-lg" style={{ borderColor: accent + "66" }}>
        <span className="mb-1 block font-display text-xs font-bold tracking-widest" style={{ color: accent }}>
          {tx(LABEL[e])}
        </span>
        {tx(text)}
      </div>
    </div>
  );
}
