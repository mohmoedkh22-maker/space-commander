// WP06.5 — pure logic of SUHAIL's science lessons in the game.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ScenarioSet } from "../nasa/scenarios/types";
import { DECISIONS } from "./decisions";
import { allPaths, simulate } from "./engine";
import { PROGRESS_KEY } from "./persistence";
import {
  CLASSIFICATION_LABEL,
  LESSONS_KEY,
  bidiT,
  chooseOption,
  emptyLessonProgress,
  isLessonDone,
  isolateLtr,
  lessonScenarios,
  lessonsDone,
  nextLessonId,
  parseLessonProgress,
  serializeLessonProgress,
  whatIfConnection,
} from "./scienceLessons";
import { deepFreeze } from "./whatif";

const set: ScenarioSet = JSON.parse(readFileSync(path.join(process.cwd(), "public/data/scenarios/scenarios.json"), "utf8"));
const [L1, L2, L3] = set.lessons;

describe("WP06.5 — lesson progress (separate from the mission save)", () => {
  it("uses its own storage key, never the mission save key", () => {
    expect(LESSONS_KEY).not.toBe(PROGRESS_KEY);
  });
  it("records a choice immutably, and ignores unknown choices", () => {
    const p0 = deepFreeze(emptyLessonProgress());
    const p1 = chooseOption(p0, L1, L1.choices[0].id);
    expect(p1.chosen).toEqual({ [L1.id]: L1.choices[0].id });
    expect(p0.chosen).toEqual({});
    expect(chooseOption(p1, L1, "not-a-choice")).toBe(p1);
  });
  it("round-trips, and drops unknown lessons, unknown choices and malformed data", () => {
    const p = chooseOption(chooseOption(emptyLessonProgress(), L1, L1.choices[1].id), L2, L2.choices[0].id);
    expect(parseLessonProgress(serializeLessonProgress(p), set.lessons)).toEqual(p);
    const dirty = JSON.stringify({ v: 1, chosen: { [L1.id]: "nope", "lesson-x": "a", [L3.id]: L3.choices[2].id } });
    expect(parseLessonProgress(dirty, set.lessons).chosen).toEqual({ [L3.id]: L3.choices[2].id });
    for (const bad of [null, "", "{", "[]", '{"v":2,"chosen":{}}', '{"v":1}', '{"v":1,"chosen":7}'])
      expect(parseLessonProgress(bad, set.lessons)).toEqual(emptyLessonProgress());
  });
  it("guides the child through the lessons in order", () => {
    let p = emptyLessonProgress();
    expect(nextLessonId(p, set.lessons)).toBe(L1.id);
    p = chooseOption(p, L1, L1.choices[0].id);
    expect(isLessonDone(p, L1.id)).toBe(true);
    expect(nextLessonId(p, set.lessons)).toBe(L2.id);
    p = chooseOption(chooseOption(p, L2, L2.choices[0].id), L3, L3.choices[0].id);
    expect(lessonsDone(p, set.lessons)).toBe(3);
    expect(nextLessonId(p, set.lessons)).toBeNull();
  });
});

describe("WP06.5 — historical vs simulated labels", () => {
  it("every classification has a distinct bilingual label; simulated is clearly a game scenario", () => {
    const labels = Object.values(CLASSIFICATION_LABEL);
    expect(new Set(labels.map((l) => l.label.en)).size).toBe(4);
    for (const l of labels) expect(l.label.ar).toMatch(/[؀-ۿ]/);
    expect(CLASSIFICATION_LABEL["historical-observation"].label.en).toBe("Historical NASA record");
    expect(CLASSIFICATION_LABEL["historical-model-output"].label.en).toMatch(/forecast model/);
    expect(CLASSIFICATION_LABEL.simulated.label.en).toMatch(/Simulated.*game/);
  });
});

describe("WP06.5 — lesson sources", () => {
  it("each lesson resolves to the scenarios it is based on, in order; unknown ids are skipped, not invented", () => {
    for (const l of set.lessons) {
      const sc = lessonScenarios(set, l);
      expect(sc.map((s) => s.id)).toEqual(l.basedOnScenarioIds);
    }
    expect(lessonScenarios(set, { basedOnScenarioIds: ["nope", L1.basedOnScenarioIds[0]] }).map((s) => s.id)).toEqual([L1.basedOnScenarioIds[0]]);
  });
});

describe("WP06.5 — What If connection (qualitative; engine and history untouched)", () => {
  const sc = lessonScenarios(set, L1)[0];
  const finished = allPaths()[0];
  it("before the mission is finished: no lab, no claim about the child's choice", () => {
    const c = whatIfConnection(sc, {}, false)!;
    expect(c.decisionId).toBe("d3-emergency");
    expect(c.labAvailable).toBe(false);
    expect(c.chosenOption).toBeNull();
    expect(c.gameClassification).toBe("simulated");
    expect(c.comparison.en).toMatch(/no numbers in your game change/);
  });
  it("after the mission: shows the child's real choice and allows the lab, without changing the choices or the outcome", () => {
    const choices = deepFreeze({ ...finished });
    const before = JSON.stringify(simulate(choices).state);
    const c = whatIfConnection(sc, choices, true)!;
    expect(c.labAvailable).toBe(true);
    expect(c.chosenOption).toEqual(DECISIONS["d3-emergency"].options.find((o) => o.id === finished["d3-emergency"])!.label);
    expect(JSON.stringify(simulate(choices).state)).toBe(before);
  });
  it("a scenario without a linked decision has no connection", () => {
    expect(whatIfConnection({ whatIf: { ...sc.whatIf, linkedDecisionId: null } }, finished, true)).toBeNull();
  });
});

describe("WP06.5 — readable mixed-direction Arabic", () => {
  it("isolates ids, dates, instruments and units inside Arabic without changing the visible text", () => {
    const ar = "في 2024-05-10T13:35Z رصد الجهاز GOES-P: SEISS >10 MeV قراءة 3151.75 μGy/hour.";
    const out = isolateLtr(ar);
    expect(out.replace(/[⁦⁩]/g, "")).toBe(ar);
    expect(out).toContain("⁦2024-05-10T13:35Z⁩");
    expect(out).toContain("⁦GOES-P: SEISS >10 MeV⁩");
    expect(out).toContain("⁦3151.75 μGy/hour⁩");
    const x = bidiT({ ar, en: "On 2024-05-10" });
    expect(x.en).toBe("On 2024-05-10");
  });
});
