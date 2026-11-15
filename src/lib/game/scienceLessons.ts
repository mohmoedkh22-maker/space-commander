// WP06.5 — SUHAIL's science lessons in the game: progress, labels and the What If connection.
// Pure TypeScript. Lessons are educational only: they never read or change resources, decisions, the day, the ending,
// the mission save (PROGRESS_KEY) or the What If engine. Their own progress uses a separate key.
import { DECISIONS } from "./decisions";
import type { Choices, DecisionId, T } from "./types";
import type { ScenarioClassification, ScenarioSet, ScientificScenario, SuhailLesson } from "../nasa/scenarios/types";

export const LESSONS_KEY = "space-commander-science-lessons";

const t = (ar: string, en: string): T => ({ ar, en });

/* ---------------- progress (this device only) ---------------- */

export interface LessonProgress {
  v: 1;
  /** lessonId → id of the choice the child explored last */
  chosen: Record<string, string>;
}

export const emptyLessonProgress = (): LessonProgress => ({ v: 1, chosen: {} });

export function serializeLessonProgress(p: LessonProgress): string {
  return JSON.stringify({ v: 1, chosen: p.chosen });
}

/** Valid saved progress, keeping only known lessons and choices; anything malformed gives empty progress. */
export function parseLessonProgress(raw: string | null | undefined, lessons: Pick<SuhailLesson, "id" | "choices">[]): LessonProgress {
  if (!raw) return emptyLessonProgress();
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return emptyLessonProgress();
  }
  if (!o || typeof o !== "object" || (o as { v?: unknown }).v !== 1) return emptyLessonProgress();
  const chosen = (o as { chosen?: unknown }).chosen;
  if (!chosen || typeof chosen !== "object") return emptyLessonProgress();
  const out: Record<string, string> = {};
  for (const l of lessons) {
    const c = (chosen as Record<string, unknown>)[l.id];
    if (typeof c === "string" && l.choices.some((x) => x.id === c)) out[l.id] = c;
  }
  return { v: 1, chosen: out };
}

/** Record the child's choice (returns a new object; the old one is not modified). */
export function chooseOption(p: LessonProgress, lesson: Pick<SuhailLesson, "id" | "choices">, choiceId: string): LessonProgress {
  if (!lesson.choices.some((c) => c.id === choiceId)) return p;
  return { v: 1, chosen: { ...p.chosen, [lesson.id]: choiceId } };
}

export const isLessonDone = (p: LessonProgress, lessonId: string) => lessonId in p.chosen;
export const lessonsDone = (p: LessonProgress, lessons: Pick<SuhailLesson, "id">[]) => lessons.filter((l) => isLessonDone(p, l.id)).length;

/** The first lesson not explored yet, in the guided order (null when all are done). */
export function nextLessonId(p: LessonProgress, lessons: Pick<SuhailLesson, "id">[]): string | null {
  return lessons.find((l) => !isLessonDone(p, l.id))?.id ?? null;
}

/* ---------------- labels ---------------- */

/** How the player sees whether something is real NASA history or game simulation. */
export const CLASSIFICATION_LABEL: Record<ScenarioClassification, { label: T; tone: "historical" | "model" | "reference" | "simulated" }> = {
  "historical-observation": { label: t("سجل تاريخي من ناسا", "Historical NASA record"), tone: "historical" },
  "historical-model-output": { label: t("سجل تاريخي من ناسا (من نموذج تنبؤ)", "Historical NASA record (from a forecast model)"), tone: "model" },
  "historical-reference-only": { label: t("مرجع من ناسا — التفاصيل غير متوفرة", "NASA reference — details unavailable"), tone: "reference" },
  simulated: { label: t("محاكاة — سيناريو تدريبي في اللعبة", "Simulated — a game training scenario"), tone: "simulated" },
};

export const DATASET_LABEL: Record<"DONKI" | "RADLAB", T> = {
  DONKI: t("ناسا DONKI — قاعدة بيانات الطقس الفضائي", "NASA DONKI — space weather database"),
  RADLAB: t("ناسا OSDR RadLab — قياسات الإشعاع", "NASA OSDR RadLab — radiation measurements"),
};

export const CATEGORY_LABEL: Record<ScientificScenario["category"], T> = {
  SEP: t("جسيمات شمسية نشطة", "Solar energetic particles"),
  CME: t("انبعاثات كتلية إكليلية", "Coronal mass ejections"),
  FLR: t("توهجات شمسية", "Solar flares"),
  LUNAR_ORBIT_RADIATION: t("الإشعاع في مدار القمر", "Radiation in lunar orbit"),
  DEEP_SPACE_COMPARISON: t("مقارنة من الفضاء العميق", "Deep-space comparison"),
};

/* ---------------- lesson ↔ scenarios ---------------- */

/** The data scenarios a lesson is built on, in the lesson's own order (unknown ids are skipped, never invented). */
export function lessonScenarios(set: Pick<ScenarioSet, "scenarios">, lesson: Pick<SuhailLesson, "basedOnScenarioIds">): ScientificScenario[] {
  const by = new Map(set.scenarios.map((s) => [s.id, s]));
  return lesson.basedOnScenarioIds.map((id) => by.get(id)).filter((s): s is ScientificScenario => !!s);
}

/* ---------------- What If connection (qualitative; the What If engine is not touched) ---------------- */

export interface WhatIfConnection {
  /** the game decision the NASA scenarios relate to */
  decisionId: DecisionId;
  decisionTitle: T;
  /** the child's choice for that decision in the CURRENT finished mission, if any */
  chosenOption: T | null;
  /** true when the mission is finished, so the What If Lab can be opened with the existing decision history */
  labAvailable: boolean;
  question: T;
  /** the game's emergency is a training scenario; the lesson is historical NASA data */
  gameClassification: ScenarioClassification;
  comparison: T;
}

export function whatIfConnection(scenario: Pick<ScientificScenario, "whatIf">, choices: Choices, missionComplete: boolean): WhatIfConnection | null {
  const id = scenario.whatIf.linkedDecisionId;
  if (!id) return null;
  const d = DECISIONS[id];
  const chosenId = choices[id];
  const chosen = chosenId ? (d.options.find((o) => o.id === chosenId)?.label ?? null) : null;
  return {
    decisionId: id,
    decisionTitle: d.title,
    chosenOption: missionComplete ? chosen : null,
    labAvailable: missionComplete && !!chosen,
    question: scenario.whatIf.question,
    gameClassification: "simulated",
    comparison: t(
      "في المهمة 03 كانت العاصفة الشمسية سيناريو تدريبيًا (محاكاة). أما هذا الدرس فمبني على سجلات حقيقية من ناسا في مايو 2024. المقارنة هنا بالأفكار فقط؛ لا تتغير أي أرقام في لعبتك.",
      "In Mission 03 the solar storm was a training scenario (simulated). This lesson is built on real NASA records from May 2024. The comparison here is about ideas only; no numbers in your game change.",
    ),
  };
}

/* ---------------- readable mixed-direction text ---------------- */

/** A run of left-to-right text inside Arabic: NASA ids, ISO dates, instrument names, numbers with units. */
const LTR_RUN = /[A-Za-z0-9μ][A-Za-z0-9μ °:.,\-–/>+()%_@]*[A-Za-z0-9)%]/g;

/**
 * Wraps every left-to-right run in Unicode directional isolates (LRI … PDI) so that, inside an Arabic sentence,
 * "2024-05-10T13:35Z" or "GOES-P: SEISS >10 MeV" stay in their own order. The visible characters are unchanged.
 */
export function isolateLtr(s: string): string {
  return s.replace(LTR_RUN, (m) => `\u2066${m}\u2069`);
}

/** Arabic gets the isolates; English is already left-to-right and is returned unchanged. */
export const bidiT = (x: T): T => ({ ar: isolateLtr(x.ar), en: x.en });
