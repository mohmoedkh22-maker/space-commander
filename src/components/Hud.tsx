"use client";
import { useState } from "react";
import { SETTINGS_TEXT, SettingsModal } from "./SettingsModal";
import { UI } from "@/lib/i18n";
import { useSettings } from "./settings";

export function Toolbar({ onScience }: { onScience?: () => void }) {
  const { tx, lang, set, sound } = useSettings();
  const [open, setOpen] = useState(false);
  const btn = "min-h-10 rounded-xl border border-holo/30 px-3 py-1.5 text-sm hover:bg-holo/10 aria-pressed:bg-holo/20 aria-pressed:border-holo";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className={btn} onClick={() => set({ lang: lang === "ar" ? "en" : "ar" })} lang={lang === "ar" ? "en" : "ar"}>
        🌐 {tx(UI.lang)}
      </button>
      <button className={btn} aria-pressed={sound} onClick={() => set({ sound: !sound })} aria-label={tx(UI.sound)}>
        {sound ? "🔊" : "🔈"}
      </button>
      <button className={btn} onClick={() => setOpen(true)} aria-haspopup="dialog">
        ⚙ {tx(SETTINGS_TEXT.settings)}
      </button>
      {onScience && (
        <button className={btn} onClick={onScience}>
          🛰 {tx(UI.science)}
        </button>
      )}
      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
