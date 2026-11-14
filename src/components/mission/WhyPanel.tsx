"use client";
import type { Consequence, T } from "@/lib/game/types";
import { t } from "@/lib/i18n";
import { useSettings } from "../settings";

const ICON: Record<Consequence["kind"], string> = {
  energy: "☀️",
  load: "⚡",
  shed: "⚠️",
  water: "💧",
  food: "🌱",
  oxygen: "🫧",
  facility: "🏗️",
  safety: "🛡️",
};

/** "Why did this happen?" — the simulation's own explanation of each consequence. */
export function WhyPanel({ items, reasons, open = false }: { items?: Consequence[]; reasons?: T[]; open?: boolean }) {
  const { tx } = useSettings();
  const rows = items ?? (reasons ?? []).map((text) => ({ kind: "safety" as const, text }));
  if (!rows.length) return null;
  return (
    <details open={open} className="panel group p-4 sm:p-5" style={{ borderColor: "#8c78ff88" }}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-display text-lg font-bold">
        <span>🔍 {tx(t("لماذا حدث هذا؟", "Why did this happen?"))}</span>
        <span className="text-moon transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <ul className="mt-3 flex flex-col gap-2">
        {rows.map((c, i) => (
          <li key={i} className="flex gap-3 rounded-xl bg-space/60 px-3 py-2 leading-relaxed">
            <span aria-hidden>{ICON[c.kind]}</span>
            <span>{tx(c.text)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
