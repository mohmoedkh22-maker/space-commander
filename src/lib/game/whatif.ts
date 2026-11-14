import { STEPS, computeEnding, simulate, simulateFrom } from "./engine";
import type { Choices, DayLog, DecisionId, DecisionRecord, EndingId, GameState, ResourceId } from "./types";

export type Prediction = "more" | "same" | "less";
export type MetricKey = ResourceId;
export const METRICS: MetricKey[] = ["energy", "water", "oxygen", "food"];

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

/**
 * Replays a decision from the EXACT saved state that existed before it:
 * applies the alternative option, then recalculates every later step.
 * The saved state and the original timeline are never mutated (all engine functions are pure).
 */
export function replayFromState(saved: GameState, decisionId: DecisionId, altOptionId: string, laterChoices: Choices) {
  const from = STEPS.indexOf(decisionId);
  if (from < 0) throw new Error(`Unknown decision ${decisionId}`);
  return simulateFrom(saved, from, { ...laterChoices, [decisionId]: altOptionId });
}

/** Replays the mission with one decision changed; all other choices are kept when still possible. */
export function runWhatIf(original: Choices, decisionId: DecisionId, altOptionId: string): WhatIfComparison {
  const run = simulate({ ...original });
  const o: Timeline = { choices: original, final: run.state, ending: computeEnding(run.state), days: run.state.log, records: run.records };
  const rec = run.records.find((r) => r.decisionId === decisionId);
  if (!rec) throw new Error(`Decision ${decisionId} was not taken in the original timeline`);
  // effective options of the original run (including any fallbacks)
  const effective: Choices = {};
  for (const r of run.records) effective[r.decisionId] = r.optionId;
  const alt = replayFromState(rec.before, decisionId, altOptionId, effective);
  const a: Timeline = {
    choices: { ...effective, [decisionId]: altOptionId },
    final: alt.state,
    ending: computeEnding(alt.state),
    days: alt.state.log,
    records: [...run.records.filter((r) => STEPS.indexOf(r.decisionId) < STEPS.indexOf(decisionId)), ...alt.records],
  };
  const diff = Object.fromEntries(METRICS.map((m) => [m, a.final.resources[m] - o.final.resources[m]])) as Record<MetricKey, number>;
  return { decisionId, original: o, alternative: a, diff, forcedChanges: alt.records.filter((r) => r.fallback) };
}

export function judgePrediction(diff: number, p: Prediction, tolerance = 1): boolean {
  if (Math.abs(diff) <= tolerance) return p === "same";
  return diff > 0 ? p === "more" : p === "less";
}
