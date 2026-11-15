// V0.7 — COMPLETE MISSION EXPERIENCE
// The player journey as data, plus state-driven base conditions and crew reports.
// Pure TypeScript: reads the engine's GameState, never changes the simulation.
import { CREW } from "@/lib/i18n";
import { BATTERY_CAP_KWH, THRESHOLDS } from "./config";
import { DECISIONS } from "./decisions";
import { activeEvents } from "./experience";
import { allSafetyChecksDone } from "./safety";
import type { CrewId, DecisionId, GameState, MissionId, T } from "./types";

const t = (ar: string, en: string): T => ({ ar, en });
const r = (n: number) => Math.round(n);

/* ---------------- 1. The journey ---------------- */

export type SceneId =
  | "start-menu"
  | "mission-briefing"
  | "lunar-base"
  | "mission-control"
  | "mission-challenge"
  | "decision-consequences"
  | "mission-transition"
  | "emergency-sequence"
  | "mission-outcome"
  | "what-if-lab"
  | "commander-report"
  | "about-the-science";

/** The order a first-time player meets the scenes (About the Science is also reachable at any time from the toolbar). */
export const JOURNEY: { id: SceneId; title: T }[] = [
  { id: "start-menu", title: t("القائمة الرئيسية", "Start Menu") },
  { id: "mission-briefing", title: t("إيجاز المهمة", "Mission Briefing") },
  { id: "lunar-base", title: t("القاعدة القمرية", "Lunar Base") },
  { id: "mission-control", title: t("مركز التحكم", "Mission Control") },
  { id: "mission-challenge", title: t("تحدي المهمة", "Mission Challenge") },
  { id: "decision-consequences", title: t("نتائج القرار", "Decision Consequences") },
  { id: "mission-transition", title: t("الانتقال للمهمة التالية", "Mission Transition") },
  { id: "emergency-sequence", title: t("حالة الطوارئ", "Emergency Sequence") },
  { id: "mission-outcome", title: t("نتيجة المهمة", "Mission Outcome") },
  { id: "what-if-lab", title: t("مختبر ماذا لو؟", "What If Lab") },
  { id: "commander-report", title: t("تقرير القائد", "Commander Report") },
  { id: "about-the-science", title: t("العلم والمصادر", "About the Science") },
];

export interface Chapter {
  id: MissionId;
  title: T;
  focus: T;
  days: number[];
  decision: DecisionId;
}

export const CHAPTERS: Chapter[] = [
  { id: 1, title: t("الشمس التي تختفي", "The Vanishing Sun"), focus: t("الطاقة", "Energy"), days: [1, 2], decision: "d1-energy" },
  { id: 2, title: t("القطرة الأخيرة", "The Last Drop"), focus: t("الماء والغذاء", "Water and food"), days: [3, 4], decision: "d2-water" },
  { id: 3, title: t("الإشارة الأخيرة", "The Final Signal"), focus: t("سلامة الطاقم", "Crew safety"), days: [5, 6, 7], decision: "d3-emergency" },
];

export const chapterForDay = (day: number): Chapter => CHAPTERS[day <= 2 ? 0 : day <= 4 ? 1 : 2];

/* ---------------- 2. Crew reports ---------------- */

export type ReportLevel = "ok" | "warn" | "crit" | "recovery";

export interface CrewReport {
  who: CrewId;
  role: T;
  level: ReportLevel;
  text: T;
}

/** Same roles as the crew cards (i18n CREW). */
export const CREW_ROLES: Record<CrewId, T> = {
  adam: CREW.adam.role,
  layan: CREW.layan.role,
  mira: CREW.mira.role,
  rashed: CREW.rashed.role,
};

const lastLog = (s: GameState) => s.log.at(-1);
const prevLog = (s: GameState) => s.log.at(-2);

/** Battery climbed back after being low on the previous day. */
export const batteryRecovering = (s: GameState) => {
  const a = prevLog(s);
  const b = lastLog(s);
  return !!a && !!b && a.energy < THRESHOLDS.lowEnergy && b.energy > a.energy + 1;
};

export function crewReports(s: GameState): CrewReport[] {
  const bat = s.resources.energy;
  const last = lastLog(s);
  const light = last ? r(last.sunlitFraction * 100) : null;
  const lightText = light === null ? t("", "") : t(` الضوء أمس ${light}% (بيانات ناسا).`, ` Yesterday's sunlight: ${light}% (NASA data).`);

  // Adam — energy
  const adam: CrewReport = (() => {
    const base = { who: "adam" as const, role: CREW_ROLES.adam };
    if (bat < BATTERY_CAP_KWH * 0.15)
      return { ...base, level: "crit" as const, text: t(`البطارية ${r(bat)} ك.و.س فقط! نحتاج تقليل الأحمال.${lightText.ar}`, `Battery at only ${r(bat)} kWh! We need to cut loads.${lightText.en}`) };
    if (batteryRecovering(s))
      return { ...base, level: "recovery" as const, text: t(`البطارية ترتفع من جديد: ${r(bat)} ك.و.س.${lightText.ar}`, `The battery is climbing again: ${r(bat)} kWh.${lightText.en}`) };
    if (s.facilities.powerStation === "low-reserve")
      return { ...base, level: "warn" as const, text: t(`الاحتياطي منخفض: ${r(bat)} ك.و.س. أراقب كل كيلوواط.${lightText.ar}`, `Reserve is low: ${r(bat)} kWh. I'm watching every kilowatt.${lightText.en}`) };
    return { ...base, level: "ok" as const, text: t(`البطارية ${r(bat)} ك.و.س. الطاقة مستقرة.${lightText.ar}`, `Battery at ${r(bat)} kWh. Power is stable.${lightText.en}`) };
  })();

  // Layan — life support & water
  const layan: CrewReport = (() => {
    const base = { who: "layan" as const, role: CREW_ROLES.layan };
    const w = r(s.resources.water);
    if (s.facilities.lifeSupport === "strained")
      return { ...base, level: "crit" as const, text: t(`دعم الحياة لم يحصل على كهرباء كافية! الأكسجين ${r(s.resources.oxygen)}%.`, `Life support didn't get enough power! Oxygen at ${r(s.resources.oxygen)}%.`) };
    if (s.facilities.waterRecycling === "faulty")
      return { ...base, level: "warn" as const, text: t(`المدوّر فيه عطل ويستعيد ماءً أقل. لدينا ${w} لتر.`, `The recycler has a fault and recovers less water. We have ${w} L.`) };
    if (s.facilities.waterRecycling === "repaired")
      return { ...base, level: "recovery" as const, text: t(`أصلحنا المدوّر! الاستعادة عادت إلى 90%. لدينا ${w} لتر.`, `We fixed the recycler! Recovery is back to 90%. We have ${w} L.`) };
    if (s.resources.water < THRESHOLDS.lowWater)
      return { ...base, level: "warn" as const, text: t(`الماء ${w} لتر — أقل من المستوى المريح.`, `Water at ${w} L — below the comfortable level.`) };
    return { ...base, level: "ok" as const, text: t(`الهواء نظيف والأكسجين ${r(s.resources.oxygen)}%. الماء ${w} لتر.`, `The air is clean and oxygen is ${r(s.resources.oxygen)}%. Water: ${w} L.`) };
  })();

  // Mira — greenhouse & food
  const mira: CrewReport = (() => {
    const base = { who: "mira" as const, role: CREW_ROLES.mira };
    const f = r(s.resources.food);
    if (s.facilities.greenhouse === "dormant")
      return { ...base, level: "warn" as const, text: t(`المزرعة شبه متوقفة لتوفير الطاقة. المحاصيل عند ${f}%.`, `The greenhouse is almost dormant to save power. Crops at ${f}%.`) };
    if (s.facilities.greenhouse === "reduced")
      return { ...base, level: "warn" as const, text: t(`المزرعة تعمل بتشغيل مخفّض، النمو أبطأ. المحاصيل عند ${f}%.`, `The greenhouse is running reduced, so growth is slower. Crops at ${f}%.`) };
    return { ...base, level: "ok" as const, text: t(`النباتات مزدهرة! المحاصيل عند ${f}%.`, `The plants are thriving! Crops at ${f}%.`) };
  })();

  // Rashed — safety
  const rashed: CrewReport = (() => {
    const base = { who: "rashed" as const, role: CREW_ROLES.rashed };
    if (s.flags.storm && !allSafetyChecksDone(s))
      return { ...base, level: "crit" as const, text: t("تحذير طقس فضائي (سيناريو تدريبي)! يجب إكمال خطوات السلامة الأربع الآن.", "Space-weather warning (training scenario)! We must complete the four safety steps now.") };
    if (s.flags.storm)
      return { ...base, level: "recovery" as const, text: t("كل خطوات السلامة اكتملت. الطاقم داخل المأوى المحمي.", "All safety steps are complete. The crew is inside the protected shelter.") };
    return { ...base, level: "ok" as const, text: t("الفحوصات اليومية سليمة. المأوى جاهز إذا احتجناه.", "Daily checks are clear. The shelter is ready if we need it.") };
  })();

  return [adam, layan, mira, rashed];
}

/* ---------------- 3. Lunar base visual state ---------------- */

export type BaseCondition = "normal" | "warning" | "critical" | "recovery" | "complete";

export const BASE_CONDITION_TEXT: Record<BaseCondition, T> = {
  normal: t("طبيعي", "Normal"),
  warning: t("تحذير", "Warning"),
  critical: t("حرج", "Critical"),
  recovery: t("تعافٍ", "Recovery"),
  complete: t("المهمة اكتملت", "Mission complete"),
};

export const BASE_CONDITION_COLOR: Record<BaseCondition, string> = {
  normal: "#50e3f0",
  warning: "#ffad4d",
  critical: "#ff6b6b",
  recovery: "#5be3a0",
  complete: "#8c78ff",
};

/**
 * One visual state for the whole base, derived from the crew reports and the active mission events
 * (so the map, the HUD and the crew always agree).
 * Priority: complete > critical > warning > recovery > normal.
 */
export function baseCondition(s: GameState): BaseCondition {
  if (s.day > 7) return "complete";
  const levels = crewReports(s).map((c) => c.level);
  // once the four safety steps are done the emergency is under control: the storm is still a warning, no longer critical
  const events = activeEvents(s).map((e) => (e.severity === "critical" && allSafetyChecksDone(s) ? "warning" : e.severity));
  if (levels.includes("crit") || events.includes("critical")) return "critical";
  if (levels.includes("warn") || events.includes("warning")) return "warning";
  if (levels.includes("recovery")) return "recovery";
  return "normal";
}

/* ---------------- 4. Commander report ---------------- */

export interface ConceptExplored {
  decisionId: DecisionId;
  title: T;
  science: T;
}

const CONCEPT_TITLES: Record<DecisionId, T> = {
  "d1-energy": t("الطاقة الشمسية وتخزينها في القطب القمري", "Solar power and storage at the lunar pole"),
  "d2-water": t("تدوير المياه والعلاقة بين الماء والطاقة والغذاء", "Water recycling and the water–energy–food link"),
  "d3-emergency": t("الطقس الفضائي وحماية الطاقم", "Space weather and protecting the crew"),
};

export function conceptsExplored(decided: DecisionId[]): ConceptExplored[] {
  return decided.map((id) => ({ decisionId: id, title: CONCEPT_TITLES[id], science: DECISIONS[id].science }));
}
