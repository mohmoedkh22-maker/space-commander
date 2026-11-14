"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { T } from "@/lib/game/types";
import { radioStatic } from "@/lib/audio";
import { CINE_UI } from "@/lib/cinematicScript";
import { useSettings } from "../settings";
import { Button } from "../ui";

/**
 * Reusable subtitle dialogue. Lines type out (instant with reduced motion); a tap shows the
 * whole line, the next tap moves on. Continue, Replay and line counter; works with audio off.
 */
export function DialogueBox({
  speaker,
  lines,
  onDone,
  doneLabel,
  onLine,
}: {
  speaker: string;
  lines: T[];
  onDone: () => void;
  doneLabel?: string;
  onLine?: (i: number) => void;
}) {
  const { tx, sound, reducedMotion } = useSettings();
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(0);
  const text = tx(lines[i]);
  const full = shown >= text.length;
  const last = i === lines.length - 1;
  const btnRef = useRef<HTMLButtonElement>(null);

  // typewriter
  useEffect(() => {
    const instant =
      reducedMotion || (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    if (instant) {
      setShown(text.length);
      return;
    }
    setShown(0);
    const id = window.setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          window.clearInterval(id);
          return n;
        }
        return n + 2;
      });
    }, 28);
    return () => window.clearInterval(id);
  }, [text, reducedMotion]);

  useEffect(() => {
    onLine?.(i);
    if (sound) radioStatic();
  }, [i, sound, onLine]);

  const advance = useCallback(() => {
    if (!full) {
      setShown(text.length);
      return;
    }
    if (last) onDone();
    else setI((n) => n + 1);
  }, [full, last, onDone, text.length]);

  useEffect(() => {
    btnRef.current?.focus();
  }, [i]);

  return (
    <div className="panel relative w-full p-4 sm:p-6" style={{ borderColor: "#4fe5ffaa", boxShadow: "0 0 40px #4fe5ff22" }}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="rounded-full border border-holo/60 px-3 py-0.5 font-display text-sm font-bold text-holo">{speaker}</span>
        <span className="font-display text-sm text-moon" dir="ltr" aria-hidden>
          {i + 1} / {lines.length}
        </span>
      </div>
      <p
        className="min-h-[4.5em] cursor-pointer whitespace-pre-line text-xl leading-relaxed sm:text-2xl"
        onClick={advance}
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="sr-only">{text}</span>
        <span aria-hidden>{text.slice(0, shown)}</span>
        {!full && <span className="ms-0.5 inline-block w-2 animate-pulse text-holo" aria-hidden>▍</span>}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => {
            setI(0);
            setShown(0);
          }}
          className="min-h-11 rounded-xl border border-holo/30 px-4 py-2 text-sm hover:bg-holo/10"
        >
          ↺ {tx(CINE_UI.replay)}
        </button>
        <Button ref={btnRef} onClick={advance} className="min-w-[180px]">
          {last && full ? (doneLabel ?? tx(CINE_UI.next)) : tx(CINE_UI.next)} ▶
        </Button>
      </div>
    </div>
  );
}
