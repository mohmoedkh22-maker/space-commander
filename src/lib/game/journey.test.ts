import { describe, expect, it } from "vitest";
import { suhailLines } from "./dialogue";
import { allPaths, computeEnding, simulate, STEPS } from "./engine";
import { CHAPTERS, JOURNEY, baseCondition, chapterForDay, conceptsExplored, crewReports } from "./journey";
import { missionDayLight } from "./engine";
import { tryRunWhatIf } from "./whatif";
import type { Choices } from "./types";

const at = (choices: Choices, step: string) => simulate(choices, STEPS.indexOf(step as never)).state;
const GOOD: Choices = { "d1-energy": "save-energy", "d2-water": "repair", "d3-emergency": "full-ops" };

describe("V0.7 journey structure", () => {
  it("covers every required scene in order", () => {
    expect(JOURNEY.map((s) => s.id)).toEqual([
      "start-menu",
      "mission-briefing",
      "lunar-base",
      "mission-control",
      "mission-challenge",
      "decision-consequences",
      "mission-transition",
      "emergency-sequence",
      "mission-outcome",
      "what-if-lab",
      "commander-report",
      "about-the-science",
    ]);
    for (const s of JOURNEY) expect(s.title.ar && s.title.en).toBeTruthy();
  });
  it("three chapters cover the seven days, one decision each", () => {
    expect(CHAPTERS.flatMap((c) => c.days)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(CHAPTERS.map((c) => c.decision)).toEqual(["d1-energy", "d2-water", "d3-emergency"]);
    expect(chapterForDay(2).id).toBe(1);
    expect(chapterForDay(4).id).toBe(2);
    expect(chapterForDay(7).id).toBe(3);
  });
});

describe("V0.7 lunar base visual states follow the real state", () => {
  it("normal at the start, warning on the vanishing-sun day, critical in the emergency, complete at the end", () => {
    expect(baseCondition(simulate({}, 0).state)).toBe("normal");
    expect(baseCondition(at({}, "d1-energy"))).toBe("warning"); // NASA light dips on mission day 2
    expect(baseCondition(at(GOOD, "safety"))).toBe("critical"); // storm before the safety steps
    expect(baseCondition(at(GOOD, "d3-emergency"))).toBe("warning"); // crew protected, storm still going
    expect(baseCondition(simulate(GOOD).state)).toBe("complete");
  });
  it("shows recovery after the recycler is repaired", () => {
    const s = at({ "d1-energy": "save-energy", "d2-water": "repair" }, "evt-storm");
    expect(s.facilities.waterRecycling).toBe("repaired");
    expect(["recovery", "warning"]).toContain(baseCondition(s));
    expect(crewReports(s).find((c) => c.who === "layan")!.level).toBe("recovery");
  });
  it("every state on every path maps to one of the five visual states", () => {
    for (const c of allPaths()) {
      for (const s of simulate(c).snapshots) expect(["normal", "warning", "critical", "recovery", "complete"]).toContain(baseCondition(s));
    }
  });
});

describe("V0.7 crew reports and SUHAIL dialogue", () => {
  it("all four crew members report, in both languages", () => {
    const r = crewReports(at(GOOD, "d2-water"));
    expect(r.map((x) => x.who)).toEqual(["adam", "layan", "mira", "rashed"]);
    for (const x of r) expect(x.text.ar.length && x.text.en.length && x.role.en.length).toBeTruthy();
  });
  it("reports react to decisions", () => {
    const farm = at({ "d1-energy": "farm-full" }, "d2-water");
    const save = at({ "d1-energy": "save-energy" }, "d2-water");
    expect(crewReports(farm).find((c) => c.who === "adam")!.level).toBe("warn");
    expect(crewReports(save).find((c) => c.who === "mira")!.level).toBe("warn"); // greenhouse turned down
    expect(crewReports(farm).find((c) => c.who === "mira")!.level).toBe("ok");
    expect(crewReports(at(GOOD, "safety")).find((c) => c.who === "rashed")!.level).toBe("crit");
    expect(crewReports(at(GOOD, "d3-emergency")).find((c) => c.who === "rashed")!.level).toBe("recovery");
  });
  it("Adam quotes the real NASA light of the last simulated day", () => {
    const s = at({}, "d1-energy");
    const pct = Math.round(missionDayLight(1).sunlitFraction * 100);
    expect(crewReports(s)[0].text.en).toContain(`${pct}%`);
    expect(crewReports(s)[0].text.en).toContain("NASA");
  });
  it("SUHAIL's chapter-end lines depend on the state", () => {
    expect(suhailLines(simulate(GOOD).state, "chapter-end", 1)[0].id).toBe("CREW_SHELTERED");
    const repaired = at({ "d1-energy": "save-energy", "d2-water": "repair" }, "evt-storm");
    expect(suhailLines(repaired, "chapter-end", 3).map((l) => l.id)).toContain("RECOVERY_WATER");
    const farm = at({ "d1-energy": "farm-full", "d2-water": "cut-farm" }, "evt-storm");
    expect(suhailLines(farm, "chapter-end", 3).map((l) => l.id)).not.toContain("RECOVERY_WATER");
  });
});

describe("V0.7 complete journeys and outcomes", () => {
  it("every one of the 27 paths finishes all 7 days, ends in one of the three outcomes, and opens the What If Lab", () => {
    const outcomes = new Set<string>();
    for (const c of allPaths()) {
      const s = simulate(c).state;
      expect(s.day).toBe(8);
      expect(s.log).toHaveLength(7);
      expect(s.decisionHistory).toHaveLength(3);
      expect(s.missionStatus).not.toBe("IN_PROGRESS");
      outcomes.add(s.missionStatus);
      // the lab accepts at least one alternative for this finished mission
      const ok = (["d1-energy", "d2-water", "d3-emergency"] as const).some((id) =>
        ["farm-full", "save-energy", "balance", "boost", "cut-farm", "repair", "full-ops", "essential", "conserve"].some((o) => tryRunWhatIf(c, id, o).ok),
      );
      expect(ok).toBe(true);
    }
    expect([...outcomes].sort()).toEqual(["MISSION_ACCOMPLISHED", "MISSION_INTERRUPTED", "SAFE_BUT_LIMITED"]);
  });
  it("representative journeys reach the expected outcome", () => {
    expect(computeEnding(simulate(GOOD).state)).toBe("A");
    expect(computeEnding(simulate({ "d1-energy": "farm-full", "d2-water": "cut-farm", "d3-emergency": "essential" }).state)).toBe("B");
    expect(computeEnding(simulate({ "d1-energy": "balance", "d2-water": "repair", "d3-emergency": "conserve" }).state)).toBe("C");
  });
  it("the Commander Report lists a science concept for each decision", () => {
    const c = conceptsExplored(["d1-energy", "d2-water", "d3-emergency"]);
    expect(c).toHaveLength(3);
    for (const x of c) expect(x.title.en.length && x.science.ar.length).toBeTruthy();
  });
});
