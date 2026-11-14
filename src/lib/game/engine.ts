// SPACE COMMANDER simulation engine — the single source of truth.
// Pure, deterministic, immutable: no React, no randomness, no I/O; inputs are never mutated.
import { calculateSolarEnergy } from "@/lib/nasa/energyModel";
import { addDays, NASA_DATA, type DailyLight } from "@/lib/nasa/NASADataAdapter";
import {
  BATTERY_CAP_KWH,
  CROP_GROWTH,
  ENDING_RULES,
  LOADS,
  MISSION_CALENDAR,
  RESOURCE_LIMITS,
  SOLAR_RATED_KW,
  START,
  THRESHOLDS,
  WATER,
} from "./config";
import { DECISIONS, DECISION_ORDER } from "./decisions";
import { EVENTS, isMissionAvailable, missionForDay } from "./missions";
import { NO_CHECKS, allSafetyChecksDone } from "./safety";
import type {
  Choices,
  DayLog,
  DecisionId,
  DecisionOption,
  DecisionRecord,
  EndingId,
  EventId,
  GameState,
  MissionOutcome,
  Prerequisite,
  ResourceEffect,
  ResourceId,
  Resources,
  StepId,
  T,
} from "./types";

/** The MVP chain: 7 fictional days, 3 decisions, 3 events. */
export const STEPS: StepId[] = [
  "day1",
  "d1-energy",
  "day2",
  "evt-fault",
  "d2-water",
  "day3",
  "day4",
  "evt-storm",
  "safety",
  "d3-emergency",
  "day5",
  "day6",
  "day7",
];

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const OUTCOME_OF: Record<EndingId, MissionOutcome> = {
  A: "MISSION_ACCOMPLISHED",
  B: "SAFE_BUT_LIMITED",
  C: "MISSION_INTERRUPTED",
};

/* ---------------- Resources: validated, always inside limits ---------------- */

/** Rejects NaN/Infinity and clamps every resource to its configured limits. */
export function sanitizeResources(r: Resources): Resources {
  const out = {} as Resources;
  for (const id of Object.keys(RESOURCE_LIMITS) as ResourceId[]) {
    const v = r[id];
    if (typeof v !== "number" || !Number.isFinite(v)) throw new RangeError(`Invalid ${id} value: ${v}`);
    out[id] = clamp(v, RESOURCE_LIMITS[id].min, RESOURCE_LIMITS[id].max);
  }
  return out;
}

export function applyResourceEffects(r: Resources, effects: ResourceEffect[] = []): Resources {
  const next = { ...r };
  for (const e of effects) {
    if (!Number.isFinite(e.delta)) throw new RangeError(`Invalid effect on ${e.resource}`);
    next[e.resource] = next[e.resource] + e.delta;
  }
  return sanitizeResources(next);
}

/* ---------------- State ---------------- */

export function createInitialState(): GameState {
  return {
    day: 1,
    activeMissionId: 1,
    resources: { ...START.resources },
    facilities: { powerStation: "nominal", waterRecycling: "nominal", greenhouse: "thriving", lifeSupport: "nominal", shelter: "standby" },
    crewSafety: "safe",
    safetyChecks: { ...NO_CHECKS },
    decisionHistory: [],
    missionResults: [],
    missionStatus: "IN_PROGRESS",
    researchPoints: 0,
    performanceFactor: START.performanceFactor,
    recyclerEfficiency: START.recyclerEfficiency,
    policy: { greenhouse: "full", research: true, recyclerBoost: false, ration: false },
    today: { extraLoadKWh: 0, researchPaused: false },
    flags: { recyclerFault: false, recyclerRepairPending: false, storm: false, safetyConfirmed: false, researchEnded: false },
    shortfallDays: 0,
    log: [],
  };
}

/** NASA SVS 4930 light for a mission day (1..7), via the adapter. Days outside 1..7 use the nearest mission day. */
export function missionDayLight(day: number): DailyLight {
  const d = clamp(Math.round(day), 1, 7);
  return NASA_DATA.day(addDays(MISSION_CALENDAR.startDate, d - 1));
}

/** Solar energy for a mission day: NASA-derived sunlit fraction × game-assumed panel size and performance. */
export function solarForDay(day: number, performanceFactor: number) {
  const light = missionDayLight(day);
  return {
    ...calculateSolarEnergy(light.sunlitFraction, 24, { ratedPowerKW: SOLAR_RATED_KW, performanceFactor }),
    light,
  };
}

/* ---------------- Daily simulation ---------------- */

/** Simulates one full day with the current policy, shedding non-vital loads if power runs out. */
export function runDay(s: GameState): GameState {
  if (s.day > 7) return s;
  const sunToday = solarForDay(s.day, s.performanceFactor);
  const solar = sunToday.energyKWh;
  const battery = s.resources.energy;
  let greenhouse = s.policy.greenhouse;
  let research = s.policy.research && !s.today.researchPaused && !s.flags.researchEnded;
  let boost = s.policy.recyclerBoost;
  const shed: string[] = [];

  const breakdown = () => ({
    lifeSupport: LOADS.lifeSupport,
    recycler: LOADS.recycler + (boost ? LOADS.recyclerBoostExtra : 0),
    greenhouse: LOADS.greenhouse[greenhouse],
    research: research ? LOADS.research : 0,
    shelter: s.flags.storm ? LOADS.shelter : 0,
    extra: s.today.extraLoadKWh,
  });
  const load = () => Object.values(breakdown()).reduce((a, b) => a + b, 0);

  // Automatic load shedding: life support is never shed.
  if (battery + solar - load() < 0 && research) {
    research = false;
    shed.push("research");
  }
  if (battery + solar - load() < 0 && greenhouse !== "minimal") {
    greenhouse = "minimal";
    shed.push("greenhouse");
  }
  if (battery + solar - load() < 0 && boost) {
    boost = false;
    shed.push("recyclerBoost");
  }
  const loads = breakdown();
  const totalLoad = load();
  const net = battery + solar - totalLoad;
  const shortfall = net < 0 ? -net : 0;

  const efficiency = clamp(s.recyclerEfficiency + (boost ? WATER.boostEfficiencyGain : 0), 0, 0.95);
  const crewGross = s.policy.ration ? WATER.crewUseRationed : WATER.crewUse;
  const greenhouseWater = WATER.greenhouseNet[greenhouse];
  const waterAfter = s.resources.water - crewGross * (1 - efficiency) - greenhouseWater;
  const growth = waterAfter > 50 ? CROP_GROWTH[greenhouse] : 0;

  const resources = sanitizeResources({
    energy: net,
    water: waterAfter,
    oxygen: s.resources.oxygen + (greenhouse === "full" ? 1 : 0) - (shortfall > 0 ? 6 : 0),
    food: s.resources.food + growth,
  });

  const log: DayLog = {
    day: s.day,
    lightDate: sunToday.light.date,
    sunlitFraction: sunToday.light.sunlitFraction,
    lightSource: sunToday.light.source,
    solarKWh: solar,
    loadKWh: totalLoad,
    loads,
    shortfallKWh: shortfall,
    shed,
    recyclerEfficiency: efficiency,
    crewWaterUseL: crewGross,
    greenhouseWaterL: greenhouseWater,
    cropGrowth: growth,
    ...resources,
  };

  const repaired = s.flags.recyclerRepairPending;
  const nextDay = s.day + 1;
  const next: GameState = {
    ...s,
    day: nextDay,
    activeMissionId: missionForDay(Math.min(nextDay, 7)),
    resources,
    researchPoints: s.researchPoints + (research ? 1 : 0),
    recyclerEfficiency: repaired ? WATER.repairedEfficiency : s.recyclerEfficiency,
    facilities: {
      ...s.facilities,
      powerStation: resources.energy < BATTERY_CAP_KWH * THRESHOLDS.lowReserveFraction ? "low-reserve" : "nominal",
      waterRecycling: repaired ? "repaired" : s.facilities.waterRecycling,
      greenhouse: greenhouse === "full" ? "thriving" : greenhouse === "reduced" ? "reduced" : "dormant",
      lifeSupport: shortfall > 0 ? "strained" : "nominal",
    },
    crewSafety: shortfall > 0 ? "strained" : s.flags.safetyConfirmed ? "sheltered" : "safe",
    flags: { ...s.flags, recyclerRepairPending: false },
    today: { extraLoadKWh: 0, researchPaused: false },
    shortfallDays: s.shortfallDays + (shortfall > 0 ? 1 : 0),
    log: [...s.log, log],
  };
  return nextDay > 7 ? { ...next, missionStatus: OUTCOME_OF[computeEnding(next)] } : next;
}

export function applyEvent(s: GameState, step: EventId): GameState {
  return EVENTS[step].apply(s);
}

/* ---------------- Decisions ---------------- */

function findOption(decisionId: DecisionId, optionId: string): DecisionOption {
  const decision = DECISIONS[decisionId];
  if (!decision) throw new Error(`Unknown decision ${decisionId}`);
  const opt = decision.options.find((o) => o.id === optionId);
  if (!opt) throw new Error(`Unknown option ${decisionId}/${optionId}`);
  return opt;
}

function prerequisiteMet(s: GameState, p: Prerequisite): boolean {
  if (p.kind === "safety-checks") return allSafetyChecksDone(s);
  return s.resources[p.resource] >= p.min;
}

/** Returns why an option is locked in this state, or null when it is available. */
export function lockReason(s: GameState, decisionId: DecisionId, optionId: string): T | null {
  const opt = findOption(decisionId, optionId);
  const failed = (opt.prerequisites ?? []).find((p) => !prerequisiteMet(s, p));
  return failed ? failed.reason : null;
}
/** @deprecated alias kept for existing callers */
export const isOptionLocked = lockReason;

export function availableOptions(s: GameState, decisionId: DecisionId) {
  return DECISIONS[decisionId].options.filter((o) => !lockReason(s, decisionId, o.id));
}

/** Validates and applies one decision. Throws on unknown, locked, repeated or not-yet-available decisions. */
export function applyDecision(s: GameState, decisionId: DecisionId, optionId: string): GameState {
  const decision = DECISIONS[decisionId];
  const opt = findOption(decisionId, optionId);
  if (s.decisionHistory.some((h) => h.decisionId === decisionId)) throw new Error(`Decision ${decisionId} was already taken`);
  if (!isMissionAvailable(s, decision.mission)) throw new Error(`Mission ${decision.mission} is not available yet`);
  const lock = lockReason(s, decisionId, optionId);
  if (lock) throw new Error(`Option ${optionId} is locked in this state: ${lock.en}`);

  return {
    ...s,
    policy: { ...s.policy, ...opt.policy },
    resources: applyResourceEffects(s.resources, opt.resourceEffects),
    facilities: { ...s.facilities, ...opt.facilityEffects },
    today: {
      extraLoadKWh: s.today.extraLoadKWh + (opt.today?.extraLoadKWh ?? 0),
      researchPaused: s.today.researchPaused || !!opt.today?.researchPaused,
    },
    flags: { ...s.flags, ...opt.flags },
    decisionHistory: [...s.decisionHistory, { decisionId, optionId, day: s.day }],
    missionResults: [
      ...s.missionResults,
      { missionId: decision.mission, decisionId, optionId, day: s.day, consequences: opt.consequences },
    ],
  };
}

/** UI-safe version: never throws; on rejection the ORIGINAL state object is returned unchanged. */
export function tryApplyDecision(
  s: GameState,
  decisionId: DecisionId,
  optionId: string,
): { ok: true; state: GameState } | { ok: false; state: GameState; error: string } {
  try {
    return { ok: true, state: applyDecision(s, decisionId, optionId) };
  } catch (e) {
    return { ok: false, state: s, error: (e as Error).message };
  }
}

/* ---------------- Running the chain ---------------- */

export interface SimulationResult {
  state: GameState;
  records: DecisionRecord[];
  /** state after each completed step, counted from the start step */
  snapshots: GameState[];
}

/** Picks the option actually applied when the requested one may be locked in this state. */
export type OptionResolver = (s: GameState, decisionId: DecisionId, requested: string) => string;

/** Default: keep the requested option when allowed, otherwise the first available one (declared order). */
export const firstAvailable: OptionResolver = (s, id, requested) =>
  lockReason(s, id, requested) === null ? requested : availableOptions(s, id)[0].id;

/**
 * Continues the mission from `start` (the state BEFORE step index `from`) with the given choices,
 * up to (not including) step `until`. If a requested option is locked in this timeline, `resolve`
 * picks the replacement and the record is marked as a fallback (What If Lab).
 */
export function simulateFrom(
  start: GameState,
  from: number,
  choices: Choices,
  until: number = STEPS.length,
  resolve: OptionResolver = firstAvailable,
): SimulationResult {
  let s = start;
  const records: DecisionRecord[] = [];
  const snapshots: GameState[] = [];
  for (let i = from; i < Math.min(until, STEPS.length); i++) {
    const step = STEPS[i];
    if (step.startsWith("day")) {
      s = runDay(s);
    } else if (step === "evt-fault" || step === "evt-storm" || step === "safety") {
      s = applyEvent(s, step);
    } else {
      const id = step as DecisionId;
      const requested = choices[id];
      if (!requested) break; // waiting for the player
      const optionId = resolve(s, id, requested);
      const fallback = optionId !== requested;
      const before = s;
      s = applyDecision(s, id, optionId);
      records.push({ decisionId: id, optionId, requestedOptionId: requested, fallback, day: before.day, before, after: s });
    }
    snapshots.push(s);
  }
  return { state: s, records, snapshots };
}

/** Runs the mission from the very beginning. */
export function simulate(choices: Choices, until: number = STEPS.length): SimulationResult {
  return simulateFrom(createInitialState(), 0, choices, until);
}

/* ---------------- Outcome ---------------- */

/** Final outcome, computed only from the simulated conditions (never from the option name, never random). */
export function computeEnding(s: GameState): EndingId {
  const r = ENDING_RULES;
  if (s.flags.researchEnded || s.shortfallDays > r.interrupted.maxShortfallDays || s.resources.water < r.interrupted.minWater) {
    return "C";
  }
  const a = r.accomplished;
  if (
    s.policy.research &&
    s.researchPoints >= a.minResearch &&
    s.resources.food >= a.minFood &&
    s.resources.energy >= a.minEnergy &&
    s.resources.water >= a.minWater
  ) {
    return "A";
  }
  return "B";
}

export function allPaths(): Choices[] {
  const out: Choices[] = [];
  const [d1, d2, d3] = DECISION_ORDER.map((id) => DECISIONS[id].options.map((o) => o.id));
  for (const a of d1) for (const b of d2) for (const c of d3) out.push({ "d1-energy": a, "d2-water": b, "d3-emergency": c });
  return out;
}
