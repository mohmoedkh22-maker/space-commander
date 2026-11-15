"use client";
import { useEffect, useRef, useState } from "react";
import { hudNotices, resourceChanges, type Notice, type ResourceChange } from "@/lib/game/feedback";
import type { GameState } from "@/lib/game/types";
import { UI, t } from "@/lib/i18n";
import { RESOURCE_ORDER, resourceValue } from "@/lib/mission";
import { Toolbar } from "../Hud";
import { useSettings } from "../settings";
import { ResourceIndicator } from "./ResourceIndicator";
import { BaseConditionChip, ChapterTracker } from "../experience/Journey";

const NOTICE_STYLE: Record<Notice["level"], string> = {
  ok: "border-mint bg-[#0f2a2a]",
  warn: "border-solar bg-[#2a2210]",
  crit: "border-coral bg-[#2e1418]",
};

/**
 * Top bar: mission day, chapters, base status, the four resources and settings.
 * Phase 4: when the state changes, the resources that moved flash (▲ green / ▼ red) and
 * important crossings appear as short mission notifications (computed in lib/game/feedback.ts).
 */
export function MissionHUD({ state, onScience, onMenu, note }: { state: GameState; onScience?: () => void; onMenu?: () => void; note?: string }) {
  const { tx, beep } = useSettings();
  const day = Math.min(state.day, 7);
  const prev = useRef<GameState | null>(null);
  const seq = useRef(0);
  const [changes, setChanges] = useState<ResourceChange[]>([]);
  const [notices, setNotices] = useState<(Notice & { key: number })[]>([]);

  useEffect(() => {
    const p = prev.current;
    prev.current = state;
    if (!p || p === state) return;
    const ch = resourceChanges(p.resources, state.resources);
    setChanges(ch);
    const ns = hudNotices(p, state);
    if (ns.length) {
      beep(ns.some((n) => n.level === "crit") ? "warning" : ns.some((n) => n.level === "warn") ? "notify" : "success");
      setNotices((cur) => [...cur, ...ns.map((n) => ({ ...n, key: ++seq.current }))].slice(-3));
    }
    const id = window.setTimeout(() => setChanges([]), 2800);
    return () => window.clearTimeout(id);
  }, [state, beep]);

  // each notification stays ~5 s (long enough to read), the oldest leaves first
  useEffect(() => {
    if (!notices.length) return;
    const id = window.setTimeout(() => setNotices((cur) => cur.slice(1)), 5200);
    return () => window.clearTimeout(id);
  }, [notices]);

  return (
    <div className="sticky top-0 z-20 border-b border-holo/15 bg-space/90 backdrop-blur [@media(max-height:500px)]:static" data-hud>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-1.5 sm:px-4 sm:py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-display text-sm font-bold tracking-widest text-holo">
            {tx(UI.day)} <span className="text-lunar">{day}</span>/7
          </div>
          <ChapterTracker day={state.day} />
          <BaseConditionChip state={state} />
        </div>
        <div className="order-3 grid w-full grid-cols-4 gap-x-2 sm:order-2 sm:flex sm:w-auto sm:min-w-[420px] sm:flex-[3] sm:gap-3">
          {RESOURCE_ORDER.map((id) => {
            const { value, pct } = resourceValue(state, id);
            return <ResourceIndicator key={id} id={id} value={value} pct={pct} change={changes.find((c) => c.id === id)} />;
          })}
        </div>
        <div className="order-2 ms-auto sm:order-3">
          <Toolbar onScience={onScience} onMenu={onMenu} />
        </div>
      </div>
      {note && <p className="mx-auto max-w-6xl px-4 pb-1.5 text-xs text-moon">{note}</p>}

      {/* mission notifications */}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-3" role="status" aria-live="polite" aria-label={tx(t("إشعارات المهمة", "Mission notifications"))}>
        {notices.map((n) => (
          <div
            key={n.key}
            className={`notice-in pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border-2 px-4 py-2.5 shadow-[0_8px_30px_#0008] ${NOTICE_STYLE[n.level]} ${n.level === "crit" ? "banner-pulse" : ""}`}
            data-notice={n.id}
          >
            <span className="text-xl" aria-hidden>
              {n.icon}
            </span>
            <span className="flex-1 font-bold leading-snug">{tx(n.text)}</span>
            <button
              className="grid size-11 shrink-0 place-items-center rounded-full border border-lunar/30 text-sm hover:bg-lunar/10"
              onClick={() => setNotices((cur) => cur.filter((x) => x.key !== n.key))}
              aria-label={tx(t("إغلاق الإشعار", "Dismiss notification"))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
