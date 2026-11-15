// PHASE 4 — gameplay feedback, computed from the engine's states (pure; the UI only animates what this says).
// Animation must explain a consequence, so every notice names what changed and why it matters.
import { BATTERY_CAP_KWH, THRESHOLDS } from "./config";
import { allSafetyChecksDone } from "./safety";
import type { DecisionRecord, GameState, ResourceId, T } from "./types";

const t = (ar: string, en: string): T => ({ ar, en });
const r = (n: number) => Math.round(n);

/* ---------------- resource changes ---------------- */

/** Smallest change worth showing, per resource. */
export const SIGNIFICANT: Record<ResourceId, number> = { energy: 5, water: 3, oxygen: 1, food: 1 };

export interface ResourceChange {
  id: ResourceId;
  delta: number;
  direction: "up" | "down";
}

export function resourceChanges(prev: GameState["resources"], next: GameState["resources"]): ResourceChange[] {
  return (Object.keys(SIGNIFICANT) as ResourceId[])
    .map((id) => ({ id, delta: next[id] - prev[id] }))
    .filter((c) => Math.abs(c.delta) >= SIGNIFICANT[c.id])
    .map((c) => ({ ...c, direction: c.delta > 0 ? ("up" as const) : ("down" as const) }));
}

/* ---------------- mission notifications ---------------- */

export interface Notice {
  id: string;
  level: "ok" | "warn" | "crit";
  icon: string;
  text: T;
}

const ENERGY_CRIT = BATTERY_CAP_KWH * 0.15;
const WATER_CRIT = 200;
const crossedBelow = (a: number, b: number, line: number) => a >= line && b < line;
const crossedAbove = (a: number, b: number, line: number) => a < line && b >= line;

/** Notifications for what just changed between two states (threshold crossings and events only, never repeats). */
export function hudNotices(prev: GameState, next: GameState): Notice[] {
  const out: Notice[] = [];
  const pe = prev.resources.energy;
  const ne = next.resources.energy;
  if (crossedBelow(pe, ne, ENERGY_CRIT))
    out.push({ id: "energy-crit", level: "crit", icon: "⚡", text: t(`البطارية حرجة: ${r(ne)} ك.و.س فقط!`, `Battery critical: only ${r(ne)} kWh!`) });
  else if (crossedBelow(pe, ne, THRESHOLDS.lowEnergy))
    out.push({ id: "energy-low", level: "warn", icon: "⚡", text: t("انتبه! مخزون الطاقة بدأ ينخفض.", "Careful! Our energy reserve is starting to drop.") });
  if (crossedAbove(pe, ne, THRESHOLDS.lowEnergy))
    out.push({ id: "energy-ok", level: "ok", icon: "⚡", text: t(`البطارية عادت فوق الاحتياطي: ${r(ne)} ك.و.س.`, `The battery is back above the reserve: ${r(ne)} kWh.`) });

  const pw = prev.resources.water;
  const nw = next.resources.water;
  if (crossedBelow(pw, nw, WATER_CRIT))
    out.push({ id: "water-crit", level: "crit", icon: "💧", text: t(`تحذير: الماء منخفض جدًا (${r(nw)} لتر)!`, `Warning: water is very low (${r(nw)} L)!`) });
  else if (crossedBelow(pw, nw, THRESHOLDS.lowWater))
    out.push({ id: "water-low", level: "warn", icon: "💧", text: t(`الماء أقل من المستوى المريح (${r(nw)} لتر).`, `Water is below the comfortable level (${r(nw)} L).`) });
  if (prev.facilities.waterRecycling !== "faulty" && next.facilities.waterRecycling === "faulty")
    out.push({ id: "recycler-fault", level: "warn", icon: "💧", text: t("عطل في وحدة تدوير المياه!", "Fault in the water recycler!") });
  if (prev.facilities.waterRecycling !== "repaired" && next.facilities.waterRecycling === "repaired")
    out.push({ id: "recycler-fixed", level: "ok", icon: "🔧", text: t("المدوّر يعمل من جديد!", "The recycler works again!") });

  if (prev.facilities.lifeSupport !== "strained" && next.facilities.lifeSupport === "strained")
    out.push({ id: "life-strained", level: "crit", icon: "🫧", text: t("دعم الحياة لم يحصل على كهرباء كافية!", "Life support did not get enough power!") });

  if (!prev.flags.storm && next.flags.storm)
    out.push({ id: "storm", level: "crit", icon: "🛡️", text: t("طوارئ: طقس فضائي (سيناريو تدريبي)!", "Emergency: space weather (training scenario)!") });
  if (!allSafetyChecksDone(prev) && allSafetyChecksDone(next))
    out.push({ id: "safety-done", level: "ok", icon: "🛡️", text: t("خطوات السلامة الأربع اكتملت. الطاقم محمي.", "All four safety steps done. The crew is protected.") });

  const newLog = next.log.length > prev.log.length ? next.log[next.log.length - 1] : undefined;
  if (newLog && newLog.shed.length > 0)
    out.push({ id: `shed-${newLog.day}`, level: "warn", icon: "🔌", text: t(`اليوم ${newLog.day}: أُطفئت بعض الأنظمة لتوفير الطاقة.`, `Day ${newLog.day}: some systems were switched off to save power.`) });
  return out;
}

/* ---------------- how did the decision work out? ---------------- */

export type DecisionTone = "success" | "careful" | "strained";

export interface DecisionFeedback {
  tone: DecisionTone;
  title: T;
  text: T;
}

/** Judges only the day that the decision shaped (honest: the long-term result shows later). */
export function decisionFeedback(record: DecisionRecord, after: GameState): DecisionFeedback {
  const log = after.log[after.log.length - 1];
  if (log && log.shortfallKWh > 0)
    return {
      tone: "strained",
      title: t("القاعدة واجهت صعوبة", "The base struggled"),
      text: t("لم تكفِ الكهرباء اليوم، فعمل دعم الحياة تحت ضغط. الطاقم ما زال آمنًا — راقب الطاقة في القرار القادم.", "There wasn't enough power today, so life support was strained. The crew is still safe — watch energy in the next decision."),
    };
  if (log && log.shed.length === 0 && crossedBelow(record.before.resources.energy, after.resources.energy, THRESHOLDS.lowEnergy))
    return {
      tone: "careful",
      title: t("قرار له ثمن", "A decision with a cost"),
      text: t(
        `القاعدة عملت طوال اليوم، لكن البطارية نزلت تحت الاحتياطي (${r(after.resources.energy)} ك.و.س). قد تقلّ خياراتنا لاحقًا.`,
        `The base ran all day, but the battery fell below the reserve (${r(after.resources.energy)} kWh). We may have fewer options later.`,
      ),
    };
  if (log && log.shed.length > 0)
    return {
      tone: "careful",
      title: t("قرار له ثمن", "A decision with a cost"),
      text: t("أكملنا اليوم، لكن القاعدة أطفأت بعض الأنظمة تلقائيًا لتوفير الطاقة.", "We made it through the day, but the base had to switch some systems off to save power."),
    };
  return {
    tone: "success",
    title: t("قرار موفّق!", "Well-chosen!"),
    text: t("القاعدة عملت طوال اليوم بلا نقص في الكهرباء. لنرَ كيف يؤثر هذا على الأيام القادمة.", "The base ran all day with enough power. Let's see how this shapes the days ahead."),
  };
}
