import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/game/engine";
import { CREW } from "@/lib/i18n";
import { FACILITIES, FACILITY_ORDER, RESOURCE_ORDER, levelOf, resourceValue } from "@/lib/mission";

describe("mission content (V0.3)", () => {
  it("has six facilities, each with bilingual text and a valid crew owner", () => {
    expect(FACILITY_ORDER).toHaveLength(6);
    for (const id of FACILITY_ORDER) {
      const f = FACILITIES[id];
      expect(f.name.ar && f.name.en && f.question.en && f.answer.ar).toBeTruthy();
      if (f.crew) expect(CREW[f.crew]).toBeDefined();
    }
  });

  it("gives every crew member a facility and a distinct colour", () => {
    const colours = new Set(Object.values(CREW).map((c) => c.color));
    expect(colours.size).toBe(4);
    for (const id of Object.keys(CREW)) {
      expect(FACILITY_ORDER.some((f) => FACILITIES[f].crew === id)).toBe(true);
    }
  });

  it("reads all four resources from the shared GameState as 0–100 %", () => {
    const s = createInitialState();
    for (const r of RESOURCE_ORDER) {
      const { pct } = resourceValue(s, r);
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    }
  });

  it("maps levels to words", () => {
    expect(levelOf(10)).toBe("crit");
    expect(levelOf(30)).toBe("warn");
    expect(levelOf(80)).toBe("ok");
  });
});
