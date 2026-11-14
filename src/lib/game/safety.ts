// Mission 03 crew-safety procedures. They are part of the engine, so the UI cannot bypass them:
// every Mission 03 option has a "safety-checks" prerequisite.
import type { GameState, SafetyCheckId, T } from "./types";

const t = (ar: string, en: string): T => ({ ar, en });

export const SAFETY_CHECKS: { id: SafetyCheckId; label: T }[] = [
  { id: "stopExternal", label: t("إيقاف الأعمال الخارجية غير الضرورية", "Stop unnecessary outside activities") },
  { id: "crewIndoors", label: t("إعادة الطاقم إلى الداخل", "Bring the crew indoors") },
  { id: "shelterReady", label: t("التأكد من جاهزية المأوى", "Verify the shelter is ready") },
  { id: "lifeSupportConfirmed", label: t("التأكد من عمل دعم الحياة", "Confirm life support is running") },
];

export const NO_CHECKS: Record<SafetyCheckId, boolean> = {
  stopExternal: false,
  crewIndoors: false,
  shelterReady: false,
  lifeSupportConfirmed: false,
};

export const allSafetyChecksDone = (s: GameState) => SAFETY_CHECKS.every((c) => s.safetyChecks[c.id]);

/** Completes one safety step. Only possible once the space-weather warning has arrived. */
export function completeSafetyCheck(s: GameState, id: SafetyCheckId): GameState {
  if (!s.flags.storm) throw new Error("No safety warning is active");
  if (!(id in s.safetyChecks)) throw new Error(`Unknown safety check ${id}`);
  const safetyChecks = { ...s.safetyChecks, [id]: true };
  const next: GameState = {
    ...s,
    safetyChecks,
    facilities: id === "shelterReady" ? { ...s.facilities, shelter: "ready" } : s.facilities,
  };
  if (!SAFETY_CHECKS.every((c) => safetyChecks[c.id])) return next;
  // all four done: the crew is protected inside the active shelter
  return {
    ...next,
    crewSafety: "sheltered",
    facilities: { ...next.facilities, shelter: "active" },
    flags: { ...next.flags, safetyConfirmed: true },
  };
}

export function completeAllSafetyChecks(s: GameState): GameState {
  return SAFETY_CHECKS.reduce((acc, c) => completeSafetyCheck(acc, c.id), s);
}
