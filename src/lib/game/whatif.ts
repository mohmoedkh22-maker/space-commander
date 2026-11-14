import { computeEnding, simulate } from "./engine";
import type { Choices, DayLog, DecisionId, DecisionRecord, EndingId, GameState } from "./types";

export type Prediction = "more" | "same" | "less";
export type MetricKey = "batteryKWh" | "waterL" | "oxygenPct" | "cropPct";
export const METRICS: MetricKey[] = ["batteryKWh", "waterL", "oxygenPct", "cropPct"];

export interface Timeline {
  choices: Choices;
  final: GameState;
  ending: EndingId;
  days: DayLog[];
  records: DecisionRecord[];
}

export interface WhatIfComparison {
  decisionId: DecisionId;
  original: Timeline;
  alternative: Timeline;
  diff: Record<MetricKey, number>;
  /** later decisions that had to change because the original option was locked in the new timeline */
  forcedChanges: DecisionRecord[];
}

function timeline(choices: Choices): Timeline {
  const r = simulate(choices);
  return { choices, final: r.state, ending: computeEnding(r.state), days: r.state.log, records: r.records };
}

/** Replays the mission with one decision changed; all other choices are kept when still possible. */
export function runWhatIf(original: Choices, decisionId: DecisionId, altOptionId: string): WhatIfComparison {
  const o = timeline({ ...original });
  // Records from the original run hold the *effective* options, so replay those.
  const effective: Choices = {};
  for (const rec of o.records) effective[rec.decisionId] = rec.optionId;
  const a = timeline({ ...effective, [decisionId]: altOptionId });
  const diff = Object.fromEntries(METRICS.map((m) => [m, a.final[m] - o.final[m]])) as Record<MetricKey, number>;
  return {
    decisionId,
    original: o,
    alternative: a,
    diff,
    forcedChanges: a.records.filter((r) => r.fallback),
  };
}

export function judgePrediction(diff: number, p: Prediction, tolerance = 1): boolean {
  if (Math.abs(diff) <= tolerance) return p === "same";
  return diff > 0 ? p === "more" : p === "less";
}
