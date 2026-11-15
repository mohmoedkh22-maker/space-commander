import { describe, expect, it } from "vitest";
import { afterDecisionCue, companionCue, joinCue, REACTIONS, RULE_EXPRESSION } from "./companion";
import { DECISIONS } from "./decisions";
import { DIALOGUE_RULES, type DialogueMoment } from "./dialogue";
import { allPaths, simulate, STEPS } from "./engine";
import type { Choices } from "./types";

const at = (choices: Choices, step: string) => simulate(choices, STEPS.indexOf(step as never)).state;
const EXPRESSIONS = ["idle", "curious", "thinking", "explaining", "warning", "happy", "encouraging", "concerned"];
const MOMENTS: DialogueMoment[] = ["mission-1", "mission-2-alert", "mission-2", "mission-3-alert", "mission-3", "after-decision", "chapter-end"];

describe("Phase 2 — SUHAIL reacts to the real state", () => {
  it("healthy base at the start → happy, with the brief's line", () => {
    const c = companionCue(simulate({}, 0).state, "after-decision");
    expect(c.expression).toBe("happy");
    expect(c.reaction.ar).toBe("ممتاز يا قائد! القاعدة تعمل بكفاءة.");
  });
  it("low energy → warning, with the brief's line", () => {
    const s = at({ "d1-energy": "farm-full" }, "evt-fault"); // battery below 150 kWh after the vanishing-sun day
    const c = companionCue(s, "after-decision");
    expect(c.ruleId).toBe("LOW_ENERGY");
    expect(c.expression).toBe("warning");
    expect(c.reaction.ar).toBe("انتبه! مخزون الطاقة بدأ ينخفض.");
    expect(c.detail).toBeDefined();
  });
  it("right after a decision → explaining, with the brief's line", () => {
    const c = afterDecisionCue();
    expect(c.expression).toBe("explaining");
    expect(c.reaction.ar).toBe("قرار مهم! دعنا نراقب تأثيره.");
  });
  it("storm before the safety steps → warning; crew sheltered at the chapter end → encouraging", () => {
    const good = { "d1-energy": "save-energy", "d2-water": "repair", "d3-emergency": "full-ops" };
    expect(companionCue(at(good, "safety"), "mission-3-alert").expression).toBe("warning");
    expect(companionCue(simulate(good).state, "chapter-end").expression).toBe("encouraging");
  });
  it("a repaired recycler → encouraging (recovery)", () => {
    const s = at({ "d1-energy": "save-energy", "d2-water": "repair" }, "evt-storm");
    expect(companionCue(s, "after-decision").ruleId).toBe("RECOVERY_WATER");
    expect(companionCue(s, "after-decision").expression).toBe("encouraging");
  });
  it("every dialogue rule has an expression", () => {
    for (const r of DIALOGUE_RULES) expect(EXPRESSIONS).toContain(RULE_EXPRESSION[r.id]);
  });
  it("on every path and moment SUHAIL has a valid, bilingual cue — and never names an option for the child", () => {
    const labels = Object.values(DECISIONS).flatMap((d) => d.options.flatMap((o) => [o.label.ar, o.label.en]));
    for (const c of allPaths()) {
      for (const s of simulate(c).snapshots) {
        for (const m of MOMENTS) {
          const cue = companionCue(s, m);
          expect(EXPRESSIONS).toContain(cue.expression);
          const line = joinCue(cue);
          expect(line.ar.length && line.en.length).toBeTruthy();
          for (const l of labels) expect(cue.reaction.en.includes(l) || cue.reaction.ar.includes(l)).toBe(false);
        }
      }
    }
  });
  it("all reactions exist in Arabic and English", () => {
    for (const r of Object.values(REACTIONS)) expect(r.ar && r.en).toBeTruthy();
  });
});
