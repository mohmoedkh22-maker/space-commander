"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Lang, T } from "@/lib/game/types";
import { setVolumes, sfx, unlockAudio, type Sfx } from "@/lib/audio";

interface Settings {
  lang: Lang;
  /** interface sound effects */
  sound: boolean;
  /** music + ambience */
  music: boolean;
  /** Phase 5: volumes 0..1 and a master mute */
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  reducedMotion: boolean;
  bigText: boolean;
  /** onboarding: the cinematic introduction was completed or skipped */
  introDone: boolean;
}
interface Ctx extends Settings {
  /** true once the saved settings were read from this device */
  ready: boolean;
  /** true after the child's first tap or key press (sound is only possible from then on) */
  audioReady: boolean;
  set: (p: Partial<Settings>) => void;
  tx: (x: T) => string;
  beep: (kind?: Sfx) => void;
}

const SettingsContext = createContext<Ctx | null>(null);
const KEY = "space-commander-settings";

export const DEFAULT_SETTINGS: Settings = {
  lang: "ar",
  sound: false,
  music: false,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  muted: false,
  reducedMotion: false,
  bigText: false,
  introDone: false,
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      const parsed = saved ? (JSON.parse(saved) as Partial<Settings>) : {};
      // first visit: follow the device's "reduce motion" preference
      if (parsed.reducedMotion === undefined && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) parsed.reducedMotion = true;
      setS((p) => ({ ...p, ...parsed }));
    } catch {}
    setReady(true);
  }, []);

  // Phase 5: nothing can sound before the child's first tap or key press
  const [audioReady, setAudioReady] = useState(false);
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      setAudioReady(true);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    setVolumes({ musicVolume: s.musicVolume, sfxVolume: s.sfxVolume, muted: s.muted });
  }, [s.musicVolume, s.sfxVolume, s.muted, audioReady]);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = s.lang;
    html.dir = s.lang === "ar" ? "rtl" : "ltr";
    html.dataset.motion = s.reducedMotion ? "reduced" : "full";
    html.dataset.text = s.bigText ? "large" : "normal";
    if (!ready) return; // never overwrite the saved settings with the defaults before they were read
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {}
  }, [s, ready]);

  const set = useCallback((p: Partial<Settings>) => setS((prev) => ({ ...prev, ...p })), []);
  const tx = useCallback((x: T) => x[s.lang], [s.lang]);

  // Synthesized UI sounds (original, no audio files); off by default; silent when muted or before the first interaction.
  const beep = useCallback(
    (kind: Sfx = "soft") => {
      if (!s.sound || s.muted) return;
      try {
        sfx(kind);
      } catch {}
    },
    [s.sound, s.muted],
  );

  const value = useMemo(() => ({ ...s, ready, audioReady, set, tx, beep }), [s, ready, audioReady, set, tx, beep]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const c = useContext(SettingsContext);
  if (!c) throw new Error("useSettings must be used inside SettingsProvider");
  return c;
}
