// WP06.4 — Solar-event scenarios (CME, SEP, FLR) from the offline NASA DONKI dataset ONLY.
// Values are copied from DONKI records; nothing is filled in. RadLab data is never used here.
import type { DONKIEvent, DONKIMetadata } from "../donki/donki.ts";
import {
  t,
  type DataQuality,
  type MissingMeasurement,
  type ScenarioMeasurement,
  type ScientificScenario,
  type SourceRecordRef,
  type SourceRef,
} from "./types.ts";
import { COMMON_LIMITS, NO_CONFIDENCE, SOLAR_WHATIF } from "./common.ts";

export const DONKI_EVENTS_FILE = "public/data/donki/events.json";
/** CME analysis units as documented by NASA CCMC for DONKI (the API response itself carries no units). */
export const CME_UNIT_SOURCE = "NASA CCMC DONKI CME analysis convention (speed in km/s; latitude, longitude and half-angle in degrees): https://ccmc.gsfc.nasa.gov/tools/DONKI/";

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const day = (iso: string) => iso.slice(0, 10);

function sourceRef(meta: DONKIMetadata, type: "CME" | "SEP" | "FLR"): SourceRef {
  return {
    dataset: "DONKI",
    provider: meta.source.provider,
    endpoint: meta.source.endpoints[type],
    file: DONKI_EVENTS_FILE,
    retrievedAt: meta.retrievedAt,
    dataVersion: meta.dataVersion,
  };
}

const recordRef = (e: DONKIEvent): SourceRecordRef => ({ id: e.id, recordType: e.eventType, timestamp: e.eventDate, url: e.sourceUrl, availableOffline: true });

function quality(e: DONKIEvent, extra: Record<string, string | number | boolean | string[]> = {}): DataQuality {
  return {
    sourceIndicators: {
      donkiLevel: e.dataQuality.level,
      donkiBasis: e.dataQuality.basis,
      missingOptionalFields: e.dataQuality.missingOptionalFields,
      ...extra,
    },
    ...NO_CONFIDENCE,
    uncertainties: e.dataQuality.notes.map((n) => t(`ملاحظة من بيانات ناسا: ${n}`, `Note from the NASA record: ${n}`)),
  };
}

/* ---------------- SEP ---------------- */

export function sepScenario(e: DONKIEvent, meta: DONKIMetadata): ScientificScenario {
  const model = e.dataQuality.basis === "model";
  const instruments = e.instruments.length ? e.instruments.join("; ") : "—";
  const linked = (e.observed.linkedEventIds as string[] | undefined) ?? [];
  const missing: MissingMeasurement[] = [
    {
      name: "particle_flux",
      reason: t(
        "سجلّ SEP في DONKI يذكر الجهاز وقناة الطاقة فقط، ولا يحتوي على قيمة لتدفق الجسيمات.",
        "The DONKI SEP record names the instrument and energy channel only; it contains no particle-flux value.",
      ),
    },
  ];
  return {
    id: `scn-sep-${e.id}`,
    category: "SEP",
    title: model
      ? t(`جسيمات شمسية نشطة (من نموذج) — ${e.eventDate}`, `Solar energetic particles (model) — ${e.eventDate}`)
      : t(`جسيمات شمسية نشطة رُصدت — ${e.eventDate}`, `Solar energetic particles detected — ${e.eventDate}`),
    description: model
      ? t(
          `سجّلت ناسا هذا الحدث من نموذج حاسوبي للتنبؤ (${instruments})، وليس من قياس مباشر.`,
          `NASA recorded this event from a forecast model (${instruments}), not from a direct measurement.`,
        )
      : t(
          `رصد الجهاز ${instruments} ارتفاعًا في الجسيمات الشمسية النشطة. هذا قياس من مركبة فضائية، وليس قياسًا على القمر.`,
          `The instrument ${instruments} detected a rise in solar energetic particles. This was measured by a spacecraft, not on the Moon.`,
        ),
    classification: model ? "historical-model-output" : "historical-observation",
    observationContext: "near-earth-and-inner-heliosphere",
    contextDescription: t(
      "رصدته مركبات فضائية قرب الأرض أو في الفضاء بين الكواكب (حسب الجهاز المذكور). ليس قياسًا على القمر ولا في قاعدة سيليني-1.",
      "Observed by spacecraft near Earth or in interplanetary space (see the listed instrument). Not a measurement at the Moon or at the SELENE-1 base.",
    ),
    source: sourceRef(meta, "SEP"),
    sourceRecords: [recordRef(e)],
    observationDate: day(e.eventDate),
    observationWindow: null,
    measurements: [],
    missingMeasurements: missing,
    dataQuality: quality(e, { instruments: e.instruments, nasaLinkedEvents: linked.length }),
    limitations: [
      ...(model ? [t("هذا السجل ناتج عن نموذج تنبؤ، وليس قياسًا مباشرًا.", "This record comes from a forecast model, not a direct measurement.")] : []),
      t("لا يحتوي السجل على قيمة لشدة الإشعاع أو الجرعة.", "The record contains no radiation intensity or dose value."),
      ...COMMON_LIMITS.notLive,
    ],
    educationalObjective: t(
      "أن يعرف الطفل أن الشمس قد تطلق جسيمات سريعة جدًا، وأن العلماء يرصدونها بأجهزة على مركبات فضائية.",
      "Learn that the Sun can release very fast particles, and that scientists detect them with instruments on spacecraft.",
    ),
    decisionOptions: SOLAR_DECISIONS,
    expectedLearningOutcome: t(
      "الطفل يميّز بين خبر علمي (رصد حدث) وبين ما يحدث فعلًا في مكان آخر مثل القمر.",
      "The child can tell the difference between a science report (an event was detected) and what actually happens somewhere else, such as the Moon.",
    ),
    whatIf: SOLAR_WHATIF,
    relations: linked.length
      ? [
          {
            kind: "nasa-linked-events",
            recordIds: linked,
            statement: t("ناسا (DONKI) تربط هذه الأحداث بهذا الحدث. الربط كما ورد من ناسا.", "NASA DONKI lists these events as linked to this one. The link is copied as NASA gives it."),
          },
        ]
      : [],
  };
}

/* ---------------- CME ---------------- */

const CME_FIELDS: { key: string; name: string; unit: string }[] = [
  { key: "speed", name: "cme_speed", unit: "km/s" },
  { key: "halfAngle", name: "cme_half_angle", unit: "deg" },
  { key: "latitude", name: "cme_latitude", unit: "deg" },
  { key: "longitude", name: "cme_longitude", unit: "deg" },
];

export function cmeScenario(e: DONKIEvent, meta: DONKIMetadata): ScientificScenario {
  const a = (e.observed.mostAccurateAnalysis as Record<string, unknown> | undefined) ?? null;
  const measurements: ScenarioMeasurement[] = [];
  const missing: MissingMeasurement[] = [];
  for (const f of CME_FIELDS) {
    const v = a?.[f.key];
    if (isNum(v)) measurements.push({ name: f.name, value: v, unit: f.unit, unitSource: CME_UNIT_SOURCE, recordId: e.id, derivation: "as-recorded" });
    else
      missing.push({
        name: f.name,
        reason: a
          ? t("القيمة غير موجودة أو غير صالحة في تحليل ناسا الأدق.", "The value is absent or invalid in NASA's most accurate analysis.")
          : t("لا يوجد تحليل مُعلَّم بأنه الأدق في هذا السجل.", "The record has no analysis flagged as the most accurate."),
      });
  }
  const linked = (e.observed.linkedEventIds as string[] | undefined) ?? [];
  const speed = measurements.find((m) => m.name === "cme_speed");
  return {
    id: `scn-cme-${e.id}`,
    category: "CME",
    title: t(`انبعاث كتلي إكليلي من الشمس — ${e.eventDate}`, `Coronal mass ejection from the Sun — ${e.eventDate}`),
    description: speed
      ? t(
          `قذفت الشمس سحابة ضخمة من الغاز المشحون. قدّرت ناسا سرعتها بنحو ${speed.value} كم/ث.`,
          `The Sun threw out a huge cloud of charged gas. NASA estimated its speed at about ${speed.value} km/s.`,
        )
      : t("قذفت الشمس سحابة ضخمة من الغاز المشحون. السرعة غير متوفرة في السجل.", "The Sun threw out a huge cloud of charged gas. Its speed is not available in the record."),
    classification: "historical-observation",
    observationContext: "solar-corona",
    contextDescription: t(
      `رُصد بأجهزة تصوير الهالة الشمسية${e.sourceLocation ? ` (موقع المصدر على الشمس: ${e.sourceLocation})` : ""}. هذا حدث على الشمس، وليس قياسًا للإشعاع على القمر.`,
      `Seen by coronagraphs${e.sourceLocation ? ` (source location on the Sun: ${e.sourceLocation})` : ""}. This is an event on the Sun, not a radiation measurement at the Moon.`,
    ),
    source: sourceRef(meta, "CME"),
    sourceRecords: [recordRef(e)],
    observationDate: day(e.eventDate),
    observationWindow: null,
    measurements,
    missingMeasurements: missing,
    dataQuality: quality(e, { instruments: e.instruments, analysisType: typeof a?.type === "string" ? a.type : "unavailable", nasaLinkedEvents: linked.length }),
    limitations: [
      t("السرعة والزوايا تقديرات من تحليل ناسا للصور، وليست قياسًا مباشرًا عند القمر.", "Speed and angles are estimates from NASA's image analysis, not direct measurements at the Moon."),
      t("الانبعاث الكتلي لا يعني تلقائيًا خطرًا على قاعدة قمرية.", "A CME does not automatically mean a threat to a lunar base."),
      ...COMMON_LIMITS.notLive,
    ],
    educationalObjective: t(
      "أن يتعرّف الطفل على الانبعاثات الكتلية الإكليلية وكيف يقدّر العلماء سرعتها من الصور.",
      "Learn what coronal mass ejections are and how scientists estimate their speed from images.",
    ),
    decisionOptions: SOLAR_DECISIONS,
    expectedLearningOutcome: t(
      "الطفل يعرف أن أرقام السرعة تقديرات علمية لها حدود، وأن الحدث على الشمس قد لا يصل إلى القمر.",
      "The child knows that speed numbers are scientific estimates with limits, and that an event on the Sun may not reach the Moon.",
    ),
    whatIf: SOLAR_WHATIF,
    relations: linked.length
      ? [
          {
            kind: "nasa-linked-events",
            recordIds: linked,
            statement: t("ناسا (DONKI) تربط هذه الأحداث بهذا الانبعاث. الربط كما ورد من ناسا.", "NASA DONKI lists these events as linked to this CME. The link is copied as NASA gives it."),
          },
        ]
      : [],
  };
}

/* ---------------- FLR (records referenced, details unavailable) ---------------- */

const FLR_ID = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}-FLR-\d{3}$/;

/** FLR ids that DONKI CME/SEP records reference via linkedEvents, sorted. */
export function referencedFlareIds(events: DONKIEvent[]): string[] {
  const ids = new Set<string>();
  for (const e of events) for (const l of (e.observed.linkedEventIds as string[] | undefined) ?? []) if (FLR_ID.test(l)) ids.add(l);
  return [...ids].sort();
}

export function flareScenario(events: DONKIEvent[], meta: DONKIMetadata): ScientificScenario | null {
  const stored = events.filter((e) => e.eventType === "FLR");
  const ids = referencedFlareIds(events);
  if (stored.length || !ids.length) return null; // only the "referenced but unavailable" case is modelled in V1
  const flr = meta.validation.perType.FLR;
  const dates = ids.map((id) => FLR_ID.exec(id)![1]);
  return {
    id: "scn-flr-referenced-unavailable",
    category: "FLR",
    title: t("التوهجات الشمسية: أسماء بلا تفاصيل", "Solar flares: names without details"),
    description: t(
      `تذكر سجلات ناسا ${ids.length} توهجًا شمسيًا بالاسم، لكن تفاصيلها (مثل قوة التوهج) غير متوفرة لدينا، لأن خدمة التوهجات في ناسا لم تستجب.`,
      `NASA records mention ${ids.length} solar flares by name, but their details (such as flare class) are not available to us, because NASA's flare service did not respond.`,
    ),
    classification: "historical-reference-only",
    observationContext: "solar-corona",
    contextDescription: t("التوهجات تحدث على سطح الشمس. لا توجد هنا أي قياسات لها.", "Flares happen on the Sun. No measurements of them are available here."),
    source: sourceRef(meta, "FLR"),
    sourceRecords: ids.map((id) => ({ id, recordType: "FLR" as const, timestamp: null, url: null, availableOffline: false })),
    observationDate: dates[0],
    observationWindow: { start: dates[0], end: dates[dates.length - 1] },
    measurements: [],
    missingMeasurements: ["flare_class", "begin_time", "peak_time", "end_time", "source_location"].map((name) => ({
      name,
      reason: t(
        `خدمة FLR في ناسا أعادت الخطأ HTTP ${flr?.httpStatus ?? "?"}؛ لذلك لا تتوفر هذه القيمة.`,
        `NASA's FLR service returned HTTP ${flr?.httpStatus ?? "?"}, so this value is not available.`,
      ),
    })),
    dataQuality: {
      sourceIndicators: {
        flrEndpointOk: Boolean(flr?.ok),
        flrHttpStatus: flr?.httpStatus ?? "unknown",
        referencedFlareIds: ids.length,
        storedFlareRecords: 0,
      },
      ...NO_CONFIDENCE,
      uncertainties: [
        t(
          "التواريخ مأخوذة من بداية معرّف ناسا لكل توهج (صيغة DONKI)، وليست من سجل التوهج نفسه.",
          "Dates are read from the start of each NASA flare ID (DONKI's ID format), not from the flare record itself.",
        ),
      ],
    },
    limitations: [
      t("لا يوجد أي قياس للتوهجات في هذه البيانات.", "There is no flare measurement in this data."),
      t("قوة التوهج (مثل X أو M) ليست جرعة إشعاع.", "A flare class (such as X or M) is not a radiation dose."),
      ...COMMON_LIMITS.notLive,
    ],
    educationalObjective: t(
      "أن يفهم الطفل أن العلماء أحيانًا لا يملكون كل البيانات، وأن الأمانة تعني قول «لا نعرف» بدل التخمين.",
      "Understand that scientists sometimes do not have all the data, and that honesty means saying “we don't know” instead of guessing.",
    ),
    decisionOptions: [
      {
        id: "guess",
        label: t("نخمّن قوة التوهجات", "Guess how strong the flares were"),
        educationalConsequence: t("التخمين قد يبدو مفيدًا، لكنه قد يكون خطأ. العلماء لا يكتبون أرقامًا لم يقيسوها.", "A guess may feel helpful, but it can be wrong. Scientists don't write numbers they didn't measure."),
      },
      {
        id: "mark-missing",
        label: t("نكتب «البيانات غير متوفرة»", "Write “data not available”"),
        educationalConsequence: t("أحسنت! هذا ما يفعله العلماء: يحددون ما هو معروف وما هو مفقود.", "Well done! This is what scientists do: they mark what is known and what is missing."),
      },
      {
        id: "find-another-source",
        label: t("نبحث عن مصدر آخر موثوق", "Look for another trusted source"),
        educationalConsequence: t("فكرة ذكية! يمكن البحث عن مصدر رسمي آخر، مع ذكر مصدر كل رقم.", "Smart idea! We can look for another official source, and name the source of every number."),
      },
    ],
    expectedLearningOutcome: t("الطفل يعرف أن البيانات المفقودة تبقى مفقودة، وأن ذكر المصدر جزء من العلم.", "The child knows that missing data stays missing, and that naming sources is part of science."),
    whatIf: {
      ...SOLAR_WHATIF,
      question: t("ماذا لو عرفنا قوة هذه التوهجات؟ ماذا سنتعلّم؟", "What if we knew how strong these flares were? What would we learn?"),
    },
    relations: [],
  };
}

/* ---------------- shared solar decision options ---------------- */

export const SOLAR_DECISIONS = [
  {
    id: "check-data",
    label: t("نراجع بيانات ناسا أولًا", "Check NASA's data first"),
    educationalConsequence: t(
      "قرار علمي! نعرف أين قيس الحدث، ومن رصده، وهل هو قياس أم تقدير.",
      "A scientific choice! We learn where the event was measured, who detected it, and whether it is a measurement or an estimate.",
    ),
  },
  {
    id: "precaution",
    label: t("نستعد احتياطيًا ونتابع الأخبار", "Get ready as a precaution and keep watching"),
    educationalConsequence: t(
      "الاستعداد المبكر عادة جيدة في الفضاء. لكن تذكّر: رصد حدث على الشمس لا يعني أنه وصل إلى القمر.",
      "Getting ready early is a good habit in space. But remember: an event seen on the Sun does not mean it reached the Moon.",
    ),
  },
  {
    id: "ignore",
    label: t("نتجاهله لأنه بعيد", "Ignore it because it's far away"),
    educationalConsequence: t(
      "الشمس بعيدة، لكن جسيماتها قد تسافر بسرعة كبيرة. لذلك يتابع رواد الفضاء الطقس الفضائي دائمًا.",
      "The Sun is far away, but its particles can travel very fast. That's why astronauts always keep an eye on space weather.",
    ),
  },
];

/** All DONKI scenarios, deterministic order: SEP (all), CME (only those NASA links to an SEP event), FLR (if applicable). */
export function donkiScenarios(events: DONKIEvent[], meta: DONKIMetadata): ScientificScenario[] {
  const sep = events.filter((e) => e.eventType === "SEP");
  const sepLinked = new Set(sep.flatMap((e) => (e.observed.linkedEventIds as string[] | undefined) ?? []));
  const cme = events.filter(
    (e) => e.eventType === "CME" && (sepLinked.has(e.id) || ((e.observed.linkedEventIds as string[] | undefined) ?? []).some((l) => /-SEP-\d{3}$/.test(l))),
  );
  const flr = flareScenario(events, meta);
  return [...sep.map((e) => sepScenario(e, meta)), ...cme.map((e) => cmeScenario(e, meta)), ...(flr ? [flr] : [])];
}
