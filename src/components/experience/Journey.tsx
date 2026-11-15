"use client";
// V0.7 shared journey UI: crew reports, base condition, chapter tracker, scene transition.
import type { ReactNode } from "react";
import {
  BASE_CONDITION_COLOR,
  BASE_CONDITION_TEXT,
  CHAPTERS,
  baseCondition,
  chapterForDay,
  crewReports,
  type ReportLevel,
} from "@/lib/game/journey";
import type { GameState } from "@/lib/game/types";
import { CREW, t } from "@/lib/i18n";
import { Portrait } from "../Portrait";
import { useSettings } from "../settings";

const LEVEL_STYLE: Record<ReportLevel, { color: string; label: ReturnType<typeof t>; sym: string }> = {
  ok: { color: "#43d9a3", label: t("مستقر", "Stable"), sym: "✓" },
  warn: { color: "#ffad4d", label: t("تحذير", "Warning"), sym: "!" },
  crit: { color: "#ff6b6b", label: t("حرج", "Critical"), sym: "‼" },
  recovery: { color: "#5be3a0", label: t("تعافٍ", "Recovering"), sym: "↗" },
};

/** The four crew members report on their own systems, based on the real state. */
export function CrewReports({ state, title }: { state: GameState; title?: ReturnType<typeof t> }) {
  const { tx } = useSettings();
  return (
    <section className="panel p-4" aria-label={tx(title ?? t("تقارير الطاقم", "Crew reports"))}>
      <h2 className="mb-3 font-display text-sm font-bold tracking-wider text-holo">👩‍🚀 {tx(title ?? t("تقارير الطاقم", "Crew reports"))}</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {crewReports(state).map((c) => {
          const lv = LEVEL_STYLE[c.level];
          return (
            <li key={c.who} className="flex items-start gap-3 rounded-xl border bg-space/50 p-2" style={{ borderColor: lv.color + "66" }}>
              <Portrait id={c.who} size={48} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 text-sm">
                  <b style={{ color: CREW[c.who].color }}>{tx(CREW[c.who].name)}</b>
                  <span className="text-xs text-moon">{tx(c.role)}</span>
                  <span className="ms-auto rounded-full px-2 text-xs font-bold" style={{ color: lv.color, border: `1px solid ${lv.color}` }}>
                    {lv.sym} {tx(lv.label)}
                  </span>
                </p>
                <p className="mt-1 text-sm leading-relaxed">“{tx(c.text)}”</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** One label for the base: Normal / Warning / Critical / Recovery / Mission complete. */
export function BaseConditionChip({ state }: { state: GameState }) {
  const { tx } = useSettings();
  const c = baseCondition(state);
  const color = BASE_CONDITION_COLOR[c];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-bold ${c === "critical" ? "anim-glow" : ""}`}
      style={{ color, borderColor: color }}
      role="status"
      aria-label={`${tx(t("حالة القاعدة", "Base status"))}: ${tx(BASE_CONDITION_TEXT[c])}`}
    >
      <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />
      {tx(t("القاعدة", "Base"))}: {tx(BASE_CONDITION_TEXT[c])}
    </span>
  );
}

/** Frames the base map with the colour of its condition. */
export function BaseFrame({ state, children }: { state: GameState; children: ReactNode }) {
  const c = baseCondition(state);
  const color = BASE_CONDITION_COLOR[c];
  return (
    <div className="panel relative !p-2" style={{ borderColor: color + "aa", boxShadow: c === "critical" ? `0 0 24px ${color}55` : undefined }} data-base-condition={c}>
      <div className="absolute end-3 top-3 z-10">
        <BaseConditionChip state={state} />
      </div>
      {children}
    </div>
  );
}

/** Chapter 1 · 2 · 3 progress for the HUD. */
export function ChapterTracker({ day }: { day: number }) {
  const { tx } = useSettings();
  const current = day > 7 ? 4 : chapterForDay(day).id;
  return (
    <ol className="flex items-center gap-1 text-xs" aria-label={tx(t("فصول المهمة", "Mission chapters"))}>
      {CHAPTERS.map((c) => {
        const state = c.id < current ? "done" : c.id === current ? "now" : "next";
        return (
          <li
            key={c.id}
            aria-current={state === "now" ? "step" : undefined}
            className={`rounded-full border px-2 py-0.5 ${state === "now" ? "border-holo bg-holo/15 font-bold text-holo" : state === "done" ? "border-mint/50 text-mint" : "border-holo/20 text-moon"}`}
            title={tx(c.title)}
          >
            {state === "done" ? "✓" : c.id} <span className="hidden md:inline">{tx(c.title)}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Gentle fade between major scenes; Reduce Motion turns it off (globals.css). */
export function Scene({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div key={id} className="scene-in" data-scene={id}>
      {children}
    </div>
  );
}
