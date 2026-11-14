/* eslint-disable @next/next/no-img-element -- static export, small local art */
"use client";
import type { CrewId } from "@/lib/game/types";
import { CREW } from "@/lib/i18n";

/** Round crew portrait with an identity-colour ring. Art from the team's identity board (Cosmic Discovery). */
export function Portrait({ id, size = 56 }: { id: CrewId; size?: number }) {
  const c = CREW[id];
  return (
    <span
      className="inline-block shrink-0 overflow-hidden rounded-full border-[3px] bg-midnight"
      style={{ width: size, height: size, borderColor: c.color, boxShadow: `0 0 16px ${c.color}55` }}
      aria-hidden
    >
      <img src={c.img} alt="" width={size} height={size} className="h-full w-full object-cover object-top" />
    </span>
  );
}
