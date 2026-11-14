"use client";
import type { T } from "@/lib/game/types";
import { useSettings } from "../settings";

/** Progress dots joined by a line, as in the approved mockups. Done = ✓, current = glowing. */
export function Stepper({ steps, current, onJump }: { steps: T[]; current: number; onJump?: (i: number) => void }) {
  const { tx } = useSettings();
  return (
    <ol className="flex items-start">
      {steps.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={i} className="flex flex-1 flex-col items-center gap-1 text-center">
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : done || now ? "bg-holo" : "bg-moon/30"}`} />
              <button
                disabled={!onJump || i > current}
                onClick={() => onJump?.(i)}
                aria-current={now ? "step" : undefined}
                aria-label={`${i + 1}. ${tx(s)}${done ? " ✓" : ""}`}
                className={`grid size-9 shrink-0 place-items-center rounded-full border-2 text-sm font-bold transition ${
                  now ? "border-holo bg-holo text-space shadow-[0_0_16px_#50e3f0]" : done ? "border-holo bg-space text-holo" : "border-moon/40 text-moon"
                }`}
              >
                {done ? "✓" : i + 1}
              </button>
              <span className={`h-0.5 flex-1 ${i === steps.length - 1 ? "opacity-0" : done ? "bg-holo" : "bg-moon/30"}`} />
            </div>
            <span className={`hidden text-xs sm:block ${now ? "font-bold text-holo" : "text-moon"}`}>{tx(s)}</span>
          </li>
        );
      })}
    </ol>
  );
}
