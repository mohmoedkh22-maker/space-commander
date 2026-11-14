import { describe, expect, it } from "vitest";
import raw from "@/data/nasa/lunar-illumination.json";
import { calculateSolarEnergy } from "@/lib/nasa/energyModel";
import { ILLUMINATION, loadIllumination } from "@/lib/nasa/illumination";
import { allPaths, computeEnding, createInitialState, simulate, STEPS } from "./engine";
import { judgePrediction, runWhatIf } from "./whatif";

describe("NASA data adapter", () => {
  it("loads the verified LOLA sample", () => {
    expect(ILLUMINATION.fraction).toBeCloseTo(0.8844, 4);
    expect(ILLUMINATION.provenance.id).toBe("AVGVISIB_85S_060M_201608");
    expect(ILLUMINATION.lat).toBeLessThan(-89);
  });
  it("rejects invalid or unsourced data", () => {
    const bad = structuredClone(raw);
    bad.sample.selectedSite.illuminationFraction = 1.4;
    expect(() => loadIllumination(bad)).toThrow();
    const noSource = structuredClone(raw) as Record<string, unknown>;
    delete noSource.source;
    expect(() => loadIllumination(noSource)).toThrow(/source/);
  });
});

describe("solar energy model", () => {
  it("computes kWh = kW × h × illumination × performance", () => {
    expect(calculateSolarEnergy(0.8844, 24, { ratedPowerKW: 10, performanceFactor: 0.85 }).energyKWh).toBeCloseTo(180.42, 1);
  });
  it("handles edge values", () => {
    expect(calculateSolarEnergy(0, 24).energyKWh).toBe(0);
    expect(calculateSolarEnergy(1, 12, { ratedPowerKW: 10, performanceFactor: 1 }).energyKWh).toBe(120);
  });
  it("validates inputs", () => {
    expect(() => calculateSolarEnergy(-0.1, 24)).toThrow(RangeError);
    expect(() => calculateSolarEnergy(0.5, -1)).toThrow(RangeError);
    expect(() => calculateSolarEnergy(0.5, 24, { ratedPowerKW: 0, performanceFactor: 0.8 })).toThrow(RangeError);
  });
});

describe("simulation basics", () => {
  it("stops at an unanswered decision", () => {
    const r = simulate({});
    expect(STEPS[r.snapshots.length]).toBe("d1-energy");
    expect(r.state.day).toBe(2);
  });
  it("life support is never shed and the crew stays protected on every path", () => {
    for (const c of allPaths()) {
      const s = simulate(c).state;
      expect(s.day).toBe(8);
      expect(s.resources.oxygen).toBeGreaterThanOrEqual(80);
      expect(s.flags.safetyConfirmed).toBe(true);
    }
  });
  it("initial state is sane", () => {
    const s = createInitialState();
    expect(s.resources.energy).toBeGreaterThan(0);
    expect(s.missionStatus).toBe("IN_PROGRESS");
  });
  it("missionStatus matches the computed ending", () => {
    for (const c of allPaths()) {
      const s = simulate(c).state;
      expect(s.missionStatus).toBe({ A: "MISSION_ACCOMPLISHED", B: "SAFE_BUT_LIMITED", C: "MISSION_INTERRUPTED" }[computeEnding(s)]);
    }
  });
});

describe("What If Lab (UI helpers)", () => {
  it("shows a difference when a decision changes", () => {
    const cmp = runWhatIf({ "d1-energy": "farm-full", "d2-water": "cut-farm", "d3-emergency": "essential" }, "d1-energy", "balance");
    expect(cmp.diff.energy).not.toBe(0);
    expect(cmp.alternative.records.find((r) => r.decisionId === "d1-energy")!.optionId).toBe("balance");
  });
  it("judges predictions", () => {
    expect(judgePrediction(20, "more")).toBe(true);
    expect(judgePrediction(-20, "more")).toBe(false);
    expect(judgePrediction(0.4, "same")).toBe(true);
  });
});
