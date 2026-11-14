"use client";
import type { CrewId } from "@/lib/game/types";
import { CREW } from "@/lib/i18n";
import { FACILITIES, FACILITY_ORDER } from "@/lib/mission";
import { useSettings } from "../settings";

/** Crew member card. Avatar is a labelled placeholder (initial in their identity colour). */
export function CrewCard({ id, compact = false }: { id: CrewId; compact?: boolean }) {
  const { tx } = useSettings();
  const c = CREW[id];
  const places = FACILITY_ORDER.filter((f) => FACILITIES[f].crew === id).map((f) => tx(FACILITIES[f].name));
  return (
    <article
      className="flex h-full flex-col gap-2 rounded-2xl border-2 bg-midnight/80 p-4 anim-rise"
      style={{ borderColor: c.color + "99", boxShadow: `0 0 24px ${c.color}22` }}
    >
      <div className="flex items-center gap-3">
        <div className="grid size-14 shrink-0 place-items-center rounded-full font-display text-2xl font-bold text-space" style={{ background: c.color }} aria-hidden>
          {c.initial}
        </div>
        <div>
          <h3 className="font-display text-xl font-bold">{tx(c.name)}</h3>
          <p className="text-sm" style={{ color: c.color }}>
            {tx(c.role)}
          </p>
        </div>
      </div>
      {!compact && (
        <>
          <p className="leading-relaxed">{tx(c.duty)}</p>
          {places.length > 0 && <p className="mt-auto text-sm text-moon">📍 {places.join(" · ")}</p>}
        </>
      )}
    </article>
  );
}
