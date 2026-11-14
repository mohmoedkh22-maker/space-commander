"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Lang, T } from "@/lib/game/types";
import { sfx, type Sfx } from "@/lib/audio";

interface Settings {
  lang: Lang;
  /** interface sound effects */
  sound: boolean;
  /** cinematic ambience + music */
  music: boolean;
  reducedMotion: boolean;
  bigText: boolean;
  /** onboarding: the cinematic introduction was completed or skipped */
  introDone: boolean;
}
interface Ctx extends Settings {
  set: (p: Partial<Settings>) => void;
  tx: (x: T) => string;
  beep: (kind?: Sfx) => void;
}

const SettingsContext = createContext<Ctx | null>(null);
const KEY = "space-commander-settings";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<Settings>({
    lang: "ar",
    sound: false,
    music: false,
    reducedMotion: false,
    bigText: false,
    introDone: false,
  });

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

  // Synthesized UI sounds (original, no audio files); off by default.
  const beep = useCallback(
    (kind: Sfx = "soft") => {
      if (!s.sound) return;
      try {
        sfx(kind);
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
