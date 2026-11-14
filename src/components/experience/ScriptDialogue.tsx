"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { radioStatic } from "@/lib/audio";
import type { Line } from "@/lib/game/experience";
import { CREW, t } from "@/lib/i18n";
import { Portrait } from "../Portrait";
import { useSettings } from "../settings";
import { SuhailBot } from "../Suhail";
import { Button } from "../ui";

/** Speaker avatar that pulses while its line is being "spoken". */
export function SpeakerAvatar({ who, size = 72, speaking = false }: { who: Line["who"]; size?: number; speaking?: boolean }) {
  return (
    <span className={`relative inline-block shrink-0 rounded-full ${speaking ? "speaking" : ""}`} style={{ width: size, height: size }}>
      {who === "suhail" ? <SuhailBot mood="normal" size={size} /> : <Portrait id={who} size={size} />}
    </span>
  );
}

export function speakerName(who: Line["who"], tx: (x: { ar: string; en: string }) => string) {
  return who === "suhail" ? tx(t("سهيل", "SUHAIL")) : tx(CREW[who].name);
}

/**
 * Multi-speaker dialogue: typed subtitles, Continue / Replay / Skip.
 * Works without audio; reduced motion shows lines instantly.
 */
export function ScriptDialogue({ lines, onDone, doneLabel }: { lines: Line[]; onDone: () => void; doneLabel?: string }) {
  const { tx, sound, reducedMotion } = useSettings();
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(0);
  const line = lines[Math.min(i, lines.length - 1)];
  const text = line ? tx(line.text) : "";
  const full = shown >= text.length;
  const last = i >= lines.length - 1;
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (reducedMotion || (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)) {
      setShown(text.length);
      return;
    }
    setShown(0);
    const id = window.setInterval(() => setShown((n) => (n >= text.length ? (window.clearInterval(id), n) : n + 2)), 26);
    return () => window.clearInterval(id);
  }, [text, reducedMotion]);

  useEffect(() => {
    if (sound) radioStatic();
    btn.current?.focus();
  }, [i, sound]);

  const advance = useCallback(() => {
    if (!full) return setShown(text.length);
    if (last) onDone();
    else setI((n) => n + 1);
  }, [full, last, onDone, text.length]);

  if (!line) return null;
  const color = line.who === "suhail" ? "#4fe5ff" : CREW[line.who].color;
  return (
    <div className="panel w-full p-4 sm:p-5 anim-rise" style={{ borderColor: color + "aa", boxShadow: `0 0 36px ${color}22` }}>
      <div className="flex items-start gap-4">
        <SpeakerAvatar key={i} who={line.who} size={76} speaking={!full} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <b className="font-display text-lg" style={{ color }}>
              {speakerName(line.who, tx)}
            </b>
            <span className="font-display text-sm text-moon" dir="ltr" aria-hidden>
              {i + 1} / {lines.length}
            </span>
          </div>
          <p className="min-h-[3.2em] cursor-pointer text-lg leading-relaxed sm:text-xl" onClick={advance} aria-live="polite">
            <span className="sr-only">{text}</span>
            <span aria-hidden>{text.slice(0, shown)}</span>
            {!full && <span className="ms-0.5 animate-pulse text-holo" aria-hidden>▍</span>}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <button className="min-h-11 rounded-xl border border-holo/30 px-3 py-2 text-sm hover:bg-holo/10" onClick={() => (setI(0), setShown(0))}>
          ↺ {tx(t("إعادة", "Replay"))}
        </button>
        {!last && (
          <button className="min-h-11 rounded-xl border border-holo/30 px-3 py-2 text-sm hover:bg-holo/10" onClick={onDone}>
            ⏭ {tx(t("تخطي الحوار", "Skip dialogue"))}
          </button>
        )}
        <Button ref={btn} onClick={advance} className="min-w-[150px]">
          {last && full ? (doneLabel ?? tx(t("متابعة", "Continue"))) : tx(t("متابعة", "Continue"))} ▶
        </Button>
      </div>
    </div>
  );
}
