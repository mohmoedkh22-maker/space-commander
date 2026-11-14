import { describe, expect, it } from "vitest";
import raw from "@/data/nasa/lunar-illumination.json";
import { calculateSolarEnergy } from "@/lib/nasa/energyModel";
import { ILLUMINATION, loadIllumination } from "@/lib/nasa/illumination";
import { allPaths, computeEnding, createInitialState, isOptionLocked, simulate, STEPS } from "./engine";
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

describe("simulation engine", () => {
  it("is deterministic", () => {
    const c = { "d1-energy": "balance", "d2-water": "repair", "d3-emergency": "essential" };
    expect(simulate(c).state).toEqual(simulate(c).state);
  });

  it("stops at an unanswered decision", () => {
    const r = simulate({});
    expect(STEPS[r.snapshots.length]).toBe("d1-energy");
    expect(r.state.day).toBe(2);
  });

  it("decisions change resources", () => {
    const full = simulate({ "d1-energy": "farm-full" }, 3).state;
    const bal = simulate({ "d1-energy": "balance" }, 3).state;
    expect(full.batteryKWh).toBeLessThan(bal.batteryKWh);
    expect(full.cropPct).toBeGreaterThan(bal.cropPct);
  });

  it("butterfly effect: Day 2 energy choice locks the Day 3 recycler boost", () => {
    const afterFull = simulate({ "d1-energy": "farm-full" }, STEPS.indexOf("d2-water")).state;
    const afterBal = simulate({ "d1-energy": "balance" }, STEPS.indexOf("d2-water")).state;
    expect(isOptionLocked(afterFull, "d2-water", "boost")).not.toBeNull();
    expect(isOptionLocked(afterBal, "d2-water", "boost")).toBeNull();
  });

  it("life support is never shed and the crew is always protected", () => {
    for (const c of allPaths()) {
      const s = simulate(c).state;
      expect(s.day).toBe(8);
      expect(s.oxygenPct).toBeGreaterThanOrEqual(80);
      expect(s.flags.safetyConfirmed).toBe(true);
    }
  });

  it("all three endings are reachable", () => {
    const endings = new Set(allPaths().map((c) => computeEnding(simulate(c).state)));
    expect([...endings].sort()).toEqual(["A", "B", "C"]);
  });

  it("initial state is sane", () => {
    const s = createInitialState();
    expect(s.batteryKWh).toBeGreaterThan(0);
    expect(s.day).toBe(1);
  });
});

describe("What If Lab", () => {
  const original = { "d1-energy": "farm-full", "d2-water": "cut-farm", "d3-emergency": "essential" };

  it("does not mutate the original timeline", () => {
    const before = JSON.stringify(simulate(original).state);
    runWhatIf(original, "d1-energy", "balance");
    expect(JSON.stringify(simulate(original).state)).toBe(before);
  });

  it("shows a difference when a decision changes", () => {
    const cmp = runWhatIf(original, "d1-energy", "balance");
    expect(cmp.diff.batteryKWh).not.toBe(0);
    expect(cmp.alternative.records[0].optionId).toBe("balance");
  });

  it("judges predictions", () => {
    expect(judgePrediction(20, "more")).toBe(true);
    expect(judgePrediction(-20, "more")).toBe(false);
    expect(judgePrediction(0.4, "same")).toBe(true);
  });
});
