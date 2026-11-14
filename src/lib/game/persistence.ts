// Optional session progress, saved on this device only (no accounts, no server).
// Pure serialize/parse functions; the UI decides when to read and write localStorage.
import { DECISIONS, DECISION_ORDER } from "./decisions";
import { simulate, STEPS } from "./engine";
import type { Choices } from "./types";

export const PROGRESS_KEY = "space-commander-progress";

export interface SavedProgress {
  v: 1;
  choices: Choices;
  stepIndex: number;
  savedAt: string;
}

export function serializeProgress(choices: Choices, stepIndex: number, now = new Date()): string {
  const p: SavedProgress = { v: 1, choices, stepIndex, savedAt: now.toISOString() };
  return JSON.stringify(p);
}

/** Returns valid saved progress, or null for anything missing, malformed or inconsistent. */
export function parseProgress(raw: string | null | undefined): SavedProgress | null {
  if (!raw) return null;
  let p: unknown;
  try {
    p = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!p || typeof p !== "object") return null;
  const o = p as Partial<SavedProgress>;
  if (o.v !== 1 || typeof o.savedAt !== "string") return null;
  if (!Number.isInteger(o.stepIndex) || (o.stepIndex as number) < 0 || (o.stepIndex as number) > STEPS.length) return null;
  if (!o.choices || typeof o.choices !== "object") return null;
  const choices: Choices = {};
  for (const [k, v] of Object.entries(o.choices)) {
    if (!DECISION_ORDER.includes(k as never)) return null;
    const id = k as keyof typeof DECISIONS;
    if (typeof v !== "string" || !DECISIONS[id].options.some((x) => x.id === v)) return null;
    choices[id] = v;
  }
  // every decision before the saved step must have a choice, so the replay reaches that step
  if (simulate(choices, o.stepIndex).snapshots.length !== o.stepIndex) return null;
  return { v: 1, choices, stepIndex: o.stepIndex as number, savedAt: o.savedAt };
}
