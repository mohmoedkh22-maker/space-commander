"use client";
import { useState } from "react";
import { SETTINGS_TEXT, SettingsModal } from "./SettingsModal";
import { BATTERY_CAP_KWH, WATER_CAP_L } from "@/lib/game/config";
import type { GameState } from "@/lib/game/types";
import { UI, t } from "@/lib/i18n";
import { useSettings } from "./settings";

function Meter({
  label,
  icon,
  pct,
  value,
  color,
}: {
  label: string;
  icon: string;
  pct: number;
  value: string;
  color: string;
}) {
  const level = pct < 20 ? "crit" : pct < 40 ? "warn" : "ok";
  const { tx } = useSettings();
  const levelText = { crit: t("حرج", "critical"), warn: t("منخفض", "low"), ok: t("مستقر", "stable") }[level];
  return (
    <div className="min-w-0 flex-1" role="meter" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${value}, ${tx(levelText)}`}>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs sm:text-sm">
        <span className="truncate">
          <span aria-hidden>{icon} </span>
          {label}
        </span>
        <span className="whitespace-nowrap font-display font-bold tabular-nums" dir="ltr">
          {value}
          {level !== "ok" && <span className={level === "crit" ? "text-coral" : "text-solar"}> !</span>}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-space/80">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: level === "crit" ? "#ff6b6b" : color }}
        />
      </div>
    </div>
  );
}

export function Hud({ state, onScience }: { state: GameState; onScience: () => void }) {
  const { tx } = useSettings();
  const day = Math.min(state.day, 7);
  return (
    <div className="z-20 border-b sm:sticky sm:top-0 border-holo/15 bg-space/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <div className="font-display text-sm font-bold tracking-widest text-holo">
          {tx(UI.day)} <span className="text-lunar">{day}</span>/7
        </div>
        <div className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 sm:flex sm:w-auto sm:min-w-[420px] sm:flex-[3] sm:gap-3">
          <Meter label={tx(UI.energy)} icon="⚡" pct={(state.batteryKWh / BATTERY_CAP_KWH) * 100} value={`${Math.round(state.batteryKWh)} kWh`} color="#ffad4d" />
          <Meter label={tx(UI.water)} icon="💧" pct={(state.waterL / WATER_CAP_L) * 100} value={`${Math.round(state.waterL)} L`} color="#326bff" />
          <Meter label={tx(UI.oxygen)} icon="🫧" pct={state.oxygenPct} value={`${Math.round(state.oxygenPct)}%`} color="#50e3f0" />
          <Meter label={tx(UI.food)} icon="🌱" pct={state.cropPct} value={`${Math.round(state.cropPct)}%`} color="#43d9a3" />
        </div>
        <Toolbar onScience={onScience} />
      </div>
    </div>
  );
}

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
