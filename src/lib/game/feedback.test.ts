import { describe, expect, it } from "vitest";
import { allPaths, createInitialState, simulate, STEPS } from "./engine";
import { decisionFeedback, hudNotices, resourceChanges } from "./feedback";
import type { Choices, GameState } from "./types";

const at = (choices: Choices, step: string) => simulate(choices, STEPS.indexOf(step as never)).state;
const ids = (a: GameState, b: GameState) => hudNotices(a, b).map((n) => n.id);

describe("Phase 4 — resource changes", () => {
  it("reports only meaningful changes, with direction", () => {
    const a = createInitialState().resources;
    expect(resourceChanges(a, { ...a, energy: a.energy - 2 })).toEqual([]);
    expect(resourceChanges(a, { ...a, energy: a.energy - 40, food: a.food + 8 })).toEqual([
      { id: "energy", delta: -40, direction: "down" },
      { id: "food", delta: 8, direction: "up" },
    ]);
  });
});

describe("Phase 4 — mission notifications", () => {
  it("energy dropping below the reserve after an energy-hungry choice", () => {
    const before = at({ "d1-energy": "farm-full" }, "d1-energy");
    const after = at({ "d1-energy": "farm-full" }, "evt-fault");
    expect(ids(before, after)).toContain("energy-low");
    expect(hudNotices(before, after).find((n) => n.id === "energy-low")!.text.ar).toBe("انتبه! مخزون الطاقة بدأ ينخفض.");
  });
  it("water recycler fault and repair", () => {
    const c = { "d1-energy": "balance", "d2-water": "repair" };
    expect(ids(at(c, "evt-fault"), at(c, "d2-water"))).toContain("recycler-fault");
    expect(ids(at(c, "day3"), at(c, "day4"))).toContain("recycler-fixed");
  });
  it("water becoming critical is a critical warning", () => {
    const s = at({ "d1-energy": "balance" }, "d2-water");
    const low = { ...s, resources: { ...s.resources, water: 190 } };
    const n = hudNotices(s, low).find((x) => x.id === "water-crit")!;
    expect(n.level).toBe("crit");
    expect(n.text.en).toContain("very low");
  });
  it("storm and completed safety steps", () => {
    const c = { "d1-energy": "save-energy", "d2-water": "repair" };
    expect(ids(at(c, "evt-storm"), at(c, "safety"))).toContain("storm");
    expect(ids(at(c, "safety"), at(c, "d3-emergency"))).toContain("safety-done");
  });
  it("never repeats: the same state twice gives no notifications", () => {
    for (const c of allPaths().slice(0, 9)) for (const s of simulate(c).snapshots) expect(hudNotices(s, s)).toEqual([]);
  });
  it("every notification is bilingual", () => {
    for (const c of allPaths()) {
      const snaps = simulate(c).snapshots;
      for (let i = 1; i < snaps.length; i++) for (const n of hudNotices(snaps[i - 1], snaps[i])) expect(n.text.ar && n.text.en).toBeTruthy();
    }
  });
});

describe("Phase 4 — decision feedback is honest", () => {
  it("matches the day the decision shaped, on every path", () => {
    const tones = new Set<string>();
    for (const c of allPaths()) {
      const run = simulate(c);
      for (const rec of run.records) {
        const i = STEPS.indexOf(rec.decisionId);
        const afterDay = run.snapshots[i + 1]; // the decision, then the day it shapes
        const fb = decisionFeedback(rec, afterDay);
        const log = afterDay.log.at(-1)!;
        tones.add(fb.tone);
        const fellBelowReserve = rec.before.resources.energy >= 150 && afterDay.resources.energy < 150;
        if (log.shortfallKWh > 0) expect(fb.tone).toBe("strained");
        else if (log.shed.length > 0 || fellBelowReserve) expect(fb.tone).toBe("careful");
        else expect(fb.tone).toBe("success");
        expect(fb.title.ar && fb.text.en).toBeTruthy();
      }
    }
    expect(tones.has("success")).toBe(true);
    expect(tones.has("careful")).toBe(true);
  });
  it("farming at full power is not called a success when it drains the reserve", () => {
    const run = simulate({ "d1-energy": "farm-full" });
    const rec = run.records[0];
    expect(decisionFeedback(rec, run.snapshots[STEPS.indexOf("d1-energy") + 1]).tone).toBe("careful");
  });
});
