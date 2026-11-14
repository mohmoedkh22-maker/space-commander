// Data-driven mission chapters and story events (pure data + pure functions).
import { WATER } from "./config";
import { completeAllSafetyChecks } from "./safety";
import type { EventId, GameEvent, GameState, Mission, MissionId, T } from "./types";

const t = (ar: string, en: string): T => ({ ar, en });

export const MISSIONS: Record<MissionId, Mission> = {
  1: {
    id: 1,
    title: t("الشمس التي تختفي", "The Vanishing Sun"),
    focus: t("الطاقة", "Energy"),
    days: [1, 2],
    decision: "d1-energy",
  },
  2: {
    id: 2,
    title: t("القطرة الأخيرة", "The Last Drop"),
    focus: t("الماء والغذاء", "Water and food"),
    days: [3, 4],
    decision: "d2-water",
    openingEvent: "evt-fault",
  },
  3: {
    id: 3,
    title: t("الإشارة الأخيرة", "The Final Signal"),
    focus: t("السلامة", "Safety"),
    days: [5, 6, 7],
    decision: "d3-emergency",
    openingEvent: "evt-storm",
  },
};

export function missionForDay(day: number): MissionId {
  return day <= 2 ? 1 : day <= 4 ? 2 : 3;
}

/**
 * A mission's decision becomes available only after the previous chapter's decision
 * was taken and the chapter's opening event happened.
 */
export function isMissionAvailable(s: GameState, id: MissionId): boolean {
  const done = (d: string) => s.decisionHistory.some((h) => h.decisionId === d);
  if (id === 1) return true;
  if (id === 2) return done("d1-energy") && s.flags.recyclerFault;
  return done("d2-water") && s.flags.storm;
}

export const EVENTS: Record<EventId, GameEvent> = {
  "evt-fault": {
    id: "evt-fault",
    day: 3,
    title: t("عطل في تدوير المياه", "Water recycler fault"),
    apply: (s) => ({
      ...s,
      recyclerEfficiency: WATER.faultEfficiency,
      facilities: { ...s.facilities, waterRecycling: "faulty" },
      flags: { ...s.flags, recyclerFault: true },
    }),
  },
  "evt-storm": {
    id: "evt-storm",
    day: 5,
    title: t("تحذير طقس فضائي (سيناريو تدريبي)", "Space-weather warning (training scenario)"),
    apply: (s) => ({ ...s, flags: { ...s.flags, storm: true } }),
  },
  safety: {
    id: "safety",
    day: 5,
    title: t("إجراءات السلامة الأربع", "The four safety steps"),
    apply: (s) => completeAllSafetyChecks(s),
  },
};
