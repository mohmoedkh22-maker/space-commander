// WP06.4 — Radiation scenarios from the offline NASA OSDR RadLab datasets ONLY.
//   LUNAR_ORBIT_RADIATION  ← LRO / CRaTER-D1D2 (lunar ORBIT; never the lunar surface)
//   DEEP_SPACE_COMPARISON  ← BioSentinel / BPD  (heliocentric orbit at ~1 AU; never a lunar measurement)
// Values are copied from identified records (the daily maximum is SELECTED, not computed). Nothing is converted or filled.
import { t, type DecisionOptionEdu, type ScenarioCategory, type ScientificScenario, type SourceRef } from "./types.ts";
import { COMMON_LIMITS, NO_CONFIDENCE, RADIATION_WHATIF } from "./common.ts";

/** The shape of public/data/radlab/<instrument>.json written by scripts/nasa/sync-radlab.ts (only the fields used here). */
export interface RadLabDatasetFile {
  dataVersion: string;
  instrumentId: string;
  spacecraft: string;
  trajectory: string;
  retrievedAt: string;
  source: { api: string };
  units: Record<string, { unit: string; source: string }>;
  columns: readonly string[];
  records: unknown[][];
}

export const RADLAB_FILES: Record<string, string> = {
  "CRaTER-D1D2": "public/data/radlab/crater-d1d2.json",
  BPD: "public/data/radlab/bpd.json",
};

/** Which approved instrument feeds which category, and the context it must be described with. */
export const RADLAB_SCENARIO_SOURCES: Record<string, { category: ScenarioCategory; spacecraft: string; trajectory: string }> = {
  "CRaTER-D1D2": { category: "LUNAR_ORBIT_RADIATION", spacecraft: "LRO", trajectory: "Lunar orbit" },
  BPD: { category: "DEEP_SPACE_COMPARISON", spacecraft: "BioSentinel", trajectory: "Heliocentric orbit at 1 AU" },
};

interface DayStat {
  day: string;
  records: number;
  validValues: number;
  invalidValues: number;
  nullValues: number;
  zeroFlagged: number;
  maxValue: number | null;
  maxTimestamp: string | null;
}

/**
 * Group one RadLab dataset by day (the date part of the timestamp as returned = UTC-assumed day) and find, per day,
 * the record with the largest absorbed_dose_rate. Invalid values (non-numeric, negative, NaN) are excluded and counted.
 */
export function dailyStats(ds: RadLabDatasetFile): DayStat[] {
  const ti = ds.columns.indexOf("timestamp");
  const vi = ds.columns.indexOf("absorbed_dose_rate");
  const fi = ds.columns.indexOf("qualityFlags");
  if (ti < 0 || vi < 0) throw new Error(`${ds.instrumentId}: dataset has no timestamp/absorbed_dose_rate column`);
  const by = new Map<string, DayStat>();
  for (const r of ds.records) {
    const ts = r[ti];
    if (typeof ts !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(ts)) continue;
    const d = ts.slice(0, 10);
    let s = by.get(d);
    if (!s) by.set(d, (s = { day: d, records: 0, validValues: 0, invalidValues: 0, nullValues: 0, zeroFlagged: 0, maxValue: null, maxTimestamp: null }));
    s.records++;
    const flags = fi >= 0 && Array.isArray(r[fi]) ? (r[fi] as unknown[]) : [];
    if (flags.includes("zero_value")) s.zeroFlagged++;
    const v = r[vi];
    if (v === null) {
      s.nullValues++;
      continue;
    }
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      s.invalidValues++;
      continue;
    }
    s.validValues++;
    if (s.maxValue === null || v > s.maxValue) {
      s.maxValue = v;
      s.maxTimestamp = ts;
    }
  }
  return [...by.values()].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

const RADIATION_DECISIONS: DecisionOptionEdu[] = [
  {
    id: "surface",
    label: t("هذه كمية الإشعاع على سطح القمر", "This is the radiation on the Moon's surface"),
    educationalConsequence: t(
      "ليس تمامًا! الجهاز كان في مدار أو في الفضاء، وليس على سطح القمر. المكان يغيّر القراءة.",
      "Not quite! The detector was in orbit or in space, not on the Moon's surface. The place changes the reading.",
    ),
  },
  {
    id: "detector",
    label: t("هذه قراءة جهاز كشف في مكانه", "This is a detector's reading where it was"),
    educationalConsequence: t(
      "صحيح! العلماء يذكرون دائمًا أين كان الجهاز ومتى قاس. هذا يجعل الرقم مفهومًا.",
      "Correct! Scientists always say where the detector was and when it measured. That makes the number meaningful.",
    ),
  },
  {
    id: "astronaut",
    label: t("هذه الجرعة التي يتلقاها رائد الفضاء", "This is the dose an astronaut receives"),
    educationalConsequence: t(
      "فكرة قريبة لكنها غير صحيحة. جسم الإنسان والدروع حوله يختلفان عن مادة الجهاز، لذلك لا نساوي بينهما.",
      "Close, but not right. A human body and the shielding around it are different from the detector's material, so we don't treat them as the same.",
    ),
  },
];

function scenarioFor(ds: RadLabDatasetFile, s: DayStat, kind: "quiet" | "peak", endpoint: string): ScientificScenario {
  const src = RADLAB_SCENARIO_SOURCES[ds.instrumentId];
  const unit = ds.units.absorbed_dose_rate;
  const lunar = src.category === "LUNAR_ORBIT_RADIATION";
  const recordId = `${ds.instrumentId}@${s.maxTimestamp}`;
  const source: SourceRef = {
    dataset: "RADLAB",
    provider: "NASA Open Science Data Repository (OSDR) RadLab",
    endpoint,
    file: RADLAB_FILES[ds.instrumentId],
    retrievedAt: ds.retrievedAt,
    dataVersion: ds.dataVersion,
  };
  const v = s.maxValue as number;
  const kindAr = kind === "quiet" ? "يوم هادئ" : "أكثر الأيام نشاطًا";
  const kindEn = kind === "quiet" ? "a quiet day" : "the busiest day";
  return {
    id: `scn-${src.category === "LUNAR_ORBIT_RADIATION" ? "lunar-orbit" : "deep-space"}-${kind}-${ds.instrumentId}-${s.day}`,
    category: src.category,
    title: lunar
      ? t(`الإشعاع في مدار القمر — ${kindAr} (${s.day})`, `Radiation in lunar orbit — ${kindEn} (${s.day})`)
      : t(`الإشعاع في الفضاء العميق — ${kindAr} (${s.day})`, `Radiation in deep space — ${kindEn} (${s.day})`),
    description: lunar
      ? t(
          `جهاز CRaTER على المركبة LRO، التي تدور حول القمر، سجّل في هذا اليوم قراءات وصلت إلى ${v} ${unit.unit}. هذه قراءة الجهاز في المدار، وليست على سطح القمر، وليست جرعة رائد فضاء.`,
          `The CRaTER detector on LRO, a spacecraft orbiting the Moon, recorded readings up to ${v} ${unit.unit} on this day. This is the detector's reading in orbit — not on the Moon's surface, and not an astronaut's dose.`,
        )
      : t(
          `جهاز BPD على المركبة بيوسنتينل، التي تدور حول الشمس بعيدًا عن الأرض والقمر، سجّل قراءات وصلت إلى ${v} ${unit.unit}. هذه ليست قراءة عند القمر؛ نستخدمها للمقارنة فقط.`,
          `The BPD detector on BioSentinel, a spacecraft orbiting the Sun far from Earth and the Moon, recorded readings up to ${v} ${unit.unit}. This is not a reading at the Moon; we use it for comparison only.`,
        ),
    classification: "historical-observation",
    observationContext: lunar ? "lunar-orbit" : "heliocentric-1au",
    contextDescription: lunar
      ? t(
          "مدار القمر، على متن LRO (Lunar Reconnaissance Orbiter). ليس سطح القمر، وليس قاعدة سيليني-1.",
          "Lunar orbit, aboard LRO (Lunar Reconnaissance Orbiter). Not the lunar surface and not the SELENE-1 base.",
        )
      : t(
          "مدار حول الشمس على بعد نحو وحدة فلكية واحدة، على متن بيوسنتينل. ليس قرب القمر.",
          "Heliocentric orbit at about 1 AU, aboard BioSentinel. Not near the Moon.",
        ),
    source,
    sourceRecords: [{ id: recordId, recordType: "RADLAB_MEASUREMENT", timestamp: s.maxTimestamp, url: null, availableOffline: true }],
    observationDate: s.day,
    observationWindow: null,
    measurements: [{ name: "absorbed_dose_rate", value: v, unit: unit.unit, unitSource: unit.source, recordId, derivation: "selected-daily-maximum" }],
    missingMeasurements: [
      {
        name: "dose_equivalent_rate",
        reason: t("الجهاز لا يقدّم هذه القيمة في RadLab، ولا نحسبها من الجرعة الممتصة.", "The instrument does not report this value in RadLab, and we do not calculate it from absorbed dose."),
      },
      { name: "flux", reason: t("الجهاز لا يقدّم تدفق الجسيمات في RadLab.", "The instrument does not report particle flux in RadLab.") },
    ],
    dataQuality: {
      sourceIndicators: {
        instrumentId: ds.instrumentId,
        spacecraft: ds.spacecraft,
        trajectory: ds.trajectory,
        recordsInDay: s.records,
        validValuesInDay: s.validValues,
        nullValuesInDay: s.nullValues,
        invalidValuesExcluded: s.invalidValues,
        zeroFlaggedInDay: s.zeroFlagged,
        selection: kind === "quiet" ? "day with the lowest daily maximum in the dataset" : "day containing the dataset's highest value",
      },
      ...NO_CONFIDENCE,
      uncertainties: [
        t("المنطقة الزمنية للتوقيت غير مؤكدة (افتراض UTC).", "The timestamp timezone is unconfirmed (UTC assumed)."),
        t("مادة الكاشف غير معروفة من المصدر.", "The detector material is unknown from the source."),
        ...(s.zeroFlagged
          ? [t(`في هذا اليوم ${s.zeroFlagged} قراءة صفرية مُعلَّمة؛ لا تعني انعدام الإشعاع.`, `This day has ${s.zeroFlagged} flagged zero readings; they do not mean no radiation.`)]
          : []),
      ],
    },
    limitations: [
      lunar
        ? t("قياس في مدار القمر، وليس على سطحه.", "A measurement in lunar orbit, not on the surface.")
        : t("قياس في الفضاء حول الشمس، وليس عند القمر.", "A measurement in space around the Sun, not at the Moon."),
      t("أعلى قيمة في اليوم مختارة من سجل واحد محدد؛ لم نحسب متوسطًا.", "The day's highest value is copied from one identified record; no average was calculated."),
      ...COMMON_LIMITS.radiation,
      ...COMMON_LIMITS.notLive,
    ],
    educationalObjective: lunar
      ? t("أن يعرف الطفل أن العلماء يقيسون الإشعاع حول القمر بأجهزة على مركبات تدور حوله.", "Learn that scientists measure radiation around the Moon with detectors on orbiting spacecraft.")
      : t("أن يقارن الطفل بين أماكن مختلفة في الفضاء، ويعرف أن لكل قراءة مكانًا محددًا.", "Compare different places in space, and learn that every reading belongs to a specific place."),
    decisionOptions: RADIATION_DECISIONS,
    expectedLearningOutcome: t(
      "الطفل يسأل دائمًا: أين قيس الرقم؟ وبأي جهاز؟ ويعرف أن قراءة الجهاز ليست جرعة في جسم إنسان.",
      "The child always asks: where was the number measured? By which detector? And knows that a detector reading is not a dose in a human body.",
    ),
    whatIf: RADIATION_WHATIF,
    relations: [],
  };
}

/** Quiet-day and busiest-day scenarios for one approved RadLab dataset (deterministic; ties → earliest day). */
export function radlabScenarios(ds: RadLabDatasetFile): ScientificScenario[] {
  const src = RADLAB_SCENARIO_SOURCES[ds.instrumentId];
  if (!src) throw new Error(`not an approved RadLab instrument: ${ds.instrumentId}`);
  if (ds.spacecraft !== src.spacecraft || ds.trajectory !== src.trajectory) throw new Error(`${ds.instrumentId}: unexpected provenance ${ds.spacecraft} / ${ds.trajectory}`);
  if (!ds.units?.absorbed_dose_rate?.unit) throw new Error(`${ds.instrumentId}: absorbed_dose_rate unit missing from dataset`);
  const days = dailyStats(ds).filter((d) => d.maxValue !== null);
  if (!days.length) return [];
  let quiet = days[0];
  let peak = days[0];
  for (const d of days) {
    if ((d.maxValue as number) < (quiet.maxValue as number)) quiet = d;
    if ((d.maxValue as number) > (peak.maxValue as number)) peak = d;
  }
  const endpoint = ds.source.api;
  return quiet.day === peak.day ? [scenarioFor(ds, peak, "peak", endpoint)] : [scenarioFor(ds, quiet, "quiet", endpoint), scenarioFor(ds, peak, "peak", endpoint)];
}
