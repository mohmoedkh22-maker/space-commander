// V0.4 acceptance tests — each block maps to a numbered requirement in the V0.4 task.
import { describe, expect, it } from "vitest";
import { RESOURCE_LIMITS } from "./config";
import { explainDay, missionResult } from "./consequences";
import { DECISIONS } from "./decisions";
import { suhailForDecision, suhailLines } from "./dialogue";
import {
  allPaths,
  applyDecision,
  applyEvent,
  applyResourceEffects,
  createInitialState,
  lockReason,
  runDay,
  sanitizeResources,
  simulate,
  STEPS,
  tryApplyDecision,
} from "./engine";
import { isMissionAvailable, MISSIONS, missionForDay } from "./missions";
import { parseProgress, serializeProgress } from "./persistence";
import { completeSafetyCheck, SAFETY_CHECKS } from "./safety";
import type { Choices, GameState } from "./types";
import { replayFromState, runWhatIf } from "./whatif";

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}
/** state right before a given step */
const at = (choices: Choices, step: string) => simulate(choices, STEPS.indexOf(step as never)).state;
/** state after the day that follows a Mission 01 choice */
const afterM1 = (opt: string) => simulate({ "d1-energy": opt }, STEPS.indexOf("evt-fault")).state;

describe("GameState shape", () => {
  it("has the authoritative fields", () => {
    const s = createInitialState();
    expect(Object.keys(s.resources).sort()).toEqual(["energy", "food", "oxygen", "water"]);
    expect(Object.keys(s.facilities).sort()).toEqual(["greenhouse", "lifeSupport", "powerStation", "shelter", "waterRecycling"]);
    expect(s.crewSafety).toBe("safe");
    expect(s.decisionHistory).toEqual([]);
    expect(s.activeMissionId).toBe(1);
    expect(s.missionResults).toEqual([]);
    expect(s.missionStatus).toBe("IN_PROGRESS");
  });
  it("tracks the active mission and stores chapter results for later missions", () => {
    for (const m of Object.values(MISSIONS)) for (const d of m.days) expect(missionForDay(d)).toBe(m.id);
    const full = { "d1-energy": "balance", "d2-water": "repair", "d3-emergency": "essential" };
    expect(at(full, "d2-water").activeMissionId).toBe(2);
    expect(at(full, "d3-emergency").activeMissionId).toBe(3);
    const s = simulate(full).state;
    expect(s.decisionHistory.map((h) => [h.decisionId, h.day])).toEqual([
      ["d1-energy", 2],
      ["d2-water", 3],
      ["d3-emergency", 5],
    ]);
    expect(s.missionResults.map((r) => r.missionId)).toEqual([1, 2, 3]);
    expect(s.missionResults[0].consequences.length).toBeGreaterThan(0);
  });
});

describe("1–2. Mission 01 resource effects", () => {
  it("1. energy decreases more after prioritizing the greenhouse", () => {
    const start = at({}, "d1-energy").resources.energy;
    const greenhouse = afterM1("farm-full");
    expect(greenhouse.resources.energy).toBeLessThan(start);
    expect(greenhouse.resources.energy).toBeLessThan(afterM1("balance").resources.energy);
    expect(greenhouse.facilities.greenhouse).toBe("thriving");
    expect(greenhouse.facilities.powerStation).toBe("low-reserve");
  });
  it("2. conserving energy preserves the largest reserve", () => {
    const save = afterM1("save-energy").resources.energy;
    expect(save).toBeGreaterThan(afterM1("balance").resources.energy);
    expect(save).toBeGreaterThan(afterM1("farm-full").resources.energy);
    expect(afterM1("save-energy").facilities.greenhouse).toBe("dormant");
    expect(afterM1("save-energy").resources.food).toBeLessThan(afterM1("farm-full").resources.food);
  });
});

describe("3 & 12. Invalid decisions are rejected and leave state unchanged", () => {
  const base = () => deepFreeze(at({}, "d1-energy"));
  it("rejects unknown options and decisions", () => {
    expect(() => applyDecision(base(), "d1-energy", "launch-rocket")).toThrow(/Unknown option/);
    expect(() => applyDecision(base(), "d9" as never, "x")).toThrow(/Unknown decision/);
  });
  it("rejects decisions from missions that are not available yet", () => {
    expect(isMissionAvailable(base(), 2)).toBe(false);
    expect(() => applyDecision(base(), "d2-water", "repair")).toThrow(/not available/);
  });
  it("rejects repeated decisions", () => {
    const s = applyDecision(base(), "d1-energy", "balance");
    expect(() => applyDecision(s, "d1-energy", "farm-full")).toThrow(/already/);
  });
  it("12. a rejected decision returns the exact same, unchanged state", () => {
    const s = base();
    const snapshot = JSON.stringify(s);
    const r = tryApplyDecision(s, "d1-energy", "nope");
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});

describe("4. Resource limits", () => {
  it("every resource stays inside its limits on every path and every step", () => {
    for (const c of allPaths()) {
      for (const st of simulate(c).snapshots) {
        for (const [k, lim] of Object.entries(RESOURCE_LIMITS)) {
          const v = st.resources[k as keyof typeof st.resources];
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(lim.min);
          expect(v).toBeLessThanOrEqual(lim.max);
        }
      }
    }
  });
  it("clamps out-of-range values and rejects NaN / Infinity", () => {
    const r = applyResourceEffects(createInitialState().resources, [{ resource: "energy", delta: -9999 }, { resource: "water", delta: 9999 }]);
    expect(r.energy).toBe(0);
    expect(r.water).toBe(RESOURCE_LIMITS.water.max);
    expect(() => sanitizeResources({ energy: NaN, water: 1, oxygen: 1, food: 1 })).toThrow(RangeError);
    expect(() => applyResourceEffects(createInitialState().resources, [{ resource: "food", delta: Infinity }])).toThrow(RangeError);
  });
});

describe("5–6. Mission 02 depends on Mission 01", () => {
  it("5. the available Mission 02 options change with the Mission 01 choice", () => {
    const ids = (opt: string) => DECISIONS["d2-water"].options.filter((o) => !lockReason(at({ "d1-energy": opt }, "d2-water"), "d2-water", o.id)).map((o) => o.id);
    expect(ids("save-energy")).toContain("boost");
    expect(ids("farm-full")).not.toContain("boost");
  });
  it("6. insufficient energy prevents the recycling boost (prerequisite from real state)", () => {
    const s = deepFreeze(at({ "d1-energy": "farm-full" }, "d2-water"));
    expect(s.resources.energy).toBeLessThan(150);
    expect(lockReason(s, "d2-water", "boost")).not.toBeNull();
    expect(() => applyDecision(s, "d2-water", "boost")).toThrow(/locked/);
    expect(applyDecision(s, "d2-water", "repair").flags.recyclerRepairPending).toBe(true);
  });
  it("SUHAIL acknowledges the crop delay only when the greenhouse was reduced", () => {
    const ids = (opt: string) => suhailLines(at({ "d1-energy": opt }, "d2-water"), "mission-2", 5).map((l) => l.id);
    expect(ids("save-energy")).toContain("LOW_GREENHOUSE");
    expect(ids("farm-full")).not.toContain("LOW_GREENHOUSE");
    expect(ids("farm-full")).toContain("OPTIONS_LIMITED_M2");
  });
});

describe("7–8. Mission 03", () => {
  it("7. previous decisions affect Mission 03 options and guidance", () => {
    const farm = at({ "d1-energy": "farm-full", "d2-water": "cut-farm" }, "d3-emergency");
    const save = at({ "d1-energy": "save-energy", "d2-water": "cut-farm" }, "d3-emergency");
    expect(lockReason(farm, "d3-emergency", "full-ops")).not.toBeNull();
    expect(lockReason(save, "d3-emergency", "full-ops")).toBeNull();
    expect(suhailForDecision("d3-emergency", farm).en).not.toBe(suhailForDecision("d3-emergency", save).en);
  });
  it("8. crew-safety checks cannot be bypassed", () => {
    // state right after the warning, before the safety step
    const warned = deepFreeze(at({ "d1-energy": "balance", "d2-water": "repair" }, "safety"));
    for (const o of DECISIONS["d3-emergency"].options) {
      expect(lockReason(warned, "d3-emergency", o.id)).not.toBeNull();
      expect(() => applyDecision(warned, "d3-emergency", o.id)).toThrow(/locked/);
    }
    // three of four checks are still not enough
    let s: GameState = warned;
    for (const c of SAFETY_CHECKS.slice(0, 3)) s = completeSafetyCheck(s, c.id);
    expect(() => applyDecision(s, "d3-emergency", "essential")).toThrow(/locked/);
    s = completeSafetyCheck(s, SAFETY_CHECKS[3].id);
    expect(s.crewSafety).toBe("sheltered");
    expect(s.facilities.shelter).toBe("active");
    expect(applyDecision(s, "d3-emergency", "essential").decisionHistory.at(-1)?.optionId).toBe("essential");
  });
  it("safety checks are impossible before the warning", () => {
    expect(() => completeSafetyCheck(createInitialState(), "crewIndoors")).toThrow(/No safety warning/);
  });
});

describe("9–10. Outcomes", () => {
  it("9. different decision paths produce different outcomes (all three are reachable)", () => {
    const set = new Set(allPaths().map((c) => simulate(c).state.missionStatus));
    expect([...set].sort()).toEqual(["MISSION_ACCOMPLISHED", "MISSION_INTERRUPTED", "SAFE_BUT_LIMITED"]);
    // changing ONLY the Mission 01 choice changes the final outcome
    expect(simulate({ "d1-energy": "farm-full", "d2-water": "cut-farm", "d3-emergency": "full-ops" }).state.missionStatus).toBe("SAFE_BUT_LIMITED");
    expect(simulate({ "d1-energy": "save-energy", "d2-water": "cut-farm", "d3-emergency": "full-ops" }).state.missionStatus).toBe("MISSION_ACCOMPLISHED");
  });
  it("10. replaying identical decisions produces identical results", () => {
    for (const c of allPaths()) expect(JSON.stringify(simulate(c).state)).toBe(JSON.stringify(simulate(c).state));
  });
  it("the outcome is explained with real values", () => {
    const res = missionResult(simulate({ "d1-energy": "farm-full", "d2-water": "repair", "d3-emergency": "essential" }).state);
    expect(res.outcome).toBe("SAFE_BUT_LIMITED");
    expect(res.reasons.length).toBeGreaterThanOrEqual(2);
    expect(res.crewSafe).toBe(true);
  });
  it("every day is explained in both languages", () => {
    const r = simulate({ "d1-energy": "farm-full" }, 3);
    const why = explainDay(r.state.log[1], r.snapshots[1], r.state);
    expect(why.length).toBeGreaterThanOrEqual(4);
    for (const c of why) expect(c.text.ar && c.text.en).toBeTruthy();
  });
});

describe("11. What If replay", () => {
  const original = { "d1-energy": "farm-full", "d2-water": "repair", "d3-emergency": "essential" };
  it("starts from the exact saved state, recalculates later steps, and never mutates the original", () => {
    const run = simulate(original);
    const saved = deepFreeze(run.records[0].before);
    const before = JSON.stringify(run.state);
    const alt = replayFromState(saved, "d1-energy", "save-energy", original);
    // identical to a fresh full run with the alternative choice
    expect(alt.state).toEqual(simulate({ ...original, "d1-energy": "save-energy" }).state);
    expect(alt.state.resources.energy).not.toBe(run.state.resources.energy);
    expect(JSON.stringify(run.state)).toBe(before);
  });
  it("runWhatIf reports forced changes when a later option becomes unavailable", () => {
    const cmp = runWhatIf({ "d1-energy": "save-energy", "d2-water": "boost", "d3-emergency": "essential" }, "d1-energy", "farm-full");
    expect(cmp.forcedChanges.some((r) => r.decisionId === "d2-water" && r.requestedOptionId === "boost")).toBe(true);
  });
});

describe("Immutability and persistence", () => {
  it("transitions never mutate frozen input", () => {
    const s0 = deepFreeze(createInitialState());
    const s1 = deepFreeze(runDay(s0));
    const s2 = deepFreeze(applyDecision(s1, "d1-energy", "balance"));
    const s3 = deepFreeze(applyEvent(runDay(s2), "evt-fault"));
    expect(s3.facilities.waterRecycling).toBe("faulty");
    expect(s0.day).toBe(1);
    expect(s1.decisionHistory).toEqual([]);
  });
  it("session progress round-trips and rejects bad data", () => {
    const choices = { "d1-energy": "balance", "d2-water": "repair" };
    const p = parseProgress(serializeProgress(choices, 6));
    expect(p?.choices).toEqual(choices);
    expect(simulate(p!.choices, p!.stepIndex).state).toEqual(simulate(choices, 6).state);
    expect(parseProgress("{oops")).toBeNull();
    expect(parseProgress(serializeProgress({ "d1-energy": "hack" }, 3))).toBeNull();
    expect(parseProgress(serializeProgress({}, 5))).toBeNull();
  });
});
