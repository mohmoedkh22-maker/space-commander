"use client";
import { LEVEL_TEXT, RESOURCES, levelOf, type ResourceId } from "@/lib/mission";
import { useSettings } from "../settings";
import type { ResourceChange } from "@/lib/game/feedback";

/**
 * One resource readout. `bar` is the compact HUD meter; `tile` is the large card
 * from the approved results mockup (icon in a ring, big number).
 * Status is always given as a word + symbol, never colour alone.
 */
export function ResourceIndicator({
  id,
  value,
  pct,
  variant = "bar",
  delta,
  change,
}: {
  id: ResourceId;
  value: number;
  pct: number;
  variant?: "bar" | "tile";
  delta?: number;
  /** Phase 4: a fresh change to show (flash + ▲/▼ amount) */
  change?: ResourceChange;
}) {
  const { tx } = useSettings();
  const r = RESOURCES[id];
  const level = levelOf(pct);
  const color = level === "crit" ? "#ff6b6b" : r.color;
  const shown = `${Math.round(value)} ${r.unit}`.replace(" %", "%");
  const label = `${tx(r.name)}: ${shown}, ${tx(LEVEL_TEXT[level])}`;

  if (variant === "tile") {
    const d = delta !== undefined ? Math.round(delta) : undefined;
    return (
      <div
        className="flex flex-col gap-2 rounded-2xl border-2 bg-space/60 p-4 shadow-[inset_0_0_24px_rgba(80,227,240,0.06)]"
        style={{ borderColor: color + "99" }}
        role="group"
        aria-label={label}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold">{tx(r.name)}</span>
          <span className="grid size-11 place-items-center rounded-full border-2 text-xl" style={{ borderColor: color }} aria-hidden>
            {r.icon}
          </span>
        </div>
        <span className="font-display text-3xl font-bold tabular-nums" dir="ltr" style={{ color }}>
          {d !== undefined ? `${d > 0 ? "+" : ""}${d}${r.unit === "%" ? "%" : " " + r.unit}` : shown}
        </span>
        <span className="text-sm text-moon">
          {level !== "ok" ? "! " : "✓ "}
          {tx(LEVEL_TEXT[level])}
        </span>
      </div>
    );
  }

  const chg = change ? `${change.direction === "up" ? "▲ +" : "▼ −"}${Math.abs(Math.round(change.delta))}${r.unit === "%" ? "%" : ""}` : null;
  return (
    <div
      key={change ? `${change.id}-${change.delta}` : "steady"}
      className={`relative min-w-0 flex-1 ${change ? (change.direction === "down" ? "res-down" : "res-up") : ""}`}
      data-change={change?.direction}
      role="meter"
      aria-label={tx(r.name)} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-valuetext={label}>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs sm:text-sm">
        <span className="truncate">
          <span aria-hidden>{r.icon} </span>
          <span className="hidden sm:inline">{tx(r.name)}</span>
        </span>
        <span className="whitespace-nowrap font-display font-bold tabular-nums" dir="ltr">
          {shown}
          {level !== "ok" && <span className={level === "crit" ? "text-coral" : "text-solar"}> !</span>}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-space/80">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${level === "crit" ? "anim-glow" : ""}`}
          style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: color }}
        />
      </div>
      {chg && (
        <span
          className={`delta-float pointer-events-none absolute -top-3 end-0 rounded-full px-1.5 font-display text-xs font-bold ${change!.direction === "down" ? "bg-coral text-space" : "bg-mint text-space"}`}
          dir="ltr"
          aria-hidden
        >
          {chg}
        </span>
      )}
    </div>
  );
}
