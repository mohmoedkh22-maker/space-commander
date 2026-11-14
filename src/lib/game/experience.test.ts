import { describe, expect, it } from "vitest";
import { applyDecision, lockReason, runDay, simulate, STEPS } from "./engine";
import {
  activeEvents,
  chapterResult,
  CLUES_REQUIRED,
  cluesFor,
  EXPERIENCE_EVENTS,
  INSPECTION_ORDER,
  INSPECTIONS,
  MISSION_INTROS,
  optionCost,
} from "./experience";
import type { Choices } from "./types";

const at = (choices: Choices, step: string) => simulate(choices, STEPS.indexOf(step as never)).state;
const ids = (choices: Choices, step: string) => activeEvents(at(choices, step)).map((e) => e.id);

describe("V0.5 dynamic events (triggered by progression or real state)", () => {
  it("Mission 01: the solar-forecast energy warning is active before the first decision", () => {
    expect(ids({}, "d1-energy")).toContain("ENERGY_WARNING");
    expect(ids({ "d1-energy": "balance" }, "evt-fault")).not.toContain("ENERGY_WARNING");
  });
  it("Mission 02: the water warning follows the actual recycler fault", () => {
    expect(ids({ "d1-energy": "balance" }, "d2-water")).toContain("WATER_WARNING");
    expect(ids({ "d1-energy": "balance" }, "evt-fault")).not.toContain("WATER_WARNING");
    // after a repair the fault is gone
    expect(ids({ "d1-energy": "balance", "d2-water": "repair" }, "evt-storm")).not.toContain("WATER_WARNING");
  });
  it("low-reserve alert depends on the Mission 01 choice", () => {
    expect(ids({ "d1-energy": "farm-full" }, "d2-water")).toContain("LOW_RESERVE");
    expect(ids({ "d1-energy": "save-energy" }, "d2-water")).not.toContain("LOW_RESERVE");
  });
  it("Mission 03: space weather is critical and listed first", () => {
    const ev = activeEvents(at({ "d1-energy": "balance", "d2-water": "repair" }, "safety"));
    expect(ev[0].id).toBe("SPACE_WEATHER");
    expect(ev[0].severity).toBe("critical");
  });
  it("every event has all the required parts", () => {
    const s = at({}, "d1-energy");
    for (const e of EXPERIENCE_EVENTS) {
      expect(e.title.ar && e.title.en && e.interaction.en && e.consequence.ar).toBeTruthy();
      expect(e.description(s).en.length).toBeGreaterThan(0);
      expect(e.dialogue(s).length).toBeGreaterThan(0);
    }
  });
});

describe("V0.5 facility inspection", () => {
  it("covers the five facilities with conditions taken from the engine", () => {
    expect(INSPECTION_ORDER).toEqual(["energy", "water", "greenhouse", "life", "shelter"]);
    const faulty = at({ "d1-energy": "balance" }, "d2-water");
    expect(INSPECTIONS.water.condition(faulty).level).toBe("crit");
    const repaired = at({ "d1-energy": "balance", "d2-water": "repair" }, "evt-storm");
    expect(INSPECTIONS.water.condition(repaired).level).toBe("ok");
    expect(INSPECTIONS.energy.condition(at({ "d1-energy": "farm-full" }, "d2-water")).level).toBe("warn");
  });
  it("each mission has enough clues to investigate", () => {
    for (const m of [1, 2, 3] as const) expect(cluesFor(m).length).toBeGreaterThanOrEqual(CLUES_REQUIRED[m]);
  });
  it("clues read the real state", () => {
    const s = at({}, "d1-energy");
    const battery = INSPECTIONS.energy.clues.find((c) => c.id === "energy-battery")!;
    expect(battery.reveal(s).en).toContain(String(Math.round(s.resources.energy)));
  });
});

describe("V0.5 decision support and chapter results", () => {
  it("option costs come from the engine's own day simulation", () => {
    const s = at({}, "d1-energy");
    for (const o of ["farm-full", "save-energy", "balance"]) {
      const day = runDay(applyDecision(s, "d1-energy", o));
      expect(optionCost(s, "d1-energy", o)?.useKWh).toBe(day.log.at(-1)!.loadKWh);
    }
    expect(optionCost(s, "d1-energy", "farm-full")!.useKWh).toBeGreaterThan(optionCost(s, "d1-energy", "save-energy")!.useKWh);
  });
  it("locked options have no cost estimate", () => {
    expect(optionCost(at({ "d1-energy": "farm-full" }, "d2-water"), "d2-water", "boost")).toBeNull();
  });
  it("chapter results show what carries into the next mission, exactly as the engine will lock it", () => {
    const farm = chapterResult({ "d1-energy": "farm-full" }, 1);
    expect(farm.outlook).toBe("fewer-options");
    expect(farm.next.find((n) => n.optionId === "boost")!.locked).not.toBeNull();
    expect(lockReason(at({ "d1-energy": "farm-full" }, "d2-water"), "d2-water", "boost")).not.toBeNull();
    const save = chapterResult({ "d1-energy": "save-energy" }, 1);
    expect(save.outlook).toBe("more-options");
    expect(save.end.energy).toBeGreaterThan(farm.end.energy);
    expect(chapterResult({ "d1-energy": "balance", "d2-water": "repair", "d3-emergency": "essential" }, 3).outlook).toBe("final");
  });
  it("mission intros have dialogue for every chapter", () => {
    for (const m of [1, 2, 3] as const) {
      const step = m === 1 ? "d1-energy" : m === 2 ? "d2-water" : "safety";
      expect(MISSION_INTROS[m].lines(at({ "d1-energy": "balance", "d2-water": "repair" }, step)).length).toBeGreaterThanOrEqual(2);
    }
  });
});
