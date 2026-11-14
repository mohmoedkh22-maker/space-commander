import { describe, expect, it } from "vitest";
import { DECISIONS } from "./decisions";
import { allPaths, computeEnding, lockReason, simulate } from "./engine";
import type { Choices, DecisionId } from "./types";
import {
  CAUTION_LADDER,
  checkPrediction,
  decisionHistory,
  judgeOutcome,
  keepElseMoreCareful,
  runWhatIf,
  tryRunWhatIf,
} from "./whatif";

const FARM: Choices = { "d1-energy": "farm-full", "d2-water": "cut-farm", "d3-emergency": "full-ops" };
const SAVE: Choices = { "d1-energy": "save-energy", "d2-water": "boost", "d3-emergency": "full-ops" };

describe("V0.6 original history stays unchanged", () => {
  it("history is deep-frozen and identical before and after any experiment", () => {
    const hist = decisionHistory(SAVE);
    const snapshot = JSON.stringify(hist);
    expect(Object.isFrozen(hist)).toBe(true);
    expect(Object.isFrozen(hist[0].before.resources)).toBe(true);
    expect(() => {
      (hist[0].before.resources as { energy: number }).energy = 0;
    }).toThrow();
    for (const p of hist) for (const o of DECISIONS[p.decisionId].options) tryRunWhatIf(SAVE, p.decisionId, o.id);
    expect(JSON.stringify(decisionHistory(SAVE))).toBe(snapshot);
  });
  it("the original timeline in a comparison equals a fresh run, and the input choices are not modified", () => {
    const choices = { ...FARM };
    const frozen = Object.freeze({ ...FARM });
    const c = runWhatIf(frozen, "d1-energy", "save-energy");
    expect(c.original.final).toEqual(simulate(choices).state);
    expect(frozen).toEqual(choices);
  });
  it("earlier decisions are preserved exactly when branching later", () => {
    const c = runWhatIf(SAVE, "d3-emergency", "essential");
    expect(c.alternative.choices["d1-energy"]).toBe("save-energy");
    expect(c.alternative.choices["d2-water"]).toBe("boost");
    // identical days before the branch point
    const before = c.original.days.filter((d) => d.day < c.divergence.day);
    expect(c.alternative.days.slice(0, before.length)).toEqual(before);
    expect(c.alternative.records[0]).toBe(c.original.records[0]);
  });
});

describe("V0.6 alternative results are reproducible", () => {
  it("running the same experiment twice gives identical results", () => {
    for (const path of allPaths()) {
      for (const id of ["d1-energy", "d2-water", "d3-emergency"] as DecisionId[]) {
        for (const o of DECISIONS[id].options) {
          const a = tryRunWhatIf(path, id, o.id);
          const b = tryRunWhatIf(path, id, o.id);
          expect(JSON.stringify(a)).toBe(JSON.stringify(b));
        }
      }
    }
  });
  it("the alternative equals a fresh full run of the same effective choices", () => {
    const c = runWhatIf(FARM, "d1-energy", "balance");
    expect(c.alternative.final).toEqual(simulate(c.alternative.choices).state);
  });
});

describe("V0.6 consequences are correctly recalculated", () => {
  it("a different decision changes the resources and every difference matches the final states", () => {
    const c = runWhatIf(FARM, "d1-energy", "save-energy");
    for (const m of ["energy", "water", "oxygen", "food"] as const) {
      expect(c.diff[m]).toBeCloseTo(c.alternative.final.resources[m] - c.original.final.resources[m], 9);
    }
    expect(c.diff.energy).toBeGreaterThan(0); // saving energy leaves more in the battery
    expect(c.diff.food).toBeLessThan(0); // ...but grows fewer crops
    expect(c.alternative.ending).toBe(computeEnding(c.alternative.final));
  });
  it("the divergence is at the chosen decision", () => {
    const c = runWhatIf(SAVE, "d2-water", "repair");
    expect(c.divergence.day).toBe(DECISIONS["d2-water"].day);
    expect(c.divergence.firstDifferentDay).toBeGreaterThanOrEqual(c.divergence.day);
  });
  it("facility conditions are compared and flagged when they differ", () => {
    const c = runWhatIf(SAVE, "d2-water", "repair");
    const rec = c.facilities.find((f) => f.facility === "waterRecycling")!;
    expect(rec.original).toBe(simulate(SAVE).state.facilities.waterRecycling);
    expect(rec.alternative).toBe("repaired");
    expect(rec.changed).toBe(rec.original !== rec.alternative);
    expect(c.facilities).toHaveLength(5);
  });
  it("explains what changed, what happened afterward and why, in both languages", () => {
    const c = runWhatIf(FARM, "d1-energy", "save-energy");
    const e = c.explanation;
    expect(e.whatChanged.en).toContain("instead of");
    expect(e.afterward.length).toBeGreaterThanOrEqual(2);
    expect(e.why.length).toBeGreaterThanOrEqual(1);
    for (const x of [e.whatChanged, ...e.afterward, ...e.why]) expect(x.ar.length && x.en.length).toBeTruthy();
    expect(e.why[0].en).toContain("NASA");
  });
});

describe("V0.6 policy for later decisions that become invalid", () => {
  it("keeps a later choice when it is still allowed", () => {
    const c = runWhatIf(SAVE, "d1-energy", "balance");
    for (const l of c.later) if (l.status === "kept") expect(l.alternative).toBe(l.original);
  });
  it("moves one step down the caution ladder when a later choice is locked", () => {
    const c = runWhatIf(SAVE, "d1-energy", "farm-full"); // farm-full drains the battery -> boost locked
    const d2 = c.later.find((l) => l.decisionId === "d2-water")!;
    expect(d2.status).toBe("replaced");
    expect(d2.original).toBe("boost");
    expect(CAUTION_LADDER["d2-water"].indexOf(d2.alternative)).toBeGreaterThan(CAUTION_LADDER["d2-water"].indexOf("boost"));
    expect(d2.lockedBecause).not.toBeNull();
    expect(c.forcedChanges.map((f) => f.decisionId)).toContain("d2-water");
  });
  it("every replacement is allowed in its state and every ladder covers all options", () => {
    for (const id of Object.keys(CAUTION_LADDER) as DecisionId[]) {
      expect([...CAUTION_LADDER[id]].sort()).toEqual(DECISIONS[id].options.map((o) => o.id).sort());
    }
    for (const path of allPaths()) {
      for (const o of DECISIONS["d1-energy"].options) {
        const res = tryRunWhatIf(path, "d1-energy", o.id);
        if (!res.ok) continue;
        for (const rec of res.comparison.alternative.records) expect(lockReason(rec.before, rec.decisionId, rec.optionId)).toBeNull();
      }
    }
    const s = simulate({ "d1-energy": "farm-full" }, 4).state;
    expect(keepElseMoreCareful(s, "d2-water", "cut-farm")).toBe("cut-farm");
  });
});

describe("V0.6 missing or invalid branches are handled", () => {
  it("returns clear errors instead of crashing", () => {
    expect(tryRunWhatIf(SAVE, "d9" as DecisionId, "x")).toMatchObject({ ok: false, error: "unknown-decision" });
    expect(tryRunWhatIf(SAVE, "d1-energy", "teleport")).toMatchObject({ ok: false, error: "unknown-option" });
    expect(tryRunWhatIf({ "d1-energy": "balance" }, "d1-energy", "save-energy")).toMatchObject({ ok: false, error: "incomplete-mission" });
    expect(tryRunWhatIf(SAVE, "d1-energy", "save-energy")).toMatchObject({ ok: false, error: "same-option" });
    expect(tryRunWhatIf({ ...SAVE, "d2-water": "magic" }, "d1-energy", "balance")).toMatchObject({ ok: false, error: "unknown-option" });
    const err = tryRunWhatIf(SAVE, "d1-energy", "save-energy");
    if (!err.ok) expect(err.message.ar && err.message.en).toBeTruthy();
    expect(() => runWhatIf(SAVE, "d1-energy", "save-energy")).toThrow(/same-option/);
  });
  it("rejects an alternative that was locked at the branch point", () => {
    // after farm-full, boost (needs >= 150 kWh) is locked at the Mission 02 decision
    const res = tryRunWhatIf(FARM, "d2-water", "boost");
    expect(res).toMatchObject({ ok: false, error: "locked-at-branch" });
  });
});

describe("V0.6 predictions", () => {
  it("judges resource and outcome predictions", () => {
    const c = runWhatIf(FARM, "d1-energy", "save-energy");
    expect(checkPrediction(c, { target: "energy", direction: "more" })).toBe(true);
    expect(checkPrediction(c, { target: "food", direction: "more" })).toBe(false);
    expect(judgeOutcome("B", "A", "more")).toBe(true);
    expect(judgeOutcome("A", "A", "same")).toBe(true);
    expect(judgeOutcome("A", "C", "less")).toBe(true);
  });
});
