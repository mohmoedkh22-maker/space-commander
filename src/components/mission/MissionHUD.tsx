"use client";
import type { GameState } from "@/lib/game/types";
import { UI } from "@/lib/i18n";
import { RESOURCE_ORDER, resourceValue } from "@/lib/mission";
import { Toolbar } from "../Hud";
import { useSettings } from "../settings";
import { ResourceIndicator } from "./ResourceIndicator";

/** Top bar: mission day, the four resources and settings. */
export function MissionHUD({ state, onScience, note }: { state: GameState; onScience?: () => void; note?: string }) {
  const { tx } = useSettings();
  const day = Math.min(state.day, 7);
  return (
    <div className="z-20 border-b border-holo/15 bg-space/85 backdrop-blur sm:sticky sm:top-0">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <div className="font-display text-sm font-bold tracking-widest text-holo">
          {tx(UI.day)} <span className="text-lunar">{day}</span>/7
        </div>
        <div className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 sm:flex sm:w-auto sm:min-w-[420px] sm:flex-[3] sm:gap-3">
          {RESOURCE_ORDER.map((id) => {
            const { value, pct } = resourceValue(state, id);
            return <ResourceIndicator key={id} id={id} value={value} pct={pct} />;
          })}
        </div>
        <Toolbar onScience={onScience} />
      </div>
      {note && <p className="mx-auto max-w-6xl px-4 pb-1.5 text-xs text-moon">{note}</p>}
    </div>
  );
}
