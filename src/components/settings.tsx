"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Lang, T } from "@/lib/game/types";

interface Settings {
  lang: Lang;
  sound: boolean;
  reducedMotion: boolean;
  bigText: boolean;
}
interface Ctx extends Settings {
  set: (p: Partial<Settings>) => void;
  tx: (x: T) => string;
  beep: (kind?: "ok" | "alert" | "soft") => void;
}

const SettingsContext = createContext<Ctx | null>(null);
const KEY = "space-commander-settings";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<Settings>({ lang: "ar", sound: false, reducedMotion: false, bigText: false });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setS((p) => ({ ...p, ...JSON.parse(saved) }));
    } catch {}
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = s.lang;
    html.dir = s.lang === "ar" ? "rtl" : "ltr";
    html.dataset.motion = s.reducedMotion ? "reduced" : "full";
    html.dataset.text = s.bigText ? "large" : "normal";
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {}
  }, [s]);

  const set = useCallback((p: Partial<Settings>) => setS((prev) => ({ ...prev, ...p })), []);
  const tx = useCallback((x: T) => x[s.lang], [s.lang]);

  // Tiny synthesized UI sounds (no audio files); off by default.
  const beep = useCallback(
    (kind: "ok" | "alert" | "soft" = "soft") => {
      if (!s.sound || typeof window === "undefined") return;
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AC();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const f = kind === "ok" ? [660, 990] : kind === "alert" ? [440, 330] : [520, 620];
        o.type = "sine";
        o.frequency.setValueAtTime(f[0], ctx.currentTime);
        o.frequency.linearRampToValueAtTime(f[1], ctx.currentTime + 0.18);
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.32);
        o.onended = () => ctx.close();
      } catch {}
    },
    [s.sound],
  );

  const value = useMemo(() => ({ ...s, set, tx, beep }), [s, set, tx, beep]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const c = useContext(SettingsContext);
  if (!c) throw new Error("useSettings must be used inside SettingsProvider");
  return c;
}
