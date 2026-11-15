"use client";
import { useState } from "react";
import { SETTINGS_TEXT, SettingsModal } from "./SettingsModal";
import { UI, t } from "@/lib/i18n";

/** Back to the start menu; the mission is saved on this device and can be continued from there. */
const MENU_LABEL = t("القائمة", "Menu");
const MORE_LABEL = t("المزيد: القائمة واللغة والصوت والإعدادات", "More: menu, language, sound and settings");
import { useSettings } from "./settings";

export function Toolbar({ onScience, onMenu }: { onScience?: () => void; onMenu?: () => void }) {
  const { tx, lang, set, sound } = useSettings();
  const [open, setOpen] = useState(false);
  // Phase 6: on phones the buttons fold behind one ☰ button so the top bar stays small
  const [more, setMore] = useState(false);
  const btn = "min-h-11 rounded-xl border border-holo/30 px-3 py-1.5 text-sm hover:bg-holo/10 aria-pressed:bg-holo/20 aria-pressed:border-holo";
  return (
    <div className={`flex flex-wrap items-center justify-end gap-2 ${more ? "w-full sm:w-auto" : ""}`}>
      <button className={`${btn} min-w-11 sm:hidden`} aria-expanded={more} onClick={() => setMore((m) => !m)} aria-label={tx(MORE_LABEL)}>
        {more ? "✕" : "☰"}
      </button>
      <div className={`${more ? "flex" : "hidden"} w-full flex-wrap justify-end gap-2 sm:flex sm:w-auto`} data-toolbar-items>
      {onMenu && (
        <button className={btn} onClick={onMenu}>
          🏠 {tx(MENU_LABEL)}
        </button>
      )}
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
      </div>
      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
