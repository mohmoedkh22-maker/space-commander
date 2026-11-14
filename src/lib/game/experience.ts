// V0.5 gameplay-experience DATA: dynamic events, facility inspections & clues, mission intros and
// chapter results. Pure functions that READ the engine state (and reuse engine functions);
// no simulation math is duplicated here.
import { ILLUMINATION } from "@/lib/nasa/illumination";
import { BATTERY_CAP_KWH, LOADS, SCENARIO_LIGHT_FACTOR, THRESHOLDS, WATER } from "./config";
import { DECISIONS } from "./decisions";
import { suhailLines } from "./dialogue";
import { applyDecision, lockReason, runDay, simulate, solarForDay, STEPS } from "./engine";
import { MISSIONS } from "./missions";
import type { Choices, CrewId, DecisionId, GameState, MissionId, ResourceId, Resources, T } from "./types";

const t = (ar: string, en: string): T => ({ ar, en });
const r = (n: number) => Math.round(n);

export type Speaker = "suhail" | CrewId;
export interface Line {
  who: Speaker;
  text: T;
}
/** facility ids used on the base map */
export type MapFacility = "energy" | "water" | "greenhouse" | "life" | "shelter" | "command";

/* =========================================================================
   DYNAMIC EVENTS — triggered by mission progression or real simulation values
   ========================================================================= */

export interface ExperienceEvent {
  id: "ENERGY_WARNING" | "WATER_WARNING" | "SPACE_WEATHER" | "LOW_RESERVE" | "CROP_DELAY";
  severity: "warning" | "critical";
  /** trigger condition on the authoritative state */
  trigger: (s: GameState) => boolean;
  title: T;
  description: (s: GameState) => T;
  /** visual state: the facility that shows the warning beacon */
  facility: MapFacility;
  dialogue: (s: GameState) => Line[];
  /** what the player can do about it */
  interaction: T;
  /** what it affects */
  consequence: T;
}

const decided = (s: GameState, id: DecisionId) => s.decisionHistory.some((h) => h.decisionId === id);
const todayLightPct = (day: number) => r(ILLUMINATION.fraction * (SCENARIO_LIGHT_FACTOR[day] ?? 1) * 100);

export const EXPERIENCE_EVENTS: ExperienceEvent[] = [
  {
    id: "ENERGY_WARNING",
    severity: "warning",
    trigger: (s) => s.day === 2 && !decided(s, "d1-energy") && (SCENARIO_LIGHT_FACTOR[2] ?? 1) < 0.6,
    title: t("تحذير: توقعات الطاقة الشمسية", "WARNING: Solar energy forecast"),
    description: () =>
      t(
        `الضوء اليوم حوالي ${todayLightPct(2)}% فقط. الألواح ستنتج أقل بكثير مما تحتاجه القاعدة.`,
        `Today's light is only about ${todayLightPct(2)}%. The panels will make far less than the base needs.`,
      ),
    facility: "energy",
    dialogue: (s) => [
      {
        who: "adam",
        text: t(
          `سهيل، وصلت توقعات الإضاءة. البطارية عندها ${r(s.resources.energy)} ك.و.س، والإنتاج اليوم لن يغطي التشغيل المعتاد.`,
          `SUHAIL, the light forecast is in. The battery has ${r(s.resources.energy)} kWh, and today's output won't cover normal operations.`,
        ),
      },
      {
        who: "suhail",
        text: t("أيها القائد، افحص محطة الطاقة قبل أن تقرر. ماذا نحمي أولًا؟", "Commander, inspect the power station before you decide. What do we protect first?"),
      },
    ],
    interaction: t("افحص محطة الطاقة واقرأ توقعات الضوء", "Inspect the power station and read the light forecast"),
    consequence: t("قرارك سيحدد احتياطي البطارية للمهمة القادمة.", "Your decision sets the battery reserve for the next mission."),
  },
  {
    id: "WATER_WARNING",
    severity: "warning",
    trigger: (s) => s.facilities.waterRecycling === "faulty",
    title: t("تحذير: نظام تدوير المياه", "WARNING: Water recycling system"),
    description: (s) =>
      t(
        `الاستعادة انخفضت إلى ${r(s.recyclerEfficiency * 100)}% (الطبيعي ${r(WATER.repairedEfficiency * 100)}%).`,
        `Recovery dropped to ${r(s.recyclerEfficiency * 100)}% (normal is ${r(WATER.repairedEfficiency * 100)}%).`,
      ),
    facility: "water",
    dialogue: (s) => [
      {
        who: "mira",
        text: t(
          `سهيل، نستعيد ماءً أقل من المعتاد — ${r(s.recyclerEfficiency * 100)}% فقط. المزرعة والطاقم يعتمدان عليه.`,
          `SUHAIL, we're recovering less water than usual — only ${r(s.recyclerEfficiency * 100)}%. The greenhouse and the crew depend on it.`,
        ),
      },
      {
        who: "layan",
        text: t(`الخزان فيه ${r(s.resources.water)} لتر. يجب أن نحمي احتياجات الطاقم أولًا.`, `The tank holds ${r(s.resources.water)} L. We must protect the crew's needs first.`),
      },
    ],
    interaction: t("افحص وحدة تدوير المياه وابحث عن السبب", "Inspect the water recycling unit and look for the cause"),
    consequence: t("الماء يؤثر في المحاصيل وفي خطة الطوارئ القادمة.", "Water affects the crops and the coming emergency plan."),
  },
  {
    id: "SPACE_WEATHER",
    severity: "critical",
    trigger: (s) => s.flags.storm,
    title: t("طوارئ: تحذير طقس فضائي (سيناريو تدريبي)", "EMERGENCY: Space-weather warning (training scenario)"),
    description: () =>
      t("الأنشطة الخارجية متوقفة. يجب أن يصل الطاقم إلى المأوى المحمي.", "Outside activities are suspended. The crew must reach the protected shelter."),
    facility: "shelter",
    dialogue: (s) => [
      {
        who: "rashed",
        text:
          s.facilities.shelter === "active"
            ? t("المأوى نشط والطاقم في الداخل. الآن نخطط للموارد.", "The shelter is active and the crew is inside. Now we plan our resources.")
            : t("أوقفت العمل الخارجي. المأوى يحتاج تأكيد الجاهزية قبل أن ندخل.", "I've stopped outside work. The shelter needs a readiness check before we go in."),
      },
      {
        who: "layan",
        text: t("أولويتي أن تبقى الأنظمة الحيوية تعمل طوال الوقت.", "My priority is keeping vital systems running the whole time."),
      },
    ],
    interaction: t("أكمل خطوات السلامة الأربع وافحص المأوى", "Complete the four safety steps and inspect the shelter"),
    consequence: t("لن تُفتح خطط التشغيل قبل حماية الطاقم.", "No operating plan unlocks until the crew is protected."),
  },
  {
    id: "LOW_RESERVE",
    severity: "warning",
    trigger: (s) => decided(s, "d1-energy") && s.resources.energy < THRESHOLDS.lowEnergy,
    title: t("تنبيه: احتياطي البطارية منخفض", "ALERT: Low battery reserve"),
    description: (s) =>
      t(
        `البطارية ${r(s.resources.energy)} ك.و.س من ${BATTERY_CAP_KWH}. بعض الخطط تحتاج ${THRESHOLDS.boostMinEnergy} على الأقل.`,
        `Battery ${r(s.resources.energy)} of ${BATTERY_CAP_KWH} kWh. Some plans need at least ${THRESHOLDS.boostMinEnergy}.`,
      ),
    facility: "energy",
    dialogue: (s) => [
      {
        who: "adam",
        text: t(
          `يا قائد، الاحتياطي عند ${r(s.resources.energy)} ك.و.س. خياراتنا للطاقة أضيق الآن.`,
          `Commander, the reserve is at ${r(s.resources.energy)} kWh. Our energy options are tighter now.`,
        ),
      },
    ],
    interaction: t("افحص محطة الطاقة", "Inspect the power station"),
    consequence: t("بعض الخيارات قد تكون مقفلة.", "Some options may be locked."),
  },
  {
    id: "CROP_DELAY",
    severity: "warning",
    trigger: (s) => decided(s, "d1-energy") && s.facilities.greenhouse !== "thriving" && s.resources.food < 50,
    title: t("تنبيه: نمو المحاصيل متأخر", "ALERT: Crop growth delayed"),
    description: (s) => t(`المحاصيل عند ${r(s.resources.food)}% فقط.`, `Crops are only at ${r(s.resources.food)}%.`),
    facility: "greenhouse",
    dialogue: (s) => [
      {
        who: "mira",
        text: t(
          `المحاصيل عند ${r(s.resources.food)}%. تحتاج ضوءًا وماءً ووقتًا لتلحق.`,
          `The crops are at ${r(s.resources.food)}%. They need light, water and time to catch up.`,
        ),
      },
    ],
    interaction: t("افحص المزرعة", "Inspect the greenhouse"),
    consequence: t("الغذاء جزء من أهداف المهمة.", "Food is one of the mission goals."),
  },
];

/** Events active in this state, most severe first. */
export function activeEvents(s: GameState): ExperienceEvent[] {
  return EXPERIENCE_EVENTS.filter((e) => e.trigger(s)).sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));
}

/* =========================================================================
   FACILITY INSPECTION — condition, resources, crew report, SUHAIL, clues
   ========================================================================= */

export interface Clue {
  id: string;
  missions: MissionId[];
  action: T;
  reveal: (s: GameState) => T;
}

export interface FacilityInspection {
  id: Exclude<MapFacility, "command">;
  owner: CrewId;
  resources: ResourceId[];
  condition: (s: GameState) => { text: T; level: "ok" | "warn" | "crit" };
  report: (s: GameState) => T;
  clues: Clue[];
}

export const INSPECTIONS: Record<FacilityInspection["id"], FacilityInspection> = {
  energy: {
    id: "energy",
    owner: "adam",
    resources: ["energy"],
    condition: (s) =>
      s.facilities.powerStation === "low-reserve"
        ? { text: t("احتياطي منخفض", "Low reserve"), level: "warn" }
        : { text: t("يعمل طبيعيًا", "Nominal"), level: "ok" },
    report: (s) =>
      t(
        `البطارية ${r(s.resources.energy)} من ${BATTERY_CAP_KWH} ك.و.س. أراقب الإنتاج والأحمال.`,
        `Battery ${r(s.resources.energy)} of ${BATTERY_CAP_KWH} kWh. I'm watching output and loads.`,
      ),
    clues: [
      {
        id: "energy-forecast",
        missions: [1],
        action: t("اقرأ توقعات الضوء", "Read the light forecast"),
        reveal: (s) =>
          t(
            `ضوء اليوم حوالي ${todayLightPct(2)}% بدل 88% المعتادة (متوسط ناسا). الألواح ستنتج حوالي ${r(solarForDay(2, s.performanceFactor).energyKWh)} ك.و.س بدل ${r(solarForDay(1, s.performanceFactor).energyKWh)}.`,
            `Today's light is about ${todayLightPct(2)}% instead of the usual 88% (NASA average). The panels will make about ${r(solarForDay(2, s.performanceFactor).energyKWh)} kWh instead of ${r(solarForDay(1, s.performanceFactor).energyKWh)}.`,
          ),
      },
      {
        id: "energy-battery",
        missions: [1, 2, 3],
        action: t("افحص البطاريات", "Check the batteries"),
        reveal: (s) =>
          t(
            `البطارية ${r(s.resources.energy)} ك.و.س. التشغيل الكامل يحتاج حوالي ${LOADS.lifeSupport + LOADS.recycler + LOADS.greenhouse.full + LOADS.research} ك.و.س يوميًا.`,
            `The battery holds ${r(s.resources.energy)} kWh. Full operations need about ${LOADS.lifeSupport + LOADS.recycler + LOADS.greenhouse.full + LOADS.research} kWh a day.`,
          ),
      },
    ],
  },
  water: {
    id: "water",
    owner: "mira",
    resources: ["water"],
    condition: (s) =>
      s.facilities.waterRecycling === "faulty"
        ? { text: t("فيه عطل", "Fault detected"), level: "crit" }
        : s.facilities.waterRecycling === "boosted"
          ? { text: t("يعمل بقوة إضافية", "Boosted"), level: "warn" }
          : s.facilities.waterRecycling === "repaired"
            ? { text: t("تم إصلاحه", "Repaired"), level: "ok" }
            : { text: t("يعمل طبيعيًا", "Nominal"), level: "ok" },
    report: (s) =>
      t(
        `الخزان ${r(s.resources.water)} لتر، والاستعادة ${r(s.recyclerEfficiency * 100)}%.`,
        `Tank ${r(s.resources.water)} L, recovery ${r(s.recyclerEfficiency * 100)}%.`,
      ),
    clues: [
      {
        id: "water-sensor",
        missions: [2],
        action: t("اقرأ حساس الاستعادة", "Read the recovery sensor"),
        reveal: (s) =>
          t(
            `الحساس يقول ${r(s.recyclerEfficiency * 100)}% بدل ${r(WATER.repairedEfficiency * 100)}%. الطاقم يستخدم ${WATER.crewUse} لترًا يوميًا.`,
            `The sensor reads ${r(s.recyclerEfficiency * 100)}% instead of ${r(WATER.repairedEfficiency * 100)}%. The crew uses ${WATER.crewUse} L a day.`,
          ),
      },
      {
        id: "water-filter",
        missions: [2],
        action: t("افحص المرشّح والأنابيب", "Inspect the filter and pipes"),
        reveal: () =>
          t(
            `ضغط الماء ينخفض عند المرشّح — قد يكون مسدودًا. الإصلاح يحتاج ${LOADS.repair} ك.و.س ويوم عمل.`,
            `Water pressure drops at the filter — it may be clogged. A repair needs ${LOADS.repair} kWh and a day of work.`,
          ),
      },
      {
        id: "water-tank",
        missions: [1, 3],
        action: t("افحص الخزان", "Check the tank"),
        reveal: (s) => t(`الخزان فيه ${r(s.resources.water)} لتر.`, `The tank holds ${r(s.resources.water)} L.`),
      },
    ],
  },
  greenhouse: {
    id: "greenhouse",
    owner: "mira",
    resources: ["food", "water"],
    condition: (s) =>
      s.facilities.greenhouse === "thriving"
        ? { text: t("مزدهرة", "Thriving"), level: "ok" }
        : s.facilities.greenhouse === "reduced"
          ? { text: t("تشغيل معتدل", "Moderate"), level: "warn" }
          : { text: t("شبه متوقفة", "Dormant"), level: "warn" },
    report: (s) =>
      t(
        `المحاصيل ${r(s.resources.food)}%. الأضواء الآن على مستوى "${{ full: "كامل", reduced: "معتدل", minimal: "أدنى" }[s.policy.greenhouse]}".`,
        `Crops at ${r(s.resources.food)}%. Grow lights are on "${s.policy.greenhouse}".`,
      ),
    clues: [
      {
        id: "greenhouse-lights",
        missions: [1],
        action: t("افحص أضواء النمو", "Check the grow lights"),
        reveal: () =>
          t(
            `الأضواء تستهلك ${LOADS.greenhouse.full} ك.و.س كاملة، ${LOADS.greenhouse.reduced} معتدلة، ${LOADS.greenhouse.minimal} في الحد الأدنى.`,
            `Grow lights use ${LOADS.greenhouse.full} kWh at full, ${LOADS.greenhouse.reduced} moderate, ${LOADS.greenhouse.minimal} at minimum.`,
          ),
      },
      {
        id: "greenhouse-water",
        missions: [2, 3],
        action: t("افحص ري المزرعة", "Check greenhouse watering"),
        reveal: (s) =>
          t(
            `المزرعة تستهلك ${WATER.greenhouseNet[s.policy.greenhouse]} لترًا يوميًا الآن. المحاصيل ${r(s.resources.food)}%.`,
            `The greenhouse uses ${WATER.greenhouseNet[s.policy.greenhouse]} L a day right now. Crops are at ${r(s.resources.food)}%.`,
          ),
      },
    ],
  },
  life: {
    id: "life",
    owner: "layan",
    resources: ["oxygen", "energy"],
    condition: (s) =>
      s.facilities.lifeSupport === "strained"
        ? { text: t("تحت ضغط", "Under strain"), level: "crit" }
        : { text: t("يعمل طبيعيًا", "Nominal"), level: "ok" },
    report: (s) => t(`الأكسجين ${r(s.resources.oxygen)}%. الطاقم مرتاح.`, `Oxygen ${r(s.resources.oxygen)}%. The crew is comfortable.`),
    clues: [
      {
        id: "life-minimum",
        missions: [1, 2, 3],
        action: t("اقرأ الحد الأدنى للتشغيل", "Read the minimum requirement"),
        reveal: () =>
          t(
            `دعم الحياة يحتاج ${LOADS.lifeSupport} ك.و.س يوميًا ولا يُطفأ أبدًا — سهيل يطفئ الأنظمة الأخرى أولًا إذا نقصت الكهرباء.`,
            `Life support needs ${LOADS.lifeSupport} kWh a day and is never switched off — SUHAIL turns other systems off first if power runs short.`,
          ),
      },
    ],
  },
  shelter: {
    id: "shelter",
    owner: "rashed",
    resources: ["energy"],
    condition: (s) =>
      s.facilities.shelter === "active"
        ? { text: t("نشط — الطاقم في الداخل", "Active — crew inside"), level: "ok" }
        : s.facilities.shelter === "ready"
          ? { text: t("جاهز", "Ready"), level: "ok" }
          : { text: t("في وضع الاستعداد", "Standby"), level: s.flags.storm ? "warn" : "ok" },
    report: (s) =>
      s.flags.storm
        ? t("الدروع سليمة. ننتظر إكمال خطوات السلامة.", "Shielding is intact. Waiting for the safety steps.")
        : t("المأوى جاهز للاستخدام عند الحاجة.", "The shelter is ready if we need it."),
    clues: [
      {
        id: "shelter-power",
        missions: [3],
        action: t("افحص طاقة المأوى", "Check shelter power"),
        reveal: () =>
          t(
            `المأوى يحتاج ${LOADS.shelter} ك.و.س يوميًا أثناء العاصفة، فوق دعم الحياة.`,
            `The shelter needs ${LOADS.shelter} kWh a day during the storm, on top of life support.`,
          ),
      },
    ],
  },
};

export const INSPECTION_ORDER: FacilityInspection["id"][] = ["energy", "water", "greenhouse", "life", "shelter"];

export function cluesFor(mission: MissionId) {
  return INSPECTION_ORDER.flatMap((f) => INSPECTIONS[f].clues.filter((c) => c.missions.includes(mission)).map((c) => ({ facility: f, clue: c })));
}

/** How many clues the commander must find before deciding (investigate first). */
export const CLUES_REQUIRED: Record<MissionId, number> = { 1: 2, 2: 2, 3: 1 };

/* =========================================================================
   MISSION INTROS
   ========================================================================= */

export interface MissionIntro {
  kicker: T;
  title: T;
  objective: T;
  scene: "vanishing-sun" | "water" | "storm";
  lines: (s: GameState) => Line[];
}

export const MISSION_INTROS: Record<MissionId, MissionIntro> = {
  1: {
    kicker: t("المهمة 01 · اليوم 2", "MISSION 01 · DAY 2"),
    title: t("الشمس التي تختفي", "THE VANISHING SUN"),
    objective: t(
      "افحص القاعدة، ثم قرّر كيف نوزّع الطاقة المحدودة دون تعريض دعم الحياة للخطر.",
      "Inspect the base, then decide how to share limited power without putting life support at risk.",
    ),
    scene: "vanishing-sun",
    lines: (s) => [
      { who: "suhail", text: t("صباح اليوم الثاني أيها القائد. انظر إلى الأفق… الشمس منخفضة جدًا.", "Morning of Day 2, Commander. Look at the horizon… the Sun is very low.") },
      {
        who: "adam",
        text: t(
          `الظلال الطويلة تغطي الألواح. لدينا ${r(s.resources.energy)} ك.و.س في البطارية فقط.`,
          `Long shadows are covering the panels. We only have ${r(s.resources.energy)} kWh in the battery.`,
        ),
      },
      { who: "suhail", text: t("هذه أول أزمة لك. لن أقرر عنك — لكن سأساعدك على الفهم.", "This is your first crisis. I won't decide for you — but I'll help you understand.") },
    ],
  },
  2: {
    kicker: t("المهمة 02 · اليوم 3", "MISSION 02 · DAY 3"),
    title: t("القطرة الأخيرة", "THE LAST DROP"),
    objective: t(
      "اكتشف لماذا نفقد الماء، ثم اختر خطة تحمي الطاقم والمزرعة.",
      "Find out why we're losing water, then choose a plan that protects the crew and the greenhouse.",
    ),
    scene: "water",
    lines: (s) => [
      {
        who: "mira",
        text: t(
          `سهيل! مؤشر الاستعادة نزل إلى ${r(s.recyclerEfficiency * 100)}%.`,
          `SUHAIL! The recovery gauge dropped to ${r(s.recyclerEfficiency * 100)}%.`,
        ),
      },
      ...suhailLines(s, "mission-2-alert", 1).map((l) => ({ who: "suhail" as const, text: l.text })),
      { who: "layan", text: t("الطاقم يحتاج الماء كل يوم. لنعرف السبب أولًا.", "The crew needs water every day. Let's find the cause first.") },
    ],
  },
  3: {
    kicker: t("المهمة 03 · اليوم 5", "MISSION 03 · DAY 5"),
    title: t("الإشارة الأخيرة", "THE FINAL SIGNAL"),
    objective: t(
      "احمِ الطاقم أولًا، ثم اختر خطة تشغيل تناسب ما تبقّى من مواردك.",
      "Protect the crew first, then choose an operating plan that fits the resources you have left.",
    ),
    scene: "storm",
    lines: (s) => [
      { who: "rashed", text: t("تنبيه طقس فضائي! أوقفت كل الأعمال الخارجية.", "Space-weather alert! I've stopped all outside work.") },
      {
        who: "suhail",
        text: t(
          `هذا اليوم الذي استعددنا له. لدينا ${r(s.resources.energy)} ك.و.س و${r(s.resources.water)} لتر — نتيجة قراراتك السابقة.`,
          `This is the day we prepared for. We have ${r(s.resources.energy)} kWh and ${r(s.resources.water)} L — the result of your earlier decisions.`,
        ),
      },
      { who: "layan", text: t("السلامة أولًا. ثم الموارد.", "Safety first. Then resources.") },
    ],
  },
};

/* =========================================================================
   DECISION SUPPORT & CHAPTER RESULTS (computed by the engine)
   ========================================================================= */

/** Today's operating cost of an option, computed by actually simulating the day with the engine. */
export function optionCost(s: GameState, decisionId: DecisionId, optionId: string): { solarKWh: number; useKWh: number; shed: string[] } | null {
  if (lockReason(s, decisionId, optionId)) return null;
  const day = runDay(applyDecision(s, decisionId, optionId));
  const log = day.log[day.log.length - 1];
  return { solarKWh: log.solarKWh, useKWh: log.loadKWh, shed: log.shed };
}

const NEXT_DECISION: Record<MissionId, DecisionId | null> = { 1: "d2-water", 2: "d3-emergency", 3: null };
const CHAPTER_START: Record<MissionId, number> = { 1: 0, 2: STEPS.indexOf("evt-fault"), 3: STEPS.indexOf("evt-storm") };
const CHAPTER_END: Record<MissionId, number> = { 1: STEPS.indexOf("evt-fault"), 2: STEPS.indexOf("evt-storm"), 3: STEPS.length };

export interface ChapterResult {
  mission: MissionId;
  decision: { id: DecisionId; optionId: string } | null;
  start: Resources;
  end: Resources;
  endState: GameState;
  /** availability of the next mission's options, computed in the exact state the player will face */
  next: { optionId: string; label: T; locked: T | null }[];
  outlook: "more-options" | "fewer-options" | "final";
  closing: T;
}

export function chapterResult(choices: Choices, mission: MissionId): ChapterResult {
  const start = simulate(choices, CHAPTER_START[mission]).state;
  const endState = simulate(choices, CHAPTER_END[mission]).state;
  const did = endState.decisionHistory.find((h) => h.decisionId === MISSIONS[mission].decision);
  const nextId = NEXT_DECISION[mission];
  let next: ChapterResult["next"] = [];
  if (nextId) {
    const at = simulate(choices, STEPS.indexOf(nextId)).state;
    next = DECISIONS[nextId].options.map((o) => ({ optionId: o.id, label: o.label, locked: lockReason(at, nextId, o.id) }));
  }
  const lockedCount = next.filter((n) => n.locked).length;
  const outlook: ChapterResult["outlook"] = !nextId ? "final" : lockedCount ? "fewer-options" : "more-options";
  const contextual = suhailLines(endState, "after-decision", 1)[0]?.text;
  const closing =
    outlook === "final"
      ? t("انتهت المهمات الثلاث. لنرَ أين أوصلتنا قراراتك.", "All three missions are done. Let's see where your decisions led us.")
      : outlook === "fewer-options"
        ? t(
            `قراراتك جعلت المهمة القادمة أصعب قليلًا: ${lockedCount} من الخيارات لن تكون متاحة. ${contextual?.ar ?? ""}`,
            `Your decisions made the next mission a little harder: ${lockedCount} option(s) won't be available. ${contextual?.en ?? ""}`,
          )
        : t(
            `أحسنت — حافظت على مرونة تكفي لكل الخيارات في المهمة القادمة. ${contextual?.ar ?? ""}`,
            `Well done — you kept enough flexibility for every option in the next mission. ${contextual?.en ?? ""}`,
          );
  return {
    mission,
    decision: did ? { id: did.decisionId, optionId: did.optionId } : null,
    start: start.resources,
    end: endState.resources,
    endState,
    next,
    outlook,
    closing,
  };
}
