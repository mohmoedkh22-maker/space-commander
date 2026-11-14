// V0.6 — WHAT IF LAB
// Branch a finished mission at one earlier decision, replay it with the deterministic engine and explain the difference.
// Pure TypeScript: no React, no randomness. The original history is deep-frozen and never modified.
import { CONDITION_TEXT, FACILITY_NAMES, SHED_TEXT, missionResult } from "./consequences";
import { DECISIONS } from "./decisions";
import { STEPS, computeEnding, lockReason, simulate, simulateFrom, type OptionResolver } from "./engine";
import type { Choices, DayLog, DecisionId, DecisionRecord, EndingId, FacilityConditions, GameState, MissionId, ResourceId, T } from "./types";

const t = (ar: string, en: string): T => ({ ar, en });
const r = (n: number) => Math.round(n);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export type Prediction = "more" | "same" | "less";
export type MetricKey = ResourceId;
export const METRICS: MetricKey[] = ["energy", "water", "oxygen", "food"];
/** what the child predicts about: one resource at the end of the mission, or the mission outcome */
export type PredictTarget = MetricKey | "outcome";
export interface PredictionInput {
  target: PredictTarget;
  direction: Prediction;
  /** optional words in the child's own language (never evaluated, only shown back) */
  note?: string;
}

/* ---------------- 1. Immutable history ---------------- */

export interface DecisionPoint {
  decisionId: DecisionId;
  mission: MissionId;
  day: number;
  stepIndex: number;
  optionId: string;
  /** exact engine state right before the decision */
  before: GameState;
  /** exact engine state right after the decision */
  after: GameState;
}

export function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}

/** The decisions of a run with their state snapshots, deep-frozen so nothing can change them. */
export function decisionHistory(choices: Choices): readonly DecisionPoint[] {
  const run = simulate({ ...choices });
  return deepFreeze(
    run.records.map((rec) => ({
      decisionId: rec.decisionId,
      mission: DECISIONS[rec.decisionId].mission,
      day: rec.day,
      stepIndex: STEPS.indexOf(rec.decisionId),
      optionId: rec.optionId,
      before: rec.before,
      after: rec.after,
    })),
  );
}

/* ---------------- 2. Policy for later decisions that become invalid ---------------- */

/**
 * CAUTION LADDER — each decision's options from the most ambitious to the most careful.
 * Policy "keep, else one step more careful":
 *   1. A later decision keeps the child's original option if it is still allowed in the new timeline.
 *   2. If it is locked, the lab moves DOWN the ladder and uses the first allowed option below it.
 *   3. If nothing below is allowed, it uses the first allowed option of the whole ladder.
 * The bottom rung of every ladder has no resource prerequisite, so rule 2 always finds an option.
 */
export const CAUTION_LADDER: Record<DecisionId, string[]> = {
  "d1-energy": ["farm-full", "balance", "save-energy"],
  "d2-water": ["boost", "repair", "cut-farm"],
  "d3-emergency": ["full-ops", "essential", "conserve"],
};

export const LATER_DECISION_POLICY: T = t(
  "إذا أصبح قرارك اللاحق مقفلًا في المسار الجديد، يأخذ المختبر الخيار التالي الأكثر حذرًا والمتاح.",
  "If one of your later choices is locked in the new timeline, the lab takes the next more careful option that is allowed.",
);

export const keepElseMoreCareful: OptionResolver = (s, id, requested) => {
  if (lockReason(s, id, requested) === null) return requested;
  const ladder = CAUTION_LADDER[id];
  const allowed = (o: string) => lockReason(s, id, o) === null;
  const below = ladder.slice(ladder.indexOf(requested) + 1).find(allowed);
  const any = ladder.find(allowed);
  const pick = below ?? any;
  if (!pick) throw new Error(`No allowed option for ${id}`);
  return pick;
};

/* ---------------- 3. Branching ---------------- */

export interface Timeline {
  choices: Choices;
  final: GameState;
  ending: EndingId;
  days: DayLog[];
  records: DecisionRecord[];
}

export interface LaterDecision {
  decisionId: DecisionId;
  original: string;
  alternative: string;
  status: "kept" | "replaced";
  /** why the original option was locked in the alternative timeline */
  lockedBecause: T | null;
}

export interface FacilityDiff {
  facility: keyof FacilityConditions;
  original: string;
  alternative: string;
  changed: boolean;
}

export interface Explanation {
  whatChanged: T;
  afterward: T[];
  why: T[];
}

export interface WhatIfComparison {
  decisionId: DecisionId;
  originalOptionId: string;
  altOptionId: string;
  divergence: { day: number; stepIndex: number; firstDifferentDay: number | null };
  original: Timeline;
  alternative: Timeline;
  diff: Record<MetricKey, number>;
  /** later decisions changed by the policy (kept for older callers) */
  forcedChanges: DecisionRecord[];
  later: LaterDecision[];
  facilities: FacilityDiff[];
  explanation: Explanation;
}

export type BranchError = "unknown-decision" | "unknown-option" | "incomplete-mission" | "not-taken" | "same-option" | "locked-at-branch";

const ERROR_TEXT: Record<BranchError, T> = {
  "unknown-decision": t("هذا القرار غير موجود.", "That decision does not exist."),
  "unknown-option": t("هذا الخيار غير موجود.", "That option does not exist."),
  "incomplete-mission": t("أكمل المهمة أولًا ثم ادخل المختبر.", "Finish the mission first, then enter the lab."),
  "not-taken": t("لم تتخذ هذا القرار في مهمتك.", "You did not take this decision in your mission."),
  "same-option": t("هذا هو خيارك الأصلي — اختر خيارًا مختلفًا.", "That is your original choice — pick a different one."),
  "locked-at-branch": t("هذا الخيار كان مقفلًا في تلك اللحظة، فلا يمكن تجربته.", "That option was locked at that moment, so it cannot be tested."),
};

export type BranchResult = { ok: true; comparison: WhatIfComparison } | { ok: false; error: BranchError; message: T };

const fail = (error: BranchError): BranchResult => ({ ok: false, error, message: ERROR_TEXT[error] });

/** Never throws: returns a clear error for missing or invalid branches. */
export function tryRunWhatIf(original: Choices, decisionId: DecisionId, altOptionId: string): BranchResult {
  const decision = DECISIONS[decisionId];
  if (!decision) return fail("unknown-decision");
  if (!decision.options.some((o) => o.id === altOptionId)) return fail("unknown-option");
  for (const [id, opt] of Object.entries(original)) {
    const d = DECISIONS[id as DecisionId];
    if (!d) return fail("unknown-decision");
    if (!d.options.some((o) => o.id === opt)) return fail("unknown-option");
  }

  const run = simulate({ ...original });
  if (run.state.day <= 7) return fail("incomplete-mission");
  const rec = run.records.find((x) => x.decisionId === decisionId);
  if (!rec) return fail("not-taken");
  if (rec.optionId === altOptionId) return fail("same-option");
  if (lockReason(rec.before, decisionId, altOptionId)) return fail("locked-at-branch");

  const origTimeline: Timeline = { choices: { ...original }, final: run.state, ending: computeEnding(run.state), days: run.state.log, records: run.records };

  // earlier decisions are preserved exactly: the replay starts from the frozen state saved before this decision
  const effective: Choices = {};
  for (const x of run.records) effective[x.decisionId] = x.optionId;
  const from = STEPS.indexOf(decisionId);
  const alt = simulateFrom(rec.before, from, { ...effective, [decisionId]: altOptionId }, STEPS.length, keepElseMoreCareful);
  const earlier = run.records.filter((x) => STEPS.indexOf(x.decisionId) < from);
  const altChoices: Choices = { ...effective };
  for (const x of alt.records) altChoices[x.decisionId] = x.optionId;
  const altTimeline: Timeline = {
    choices: altChoices,
    final: alt.state,
    ending: computeEnding(alt.state),
    days: alt.state.log,
    records: [...earlier, ...alt.records],
  };

  const later: LaterDecision[] = alt.records
    .filter((x) => x.decisionId !== decisionId)
    .map((x) => ({
      decisionId: x.decisionId,
      original: effective[x.decisionId]!,
      alternative: x.optionId,
      status: x.fallback ? "replaced" : "kept",
      lockedBecause: x.fallback ? lockReason(x.before, x.decisionId, x.requestedOptionId) : null,
    }));

  const diff = Object.fromEntries(METRICS.map((m) => [m, altTimeline.final.resources[m] - origTimeline.final.resources[m]])) as Record<MetricKey, number>;
  const facilities: FacilityDiff[] = (Object.keys(origTimeline.final.facilities) as (keyof FacilityConditions)[]).map((f) => ({
    facility: f,
    original: origTimeline.final.facilities[f],
    alternative: altTimeline.final.facilities[f],
    changed: origTimeline.final.facilities[f] !== altTimeline.final.facilities[f],
  }));

  const sameDay = (a: DayLog, b: DayLog) => METRICS.every((m) => Math.abs(a[m] - b[m]) < 1e-9);
  const firstDiff = origTimeline.days.find((d, i) => altTimeline.days[i] && !sameDay(d, altTimeline.days[i]));

  const comparison: WhatIfComparison = {
    decisionId,
    originalOptionId: rec.optionId,
    altOptionId,
    divergence: { day: rec.day, stepIndex: from, firstDifferentDay: firstDiff ? firstDiff.day : null },
    original: origTimeline,
    alternative: altTimeline,
    diff,
    forcedChanges: alt.records.filter((x) => x.fallback),
    later,
    facilities,
    explanation: { whatChanged: t("", ""), afterward: [], why: [] },
  };
  comparison.explanation = explain(comparison);
  return { ok: true, comparison };
}

/** Throwing variant for callers that already validated the branch. */
export function runWhatIf(original: Choices, decisionId: DecisionId, altOptionId: string): WhatIfComparison {
  const res = tryRunWhatIf(original, decisionId, altOptionId);
  if (!res.ok) throw new Error(`What If branch rejected: ${res.error}`);
  return res.comparison;
}

/**
 * Replays a decision from the EXACT saved state that existed before it:
 * applies the alternative option, then recalculates every later step.
 */
export function replayFromState(saved: GameState, decisionId: DecisionId, altOptionId: string, laterChoices: Choices) {
  const from = STEPS.indexOf(decisionId);
  if (from < 0) throw new Error(`Unknown decision ${decisionId}`);
  return simulateFrom(saved, from, { ...laterChoices, [decisionId]: altOptionId }, STEPS.length, keepElseMoreCareful);
}

/* ---------------- 4. Explanations (what changed / what happened afterward / why) ---------------- */

const optLabel = (id: DecisionId, opt: string) => DECISIONS[id].options.find((o) => o.id === opt)!.label;
const ENDING_RANK: Record<EndingId, number> = { A: 2, B: 1, C: 0 };
export const ENDING_NAME: Record<EndingId, T> = {
  A: t("المهمة أُنجزت", "Mission accomplished"),
  B: t("آمنة لكن محدودة", "Safe but limited"),
  C: t("المهمة توقفت مبكرًا", "Mission interrupted"),
};
const more = (n: number, ar: [string, string], en: [string, string]) => (n > 0 ? { ar: ar[0], en: en[0] } : { ar: ar[1], en: en[1] });

function explain(c: WhatIfComparison): Explanation {
  const id = c.decisionId;
  const d = DECISIONS[id];
  const o = optLabel(id, c.originalOptionId);
  const a = optLabel(id, c.altOptionId);
  const whatChanged = t(
    `في اليوم ${c.divergence.day} (${d.title.ar}) جرّبت «${a.ar}» بدل «${o.ar}». كل ما قبل ذلك بقي كما هو تمامًا.`,
    `On day ${c.divergence.day} (${d.title.en}) you tried “${a.en}” instead of “${o.en}”. Everything before that stayed exactly the same.`,
  );

  const afterward: T[] = [];
  for (const l of c.later) {
    const title = DECISIONS[l.decisionId].title;
    if (l.status === "kept") {
      afterward.push(t(`${title.ar}: بقي خيارك «${optLabel(l.decisionId, l.original).ar}».`, `${title.en}: your choice “${optLabel(l.decisionId, l.original).en}” stayed.`));
    } else {
      const why = (s: string) => ` (${s.replace(/[.。]\s*$/, "").replace(/\.\s*\(/, " (")})`;
      afterward.push(
        t(
          `${title.ar}: خيارك «${optLabel(l.decisionId, l.original).ar}» أصبح مقفلًا${l.lockedBecause ? why(l.lockedBecause.ar) : ""}، فأخذ المختبر «${optLabel(l.decisionId, l.alternative).ar}».`,
          `${title.en}: your choice “${optLabel(l.decisionId, l.original).en}” became locked${l.lockedBecause ? why(l.lockedBecause.en) : ""}, so the lab used “${optLabel(l.decisionId, l.alternative).en}”.`,
        ),
      );
    }
  }
  // days where the base had to switch things off in only one of the timelines
  c.alternative.days.forEach((ad, i) => {
    const od = c.original.days[i];
    if (!od || ad.day < c.divergence.day) return;
    const onlyAlt = ad.shed.filter((x) => !od.shed.includes(x));
    const onlyOrig = od.shed.filter((x) => !ad.shed.includes(x));
    if (onlyAlt.length)
      afterward.push(
        t(
          `اليوم ${ad.day}: في المسار البديل نفدت الطاقة فأُطفئ ${onlyAlt.map((x) => SHED_TEXT[x].ar).join(" و")}.`,
          `Day ${ad.day}: in the alternative, power ran low and ${onlyAlt.map((x) => SHED_TEXT[x].en).join(" and ")} had to be switched off.`,
        ),
      );
    if (onlyOrig.length)
      afterward.push(
        t(
          `اليوم ${ad.day}: في مسارك الأصلي أُطفئ ${onlyOrig.map((x) => SHED_TEXT[x].ar).join(" و")}، أما في البديل فلا.`,
          `Day ${ad.day}: in your original timeline ${onlyOrig.map((x) => SHED_TEXT[x].en).join(" and ")} had to be switched off — not in the alternative.`,
        ),
      );
  });
  const oe = c.original.ending;
  const ae = c.alternative.ending;
  afterward.push(
    oe === ae
      ? t(`نتيجة المهمة بقيت نفسها: ${ENDING_NAME[oe].ar}.`, `The mission outcome stayed the same: ${ENDING_NAME[oe].en}.`)
      : t(`نتيجة المهمة تغيّرت: ${ENDING_NAME[oe].ar} ← ${ENDING_NAME[ae].ar}.`, `The mission outcome changed: ${ENDING_NAME[oe].en} → ${ENDING_NAME[ae].en}.`),
  );

  // WHY — read the day logs from the divergence day on
  const why: T[] = [];
  const from = c.divergence.day;
  const od = c.original.days.filter((x) => x.day >= from);
  const ad = c.alternative.days.filter((x) => x.day >= from);
  const dSolar = sum(ad.map((x) => x.solarKWh)) - sum(od.map((x) => x.solarKWh));
  const dLoad = sum(ad.map((x) => x.loadKWh)) - sum(od.map((x) => x.loadKWh));
  why.push(
    Math.abs(dSolar) < 1
      ? Math.abs(dLoad) < 1
        ? t("الشمس كانت نفسها في المسارين (بيانات ناسا)، والقاعدة استهلكت الكمية نفسها تقريبًا من الكهرباء.", "The Sun was the same in both timelines (NASA data), and the base used about the same electricity.")
        : t(
            `الشمس كانت نفسها في المسارين (بيانات ناسا)، فالفرق جاء من الاستهلاك: القاعدة استهلكت ${r(Math.abs(dLoad))} ك.و.س ${more(dLoad, ["أكثر", "أقل"], ["", ""]).ar} في المسار البديل، لذلك البطارية ${more(-dLoad, ["أعلى", "أقل"], ["", ""]).ar}.`,
            `The Sun was the same in both timelines (NASA data), so the difference came from use: the base used ${r(Math.abs(dLoad))} kWh ${more(dLoad, ["", ""], ["more", "less"]).en} in the alternative, so the battery is ${more(-dLoad, ["", ""], ["higher", "lower"]).en}.`,
          )
      : t(
          `الألواح أنتجت ${r(Math.abs(dSolar))} ك.و.س ${more(dSolar, ["أكثر", "أقل"], ["", ""]).ar}، والقاعدة استهلكت ${r(Math.abs(dLoad))} ك.و.س ${more(dLoad, ["أكثر", "أقل"], ["", ""]).ar} في المسار البديل.`,
          `The panels made ${r(Math.abs(dSolar))} kWh ${more(dSolar, ["", ""], ["more", "less"]).en} and the base used ${r(Math.abs(dLoad))} kWh ${more(dLoad, ["", ""], ["more", "less"]).en} in the alternative.`,
        ),
  );
  const loss = (xs: DayLog[]) => sum(xs.map((x) => x.crewWaterUseL * (1 - x.recyclerEfficiency) + x.greenhouseWaterL));
  const dWaterLoss = loss(ad) - loss(od);
  if (Math.abs(dWaterLoss) >= 1) {
    const eff = (xs: DayLog[]) => r((sum(xs.map((x) => x.recyclerEfficiency)) / xs.length) * 100);
    why.push(
      t(
        `الماء: فُقد ${r(Math.abs(dWaterLoss))} لتر ${dWaterLoss > 0 ? "أكثر" : "أقل"} في المسار البديل — المدوّر استعاد ${eff(ad)}% من الماء مقابل ${eff(od)}%، والمزرعة استهلكت ${r(sum(ad.map((x) => x.greenhouseWaterL)))} لتر مقابل ${r(sum(od.map((x) => x.greenhouseWaterL)))}.`,
        `Water: ${r(Math.abs(dWaterLoss))} L ${dWaterLoss > 0 ? "more" : "less"} was lost in the alternative — the recycler recovered ${eff(ad)}% of the water vs ${eff(od)}%, and the greenhouse used ${r(sum(ad.map((x) => x.greenhouseWaterL)))} L vs ${r(sum(od.map((x) => x.greenhouseWaterL)))} L.`,
      ),
    );
  }
  const dGrowth = sum(ad.map((x) => x.cropGrowth)) - sum(od.map((x) => x.cropGrowth));
  if (Math.abs(dGrowth) >= 1) {
    why.push(
      t(
        `الغذاء: المحاصيل نمت ${r(Math.abs(dGrowth))}% ${dGrowth > 0 ? "أكثر" : "أقل"}، لأن المزرعة حصلت على ${dGrowth > 0 ? "طاقة وماء أكثر" : "طاقة وماء أقل"}.`,
        `Food: crops grew ${r(Math.abs(dGrowth))}% ${dGrowth > 0 ? "more" : "less"}, because the greenhouse got ${dGrowth > 0 ? "more" : "less"} power and water.`,
      ),
    );
  }
  const dShort = c.alternative.final.shortfallDays - c.original.final.shortfallDays;
  if (Math.abs(c.diff.oxygen) >= 1) {
    why.push(
      dShort !== 0
        ? t(
            `الأكسجين: في المسار البديل ${dShort > 0 ? "زادت" : "قلّت"} أيام نقص الكهرباء (${c.alternative.final.shortfallDays} مقابل ${c.original.final.shortfallDays})، ودعم الحياة يحتاج كهرباء ليصنع الهواء.`,
            `Oxygen: the alternative had ${dShort > 0 ? "more" : "fewer"} days without enough power (${c.alternative.final.shortfallDays} vs ${c.original.final.shortfallDays}), and life support needs power to make air.`,
          )
        : t("الأكسجين: المزرعة المزدهرة تضيف قليلًا من الأكسجين، فتغيّر الأكسجين مع حالة المزرعة.", "Oxygen: a thriving greenhouse adds a little oxygen, so oxygen followed the greenhouse."),
    );
  }
  if (oe !== ae) {
    const reasons = missionResult(c.alternative.final).reasons.slice(0, -1);
    if (reasons[0]) why.push(t(`النتيجة: ${reasons[0].ar}`, `Outcome: ${reasons[0].en}`));
  }
  return { whatChanged, afterward, why };
}

/* ---------------- 5. Predictions ---------------- */

export function judgePrediction(diff: number, p: Prediction, tolerance = 1): boolean {
  if (Math.abs(diff) <= tolerance) return p === "same";
  return diff > 0 ? p === "more" : p === "less";
}

/** "more" = better outcome, "less" = worse outcome. */
export function judgeOutcome(original: EndingId, alternative: EndingId, p: Prediction): boolean {
  return judgePrediction(ENDING_RANK[alternative] - ENDING_RANK[original], p, 0);
}

export function checkPrediction(c: WhatIfComparison, p: PredictionInput): boolean {
  return p.target === "outcome" ? judgeOutcome(c.original.ending, c.alternative.ending, p.direction) : judgePrediction(c.diff[p.target], p.direction, 1);
}

export const CONDITION_LABEL = (v: string): T => CONDITION_TEXT[v] ?? t(v, v);
export const FACILITY_LABEL = (f: keyof FacilityConditions): T => FACILITY_NAMES[f];
