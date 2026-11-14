import { describe, expect, it } from "vitest";
import { BATTERY_CAP_KWH, LOADS, WATER_CAP_L } from "./config";
import { explainDay, guidanceFor, missionResult } from "./consequences";
import { DECISIONS } from "./decisions";
import { allPaths, applyDecision, applyEvent, computeEnding, createInitialState, runDay, simulate, STEPS } from "./engine";
import { EVENTS, MISSIONS, missionForDay } from "./missions";
import { parseProgress, serializeProgress } from "./persistence";
import type { Choices, GameState } from "./types";

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}
const at = (choices: Choices, step: string) => simulate(choices, STEPS.indexOf(step as never)).state;

describe("V0.4 — GameState shape", () => {
  it("contains day, resources, facilities, crew safety, history, mission and outcome", () => {
    const s = createInitialState();
    expect(s.day).toBe(1);
    expect(s.mission).toBe(1);
    expect(s.facilities).toEqual({ energy: "nominal", water: "nominal", greenhouse: "thriving", life: "nominal", shelter: "standby" });
    expect(s.crewSafety).toBe("safe");
    expect(s.history).toEqual([]);
    expect(s.outcome).toBeNull();
  });

  it("tracks the active mission by day, as defined in MISSIONS", () => {
    for (const m of Object.values(MISSIONS)) for (const d of m.days) expect(missionForDay(d)).toBe(m.id);
    const full = { "d1-energy": "balance", "d2-water": "repair", "d3-emergency": "essential" };
    expect(at(full, "d2-water").mission).toBe(2);
    expect(at(full, "d3-emergency").mission).toBe(3);
  });

  it("records decision history and sets the outcome after Day 7", () => {
    const s = simulate({ "d1-energy": "balance", "d2-water": "repair", "d3-emergency": "essential" }).state;
    expect(s.history.map((h) => h.decisionId)).toEqual(["d1-energy", "d2-water", "d3-emergency"]);
    expect(s.history.map((h) => h.day)).toEqual([2, 3, 5]);
    expect(s.outcome).toBe(computeEnding(s));
  });
});

describe("V0.4 — pure, immutable transitions", () => {
  it("never mutates its input (frozen state)", () => {
    const s0 = deepFreeze(createInitialState());
    const s1 = deepFreeze(runDay(s0));
    const s2 = deepFreeze(applyDecision(s1, "d1-energy", "inspect"));
    const s3 = deepFreeze(applyEvent(runDay(s2), "evt-fault"));
    expect(s3.facilities.water).toBe("faulty");
    expect(s0.day).toBe(1);
    expect(s1.history).toEqual([]);
  });

  it("is deterministic: the same choices always give the same results", () => {
    for (const c of allPaths().slice(0, 12)) expect(JSON.stringify(simulate(c).state)).toBe(JSON.stringify(simulate(c).state));
  });
});

describe("V0.4 — resource calculations and limits", () => {
  it("Day 1: solar ≈ 180.4 kWh and loads add up exactly", () => {
    const s = runDay(createInitialState());
    const log = s.log[0];
    expect(log.solarKWh).toBeCloseTo(180.42, 1);
    const sum = Object.values(log.loads).reduce((a, b) => a + b, 0);
    expect(sum).toBe(log.loadKWh);
    expect(log.loads.lifeSupport).toBe(LOADS.lifeSupport);
  });

  it("keeps every resource inside its limits on every path", () => {
    for (const c of allPaths()) {
      for (const st of simulate(c).snapshots) {
        expect(st.batteryKWh).toBeGreaterThanOrEqual(0);
        expect(st.batteryKWh).toBeLessThanOrEqual(BATTERY_CAP_KWH);
        expect(st.waterL).toBeGreaterThanOrEqual(0);
        expect(st.waterL).toBeLessThanOrEqual(WATER_CAP_L);
        expect(st.cropPct).toBeLessThanOrEqual(100);
        expect(st.oxygenPct).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("V0.4 — valid and invalid decisions", () => {
  const atD1 = () => at({}, "d1-energy");
  it("rejects unknown options", () => {
    expect(() => applyDecision(atD1(), "d1-energy", "launch-rocket")).toThrow(/Unknown option/);
  });
  it("rejects locked options", () => {
    const s = at({ "d1-energy": "farm-full" }, "d2-water");
    expect(() => applyDecision(s, "d2-water", "boost")).toThrow(/locked/);
  });
  it("rejects taking the same decision twice", () => {
    const s = applyDecision(atD1(), "d1-energy", "balance");
    expect(() => applyDecision(s, "d1-energy", "inspect")).toThrow(/already/);
  });
  it("every option leads to a different real state from the other options", () => {
    for (const id of ["d1-energy", "d2-water", "d3-emergency"] as const) {
      const step = STEPS.indexOf(id);
      const base = simulate({ "d1-energy": "balance", "d2-water": "repair" }, step).state;
      const outcomes = DECISIONS[id].options
        .filter((o) => !o.locked?.(base))
        .map((o) => {
          const { history: _h, ...rest } = runDay(applyDecision(base, id, o.id));
          void _h;
          return JSON.stringify(rest);
        });
      expect(new Set(outcomes).size).toBe(outcomes.length);
    }
  });
});

describe("V0.4 — one early decision ripples through all three chapters", () => {
  const farm = { "d1-energy": "farm-full", "d2-water": "cut-farm", "d3-emergency": "full-ops" };
  const balance = { "d1-energy": "balance", "d2-water": "cut-farm", "d3-emergency": "full-ops" };

  it("changes future resources", () => {
    expect(at(farm, "evt-fault").batteryKWh).toBeLessThan(at(balance, "evt-fault").batteryKWh);
  });
  it("influences a facility condition (inspection services the power station for the rest of the mission)", () => {
    const s = simulate({ "d1-energy": "inspect", "d2-water": "repair", "d3-emergency": "essential" }).state;
    expect(s.facilities.energy).toBe("serviced");
    expect(simulate(balance).state.facilities.energy).toBe("nominal");
    expect(simulate({ "d1-energy": "balance", "d2-water": "repair", "d3-emergency": "essential" }).state.facilities.water).toBe("repaired");
  });
  it("changes later available options (Mission 2 and Mission 3)", () => {
    expect(DECISIONS["d2-water"].options.find((o) => o.id === "boost")!.locked!(at(farm, "d2-water"))).not.toBeNull();
    expect(DECISIONS["d2-water"].options.find((o) => o.id === "boost")!.locked!(at(balance, "d2-water"))).toBeNull();
    expect(DECISIONS["d3-emergency"].options.find((o) => o.id === "full-ops")!.locked!(at(farm, "d3-emergency"))).not.toBeNull();
    expect(DECISIONS["d3-emergency"].options.find((o) => o.id === "full-ops")!.locked!(at(balance, "d3-emergency"))).toBeNull();
  });
  it("changes SUHAIL's guidance", () => {
    expect(guidanceFor("evt-fault", at(farm, "evt-fault")).en).not.toBe(guidanceFor("evt-fault", at(balance, "evt-fault")).en);
    expect(guidanceFor("d3-emergency", at(farm, "d3-emergency")).en).not.toBe(guidanceFor("d3-emergency", at(balance, "d3-emergency")).en);
  });
  it("affects the final outcome", () => {
    expect(simulate(farm).state.outcome).toBe("B");
    expect(simulate(balance).state.outcome).toBe("A");
  });
});

describe("V0.4 — outcomes and explanations", () => {
  it("all three outcome states are reachable", () => {
    const set = new Set(allPaths().map((c) => simulate(c).state.outcome));
    expect([...set].sort()).toEqual(["A", "B", "C"]);
  });
  it("explains each day in both languages", () => {
    const s = simulate({ "d1-energy": "farm-full" }, 3);
    const before = s.snapshots[1];
    const after = s.state;
    const why = explainDay(after.log[1], before, after);
    expect(why.length).toBeGreaterThanOrEqual(4);
    for (const c of why) expect(c.text.ar.length && c.text.en.length).toBeTruthy();
    expect(why.some((c) => c.kind === "energy" && c.text.en.includes("88%"))).toBe(true);
  });
  it("explains why each ending happened", () => {
    for (const c of [
      { "d1-energy": "balance", "d2-water": "cut-farm", "d3-emergency": "full-ops" },
      { "d1-energy": "farm-full", "d2-water": "repair", "d3-emergency": "essential" },
      { "d1-energy": "balance", "d2-water": "repair", "d3-emergency": "conserve" },
    ]) {
      const res = missionResult(simulate(c).state);
      expect(res.crewSafe).toBe(true);
      expect(res.reasons.length).toBeGreaterThanOrEqual(2);
    }
  });
  it("story events are data-driven", () => {
    const s = EVENTS["evt-storm"].apply(createInitialState() as GameState);
    expect(s.facilities.shelter).toBe("active");
    expect(s.crewSafety).toBe("sheltered");
  });
});

describe("V0.4 — session progress persistence", () => {
  it("round-trips valid progress", () => {
    const choices = { "d1-energy": "balance", "d2-water": "repair" };
    const p = parseProgress(serializeProgress(choices, 6));
    expect(p?.choices).toEqual(choices);
    expect(p?.stepIndex).toBe(6);
    expect(simulate(p!.choices, p!.stepIndex).state).toEqual(simulate(choices, 6).state);
  });
  it("rejects bad or inconsistent data", () => {
    expect(parseProgress(null)).toBeNull();
    expect(parseProgress("{oops")).toBeNull();
    expect(parseProgress(JSON.stringify({ v: 2, choices: {}, stepIndex: 0, savedAt: "x" }))).toBeNull();
    expect(parseProgress(serializeProgress({ "d1-energy": "hack" }, 3))).toBeNull();
    expect(parseProgress(serializeProgress({}, 5))).toBeNull(); // step 5 needs the Day-2 decision
    expect(parseProgress(serializeProgress({}, 99))).toBeNull();
  });
});
