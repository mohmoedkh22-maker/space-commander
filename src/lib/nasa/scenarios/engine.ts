// WP06.4 — Scientific Scenario Engine: assembles and validates scenarios from the OFFLINE datasets.
// Pure and deterministic: the same input files always give the same output (no clock, no randomness, no network).
import type { DONKIEvent, DONKIMetadata } from "../donki/donki.ts";
import { DONKI_EVENTS_FILE, donkiScenarios } from "./donkiScenarios.ts";
import { RADLAB_FILES, radlabScenarios, type RadLabDatasetFile } from "./radlabScenarios.ts";
import { suhailLessons } from "./suhailLessons.ts";
import {
  CATEGORY_DATASET,
  SCENARIO_CATEGORIES,
  SCENARIO_GENERATOR_VERSION,
  SCENARIO_SCHEMA_VERSION,
  t,
  type ScenarioCategory,
  type ScenarioSet,
  type ScientificScenario,
  type SuhailLesson,
} from "./types.ts";
import type { T } from "../../game/types.ts";

export interface ScenarioInput {
  donki: { events: DONKIEvent[]; metadata: DONKIMetadata };
  /** the approved RadLab datasets, keyed by instrument id (kept separate from DONKI) */
  radlab: Record<string, RadLabDatasetFile>;
}

const CATEGORY_ORDER = Object.fromEntries(SCENARIO_CATEGORIES.map((c, i) => [c, i])) as Record<ScenarioCategory, number>;
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function generateScenarios(input: ScenarioInput): ScenarioSet {
  const fromDonki = donkiScenarios(input.donki.events, input.donki.metadata);
  const radIds = Object.keys(input.radlab).sort();
  const fromRadlab = radIds.flatMap((id) => radlabScenarios(input.radlab[id]));
  const scenarios = [...fromDonki, ...fromRadlab].sort(
    (a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] || cmp(a.observationDate, b.observationDate) || cmp(a.id, b.id),
  );
  const lessons = suhailLessons(scenarios);
  const counts = Object.fromEntries(SCENARIO_CATEGORIES.map((c) => [c, scenarios.filter((s) => s.category === c).length])) as Record<ScenarioCategory, number>;
  const radRetrieved = radIds.map((id) => input.radlab[id].retrievedAt).sort();
  return {
    schemaVersion: SCENARIO_SCHEMA_VERSION,
    generatorVersion: SCENARIO_GENERATOR_VERSION,
    isLiveData: false,
    notice: t(
      "سيناريوهات تعليمية مبنية على بيانات ناسا التاريخية المحفوظة (DONKI وRadLab). ليست طقسًا فضائيًا حاليًا، ولا تغيّر موارد اللعبة.",
      "Educational scenarios built on cached historical NASA data (DONKI and RadLab). Not current space weather, and they do not change game resources.",
    ),
    inputs: {
      donki: { file: DONKI_EVENTS_FILE, retrievedAt: input.donki.metadata.retrievedAt, dataVersion: input.donki.metadata.dataVersion, events: input.donki.events.length },
      radlab: {
        files: radIds.map((id) => RADLAB_FILES[id] ?? id),
        retrievedAt: radRetrieved[radRetrieved.length - 1] ?? "",
        dataVersion: radIds.map((id) => input.radlab[id].dataVersion).filter((v, i, a) => a.indexOf(v) === i).join(","),
        records: Object.fromEntries(radIds.map((id) => [id, input.radlab[id].records.length])),
      },
    },
    counts: { ...counts, total: scenarios.length, lessons: lessons.length },
    scenarios,
    lessons,
  };
}

/* ---------------- validation of the scientific rules ---------------- */

const ARABIC = /[؀-ۿ]/;
/** measurements that are physically non-negative (everything except signed coordinates) */
export const NON_NEGATIVE = /(_rate$|flux|speed|half_angle)/;
const SENTENCES = (s: string) => s.split(/(?<=[.!?…])\s+/);
const NEGATED = /\b(not|no|never|isn't|wasn't|doesn't|don't|cannot|can't)\b|n't\b/i;
/** frightening words that must not appear in child-facing text */
const SCARY = /\b(die|dies|died|death|dead|deadly|kill|kills|killed|fatal|cancer|poison(ed|ous)?|lethal)\b/i;

function textFields(o: unknown, path: string, out: { path: string; v: T }[]) {
  if (!o || typeof o !== "object") return;
  if ("ar" in o && "en" in o && typeof (o as T).ar === "string" && typeof (o as T).en === "string") {
    out.push({ path, v: o as T });
    return;
  }
  for (const [k, v] of Object.entries(o)) textFields(v, `${path}.${k}`, out);
}

/** Sentences that would break a rule unless they are explicitly negated. Decision LABELS are quiz answers and are exempt. */
function claimViolations(path: string, en: string): string[] {
  if (/\.decisionOptions\.\d+\.label$|\.choices\.\d+\.label$/.test(path)) return [];
  const errs: string[] = [];
  for (const s of SENTENCES(en)) {
    if (/(astronaut|human|person|body|biological)/i.test(s) && /\bdose\b/i.test(s) && !NEGATED.test(s) && !/\bnot\b/i.test(s))
      errs.push(`${path}: biological-dose claim without negation: "${s}"`);
    if (/(caused|causes|cause of|because of|due to|led to|resulted in)/i.test(s) && !NEGATED.test(s) && !/\b(study|find|prove)\b/i.test(s))
      errs.push(`${path}: causation claim without negation: "${s}"`);
  }
  return errs;
}

export function validateScenario(s: ScientificScenario): string[] {
  const e: string[] = [];
  const p = s.id || "(no id)";
  if (!s.id) e.push("scenario without id");
  if (!SCENARIO_CATEGORIES.includes(s.category)) e.push(`${p}: unknown category ${s.category}`);
  if (s.source.dataset !== CATEGORY_DATASET[s.category]) e.push(`${p}: ${s.category} must use ${CATEGORY_DATASET[s.category]}, not ${s.source.dataset}`);
  if (!s.source.endpoint || !s.source.file || !s.source.retrievedAt) e.push(`${p}: incomplete source reference`);
  if (s.classification === "simulated") e.push(`${p}: generated scenarios must be historical, never simulated`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.observationDate)) e.push(`${p}: invalid observationDate`);
  if (!s.sourceRecords.length) e.push(`${p}: no source records`);
  const wantType = CATEGORY_DATASET[s.category] === "RADLAB" ? ["RADLAB_MEASUREMENT"] : [s.category];
  for (const r of s.sourceRecords) {
    if (!r.id) e.push(`${p}: source record without id`);
    if (!wantType.includes(r.recordType)) e.push(`${p}: record ${r.id} of type ${r.recordType} does not belong to ${s.category}`);
  }
  const recIds = new Set(s.sourceRecords.map((r) => r.id));
  for (const m of s.measurements) {
    if (typeof m.value !== "number" || !Number.isFinite(m.value)) e.push(`${p}: measurement ${m.name} is not a finite number`);
    // rates, speeds and angular widths cannot be negative; latitude/longitude legitimately can (south / east-west)
    if (NON_NEGATIVE.test(m.name) && m.value < 0) e.push(`${p}: measurement ${m.name} is negative`);
    if (!m.unit || !m.unitSource) e.push(`${p}: measurement ${m.name} has no unit or unit source`);
    if (!recIds.has(m.recordId)) e.push(`${p}: measurement ${m.name} points to a record that is not referenced`);
  }
  const measured = new Set(s.measurements.map((m) => m.name));
  for (const m of s.missingMeasurements) if (measured.has(m.name)) e.push(`${p}: ${m.name} is both measured and missing`);
  if (s.dataQuality.confidence !== null) e.push(`${p}: confidence must be null (no source provides one)`);
  if (!s.limitations.length) e.push(`${p}: no limitations`);
  if (s.whatIf.resourceEffects !== null) e.push(`${p}: what-if must not carry resource effects`);
  if (s.decisionOptions.length < 2 || s.decisionOptions.length > 3) e.push(`${p}: needs 2–3 decision options`);
  if (s.category === "LUNAR_ORBIT_RADIATION") {
    if (s.observationContext !== "lunar-orbit") e.push(`${p}: CRaTER must be lunar-orbit`);
    if (!s.limitations.some((l) => /not on the surface/i.test(l.en))) e.push(`${p}: missing the orbit-not-surface limitation`);
  }
  if (s.category === "DEEP_SPACE_COMPARISON") {
    if (s.observationContext !== "heliocentric-1au") e.push(`${p}: BioSentinel must be heliocentric-1au`);
    if (!/not at the Moon|not near the Moon/i.test(`${s.description.en} ${s.contextDescription.en}`)) e.push(`${p}: must say it is not a lunar measurement`);
  }
  if (CATEGORY_DATASET[s.category] === "RADLAB" && !s.limitations.some((l) => /not a dose in an astronaut's body/i.test(l.en)))
    e.push(`${p}: missing the detector-not-biological-dose limitation`);
  for (const r of s.relations) if (r.kind === "temporal-correlation-only" && !NEGATED.test(r.statement.en)) e.push(`${p}: correlation statement must deny causation`);
  e.push(...textChecks(s, p));
  return e;
}

function textChecks(o: ScientificScenario | SuhailLesson, p: string): string[] {
  const e: string[] = [];
  const fields: { path: string; v: T }[] = [];
  textFields(o, p, fields);
  for (const { path, v } of fields) {
    if (!v.ar.trim() || !v.en.trim()) e.push(`${path}: missing Arabic or English text`);
    else if (!ARABIC.test(v.ar)) e.push(`${path}: Arabic text has no Arabic letters`);
    if (SCARY.test(v.en)) e.push(`${path}: frightening wording`);
    e.push(...claimViolations(path, v.en));
  }
  return e;
}

export function validateLesson(l: SuhailLesson, scenarioIds: Set<string>): string[] {
  const e: string[] = [];
  const p = l.id || "(no id)";
  if (!l.id) e.push("lesson without id");
  if (l.choices.length < 2 || l.choices.length > 3) e.push(`${p}: needs 2–3 choices`);
  if (!l.basedOnScenarioIds.length) e.push(`${p}: not based on any scenario`);
  for (const id of l.basedOnScenarioIds) if (!scenarioIds.has(id)) e.push(`${p}: unknown scenario ${id}`);
  if (!l.sourceRecordIds.length) e.push(`${p}: no NASA records`);
  if (!l.limitations.length) e.push(`${p}: no limitations`);
  if (l.classification === "simulated") e.push(`${p}: lessons on NASA data must not be marked simulated`);
  // short, child-friendly sentences (ages 9–12)
  for (const f of [l.suhailIntro, l.childExplanation, l.challenge, l.learningObjective, ...l.choices.flatMap((c) => [c.label, c.educationalConsequence])])
    for (const s of SENTENCES(f.en)) if (s.split(/\s+/).length > 40) e.push(`${p}: sentence too long for children: "${s.slice(0, 60)}…"`);
  for (const r of l.relations) if (r.kind === "temporal-correlation-only" && !NEGATED.test(r.statement.en)) e.push(`${p}: correlation statement must deny causation`);
  e.push(...textChecks(l, p));
  return e;
}

/** All rule violations in a scenario set (empty = valid). */
export function validateScenarioSet(set: ScenarioSet): string[] {
  const e: string[] = [];
  const ids = set.scenarios.map((s) => s.id);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) e.push(`duplicate scenario ids: ${[...new Set(dup)].join(", ")}`);
  const lids = set.lessons.map((l) => l.id);
  if (new Set(lids).size !== lids.length) e.push("duplicate lesson ids");
  for (const s of set.scenarios) e.push(...validateScenario(s));
  const idSet = new Set(ids);
  for (const l of set.lessons) e.push(...validateLesson(l, idSet));
  if (set.isLiveData !== false) e.push("scenario set must not claim live data");
  return e;
}
