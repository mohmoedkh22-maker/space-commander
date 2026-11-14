"use client";
import { BATTERY_CAP_KWH } from "@/lib/game/config";
import type { GameState } from "@/lib/game/types";
import { t } from "@/lib/i18n";
import { useSettings } from "./settings";

import { FACILITIES, type FacilityId } from "@/lib/mission";

export { FACILITIES, type FacilityId };
export type Status = "ok" | "warn" | "crit" | "dim";

/** Map highlight for each building, driven by the simulation's facility conditions and resources. */
export function facilityStatus(s: GameState): Record<FacilityId, Status> {
  const bat = s.batteryKWh / BATTERY_CAP_KWH;
  const f = s.facilities;
  return {
    energy: bat < 0.15 ? "crit" : bat < 0.4 ? "warn" : "ok",
    life: f.life === "strained" || s.oxygenPct < 90 ? "crit" : "ok",
    greenhouse: f.greenhouse === "thriving" ? "ok" : f.greenhouse === "reduced" ? "warn" : "dim",
    water: f.water === "faulty" ? "warn" : s.waterL < 200 ? "crit" : "ok",
    shelter: f.shelter === "active" ? "warn" : "dim",
    command: "ok",
  };
}

const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;
const O = { x: 400, y: 150 };
const P = (x: number, y: number, z = 0) => `${O.x + (x - y) * COS},${O.y + (x + y) * SIN - z}`;

function Box({ x, y, w, d, h, top, left, right }: { x: number; y: number; w: number; d: number; h: number; top: string; left: string; right: string }) {
  return (
    <g>
      <polygon points={[P(x, y + d, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x, y + d, h)].join(" ")} fill={left} />
      <polygon points={[P(x + w, y, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x + w, y, h)].join(" ")} fill={right} />
      <polygon points={[P(x, y, h), P(x + w, y, h), P(x + w, y + d, h), P(x, y + d, h)].join(" ")} fill={top} />
    </g>
  );
}

const LAYOUT: Record<FacilityId, { x: number; y: number; w: number; d: number; h: number }> = {
  command: { x: 120, y: 120, w: 80, d: 80, h: 50 },
  energy: { x: -60, y: 20, w: 120, d: 70, h: 10 },
  life: { x: 230, y: 110, w: 60, d: 70, h: 40 },
  greenhouse: { x: 120, y: 240, w: 90, d: 70, h: 0 },
  water: { x: 0, y: 160, w: 70, d: 60, h: 34 },
  shelter: { x: 250, y: 240, w: 70, d: 60, h: 26 },
};

export function LunarBase({
  status,
  onSelect,
  selected,
  storm = false,
}: {
  status: Record<FacilityId, Status>;
  onSelect?: (id: FacilityId) => void;
  selected?: FacilityId | null;
  storm?: boolean;
}) {
  const { tx } = useSettings();
  const glow = (st: Status, c: string) => (st === "crit" ? "#ff6b6b" : st === "warn" ? "#ffad4d" : st === "dim" ? "#aab6ca55" : c);

  return (
    <svg viewBox="0 0 800 470" className="h-auto w-full" role="group" aria-label={tx(t("قاعدة سيليني-1 على القمر", "SELENE-1 lunar base"))}>
      <defs>
        <radialGradient id="earth" cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#7fb2ff" />
          <stop offset="60%" stopColor="#326bff" />
          <stop offset="100%" stopColor="#151f3d" />
        </radialGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a4258" />
          <stop offset="100%" stopColor="#1d2335" />
        </linearGradient>
        <radialGradient id="dome" cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#c8ffe9" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#43d9a3" stopOpacity="0.25" />
        </radialGradient>
      </defs>

      {/* Earth on the horizon */}
      <circle cx="690" cy="70" r="34" fill="url(#earth)" />
      <path d="M672 58 q10 -8 20 2 q-6 10 -16 6z M700 82 q8 -4 12 4 q-6 6 -12 -4z" fill="#43d9a3" opacity="0.7" />
      {/* Low Sun near the horizon (south pole) */}
      <circle cx="60" cy="190" r="16" fill="#ffad4d" opacity={storm ? 0.9 : 0.75} className="anim-glow" />
      <path d="M0 200 L120 175 L210 195 L330 168 L420 190 L560 160 L680 185 L800 170 L800 470 L0 470 Z" fill="#262d42" />
      {/* Ground plate */}
      <polygon points={[P(-140, -60), P(420, -60), P(420, 380), P(-140, 380)].join(" ")} fill="url(#ground)" />
      {/* Craters */}
      <ellipse cx="160" cy="400" rx="60" ry="16" fill="#151a28" opacity="0.7" />
      <ellipse cx="640" cy="420" rx="70" ry="18" fill="#151a28" opacity="0.7" />
      {/* Paths */}
      <g stroke="#aab6ca55" strokeWidth="6" strokeLinecap="round" fill="none">
        <polyline points={[P(30, 120), P(160, 160)].join(" ")} />
        <polyline points={[P(160, 160), P(260, 145)].join(" ")} />
        <polyline points={[P(160, 160), P(165, 275)].join(" ")} />
        <polyline points={[P(165, 275), P(285, 270)].join(" ")} />
        <polyline points={[P(0, 55), P(30, 120)].join(" ")} />
      </g>
      {storm && <rect x="0" y="0" width="800" height="470" fill="#8c78ff" opacity="0.12" className="anim-glow" />}

      {(Object.keys(LAYOUT) as FacilityId[]).map((id) => {
        const L = LAYOUT[id];
        const st = status[id];
        const c = glow(st, FACILITIES[id].color);
        const isSel = selected === id;
        const [lx, ly] = P(L.x + L.w / 2, L.y + L.d / 2, L.h + 30).split(",").map(Number);
        return (
          <g
            key={id}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={`${tx(FACILITIES[id].name)}`}
            aria-pressed={onSelect ? isSel : undefined}
            onClick={() => onSelect?.(id)}
            onKeyDown={(e) => {
              if (onSelect && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onSelect(id);
              }
            }}
            className={onSelect ? "cursor-pointer outline-none" : ""}
            style={{ filter: isSel ? `drop-shadow(0 0 10px ${c})` : undefined }}
          >
            {/* status ring on the ground */}
            <polygon
              points={[P(L.x - 8, L.y - 8), P(L.x + L.w + 8, L.y - 8), P(L.x + L.w + 8, L.y + L.d + 8), P(L.x - 8, L.y + L.d + 8)].join(" ")}
              fill="none"
              stroke={c}
              strokeWidth={isSel ? 4 : 2}
              opacity={st === "dim" ? 0.4 : 0.9}
              className={st === "warn" || st === "crit" ? "anim-glow" : ""}
            />
            {id === "energy" ? (
              <>
                {[0, 1, 2].map((i) => (
                  <Box key={i} x={L.x + i * 42} y={L.y} w={34} d={L.d} h={L.h} top={st === "dim" ? "#2a3550" : "#1f3a7a"} left="#141c33" right="#1a2544" />
                ))}
                <Box x={L.x + 20} y={L.y + L.d + 12} w={40} d={20} h={22} top="#f3f6fc" left="#aab6ca" right="#8c97ad" />
                <rect x={lx - 8} y={ly + 34} width="16" height="6" rx="2" fill={c} />
              </>
            ) : id === "greenhouse" ? (
              <>
                <Box x={L.x} y={L.y} w={L.w} d={L.d} h={10} top="#aab6ca" left="#6f7a90" right="#5c667a" />
                <ellipse
                  cx={lx}
                  cy={ly + 38}
                  rx="62"
                  ry="40"
                  fill="url(#dome)"
                  opacity={st === "ok" ? 1 : st === "warn" ? 0.6 : 0.3}
                  stroke="#c8ffe9"
                  strokeOpacity="0.5"
                />
                {[-24, 0, 24].map((dx) => (
                  <path key={dx} d={`M${lx + dx} ${ly + 58} q-6 -14 0 -22 q6 8 0 22`} fill="#43d9a3" opacity={st === "dim" ? 0.4 : 0.9} />
                ))}
              </>
            ) : (
              <>
                <Box x={L.x} y={L.y} w={L.w} d={L.d} h={L.h} top="#f3f6fc" left="#aab6ca" right="#8c97ad" />
                <rect x={lx - 14} y={ly + 22} width="28" height="5" rx="2.5" fill={c} className={st !== "ok" ? "anim-glow" : ""} />
                {id === "water" && <path d={`M${lx} ${ly - 4} q-7 10 0 14 q7 -4 0 -14`} fill="#50e3f0" />}
                {id === "shelter" && <rect x={lx - 8} y={ly + 4} width="16" height="12" rx="3" fill="#8c78ff" opacity="0.8" />}
                {id === "command" && <circle cx={lx} cy={ly + 2} r="6" fill="#50e3f0" className="anim-glow" />}
              </>
            )}
            {/* status symbol so status never relies on colour alone */}
            {(st === "warn" || st === "crit") && (
              <g transform={`translate(${lx + 30}, ${ly - 10})`} aria-hidden>
                <circle r="11" fill={c} />
                <text textAnchor="middle" y="5" fontSize="15" fontWeight="700" fill="#0b1026">
                  !
                </text>
              </g>
            )}
          </g>
        );
      })}
      {/* Rover */}
      <g transform={`translate(${P(-80, 230).split(",")[0]}, ${P(-80, 230).split(",")[1]})`}>
        <rect x="-18" y="-14" width="36" height="12" rx="4" fill="#f3f6fc" />
        <circle cx="-11" cy="0" r="5" fill="#0b1026" stroke="#aab6ca" />
        <circle cx="11" cy="0" r="5" fill="#0b1026" stroke="#aab6ca" />
      </g>
    </svg>
  );
}
