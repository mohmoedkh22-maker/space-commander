// Pure, deterministic simulation. No React, no randomness, no I/O.
// Every state transition returns a NEW object; inputs are never mutated.
import { calculateSolarEnergy } from "@/lib/nasa/energyModel";
import { ILLUMINATION } from "@/lib/nasa/illumination";
import {
  BATTERY_CAP_KWH,
  CROP_GROWTH,
  ENDING_RULES,
  LOADS,
  SCENARIO_LIGHT_FACTOR,
  SOLAR_RATED_KW,
  START,
  WATER,
  WATER_CAP_L,
} from "./config";
import { DECISIONS, DECISION_ORDER } from "./decisions";
import { EVENTS, missionForDay } from "./missions";
import type {
  Choices,
  DayLog,
  DecisionId,
  DecisionRecord,
  EndingId,
  EventId,
  GameState,
  StepId,
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

export function createInitialState(): GameState {
  return {
    day: 1,
    mission: 1,
    facilities: { energy: "nominal", water: "nominal", greenhouse: "thriving", life: "nominal", shelter: "standby" },
    crewSafety: "safe",
    history: [],
    outcome: null,
    batteryKWh: START.batteryKWh,
    waterL: START.waterL,
    oxygenPct: START.oxygenPct,
    cropPct: START.cropPct,
    researchPoints: 0,
    performanceFactor: START.performanceFactor,
    recyclerEfficiency: START.recyclerEfficiency,
    policy: { greenhouse: "full", research: true, recyclerBoost: false, ration: false },
    today: { extraLoadKWh: 0, researchPaused: false },
    flags: {
      panelsInspected: false,
      recyclerFault: false,
      recyclerRepairPending: false,
      storm: false,
      safetyConfirmed: false,
      researchEnded: false,
    },
    shortfallDays: 0,
    log: [],
  };
}

export function solarForDay(day: number, performanceFactor: number) {
  const factor = SCENARIO_LIGHT_FACTOR[day] ?? 1;
  return calculateSolarEnergy(ILLUMINATION.fraction * factor, 24, {
    ratedPowerKW: SOLAR_RATED_KW,
    performanceFactor,
  });
}

/** Simulates one full day with the current policy, shedding non-vital loads if power runs out. */
export function runDay(s: GameState): GameState {
  if (s.day > 7) return s;
  const lightFactor = SCENARIO_LIGHT_FACTOR[s.day] ?? 1;
  const solar = solarForDay(s.day, s.performanceFactor).energyKWh;
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
  if (s.batteryKWh + solar - load() < 0 && research) {
    research = false;
    shed.push("research");
  }
  if (s.batteryKWh + solar - load() < 0 && greenhouse !== "minimal") {
    greenhouse = "minimal";
    shed.push("greenhouse");
  }
  if (s.batteryKWh + solar - load() < 0 && boost) {
    boost = false;
    shed.push("recyclerBoost");
  }
  const loads = breakdown();
  const totalLoad = load();
  const net = s.batteryKWh + solar - totalLoad;
  const shortfall = net < 0 ? -net : 0;
  const batteryKWh = clamp(net, 0, BATTERY_CAP_KWH);

  // Water
  const efficiency = clamp(s.recyclerEfficiency + (boost ? WATER.boostEfficiencyGain : 0), 0, 0.95);
  const crewGross = s.policy.ration ? WATER.crewUseRationed : WATER.crewUse;
  const greenhouseWater = WATER.greenhouseNet[greenhouse];
  const waterL = clamp(s.waterL - crewGross * (1 - efficiency) - greenhouseWater, 0, WATER_CAP_L);

  // Crops need water to grow
  const growth = waterL > 50 ? CROP_GROWTH[greenhouse] : 0;
  const cropPct = clamp(s.cropPct + growth, 0, 100);

  // Oxygen stays stable unless life support was underpowered
  const oxygenPct = clamp(s.oxygenPct + (greenhouse === "full" ? 1 : 0) - (shortfall > 0 ? 6 : 0), 0, 100);

  const log: DayLog = {
    day: s.day,
    lightFactor,
    solarKWh: solar,
    loadKWh: totalLoad,
    loads,
    shortfallKWh: shortfall,
    shed,
    recyclerEfficiency: efficiency,
    crewWaterUseL: crewGross,
    greenhouseWaterL: greenhouseWater,
    cropGrowth: growth,
    batteryKWh,
    waterL,
    oxygenPct,
    cropPct,
  };

  const repaired = s.flags.recyclerRepairPending;
  const nextDay = s.day + 1;
  const next: GameState = {
    ...s,
    day: nextDay,
    mission: missionForDay(Math.min(nextDay, 7)),
    batteryKWh,
    waterL,
    oxygenPct,
    cropPct,
    researchPoints: s.researchPoints + (research ? 1 : 0),
    recyclerEfficiency: repaired ? WATER.repairedEfficiency : s.recyclerEfficiency,
    facilities: {
      ...s.facilities,
      water: repaired ? "repaired" : s.facilities.water,
      greenhouse: greenhouse === "full" ? "thriving" : greenhouse === "reduced" ? "reduced" : "dormant",
      life: shortfall > 0 ? "strained" : "nominal",
    },
    crewSafety: shortfall > 0 ? "strained" : s.flags.storm ? "sheltered" : "safe",
    flags: { ...s.flags, recyclerRepairPending: false },
    today: { extraLoadKWh: 0, researchPaused: false },
    shortfallDays: s.shortfallDays + (shortfall > 0 ? 1 : 0),
    log: [...s.log, log],
  };
  return nextDay > 7 ? { ...next, outcome: computeEnding(next) } : next;
}

export function applyEvent(s: GameState, step: EventId): GameState {
  return EVENTS[step].apply(s);
}

export function isOptionLocked(s: GameState, decisionId: DecisionId, optionId: string) {
  const opt = DECISIONS[decisionId].options.find((o) => o.id === optionId);
  if (!opt) throw new Error(`Unknown option ${decisionId}/${optionId}`);
  return opt.locked?.(s) ?? null;
}

export function availableOptions(s: GameState, decisionId: DecisionId) {
  return DECISIONS[decisionId].options.filter((o) => !o.locked?.(s));
}

/** Validates and applies one decision. Throws on unknown or locked options. */
export function applyDecision(s: GameState, decisionId: DecisionId, optionId: string): GameState {
  const decision = DECISIONS[decisionId];
  if (!decision) throw new Error(`Unknown decision ${decisionId}`);
  const opt = decision.options.find((o) => o.id === optionId);
  if (!opt) throw new Error(`Unknown option ${decisionId}/${optionId}`);
  if (opt.locked?.(s)) throw new Error(`Option ${optionId} is locked in this state`);
  if (s.history.some((h) => h.decisionId === decisionId)) throw new Error(`Decision ${decisionId} was already taken`);
  const after = opt.apply(s);
  return { ...after, history: [...s.history, { decisionId, optionId, day: s.day }] };
}

export interface SimulationResult {
  state: GameState;
  records: DecisionRecord[];
  /** state after each completed step (index matches STEPS) */
  snapshots: GameState[];
}

/**
 * Re-runs the mission from the start with the given choices up to (not including) step `until`.
 * If a requested option is locked in this timeline, the first available option is used and the
 * record is marked as a fallback (used by the What If Lab).
 */
export function simulate(choices: Choices, until: number = STEPS.length): SimulationResult {
  let s = createInitialState();
  const records: DecisionRecord[] = [];
  const snapshots: GameState[] = [];
  for (let i = 0; i < Math.min(until, STEPS.length); i++) {
    const step = STEPS[i];
    if (step.startsWith("day")) {
      s = runDay(s);
    } else if (step === "evt-fault" || step === "evt-storm" || step === "safety") {
      s = applyEvent(s, step);
    } else {
      const id = step as DecisionId;
      const requested = choices[id];
      if (!requested) break; // waiting for the player
      const fallback = isOptionLocked(s, id, requested) !== null;
      const optionId = fallback ? availableOptions(s, id)[0].id : requested;
      const before = s;
      s = applyDecision(s, id, optionId);
      records.push({ decisionId: id, optionId, requestedOptionId: requested, fallback, day: before.day, before, after: s });
    }
    snapshots.push(s);
  }
  return { state: s, records, snapshots };
}

export function computeEnding(s: GameState): EndingId {
  const r = ENDING_RULES;
  if (s.flags.researchEnded || s.shortfallDays > r.interrupted.maxShortfallDays || s.waterL < r.interrupted.minWater) {
    return "C";
  }
  const a = r.accomplished;
  if (s.policy.research && s.researchPoints >= a.minResearch && s.cropPct >= a.minCrop && s.batteryKWh >= a.minBattery && s.waterL >= a.minWater) {
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
