// PHASE 2 — SUHAIL as a companion: which expression and which short line fit the REAL game state.
// Pure TypeScript. SUHAIL reacts, explains and encourages; he never chooses an option for the child.
import { suhailLines, type DialogueMoment } from "./dialogue";
import { crewReports } from "./journey";
import type { GameState, T } from "./types";

export type CompanionExpression = "idle" | "curious" | "thinking" | "explaining" | "warning" | "happy" | "encouraging" | "concerned";

const t = (ar: string, en: string): T => ({ ar, en });

/** Short reactions from the approved brief. */
export const REACTIONS = {
  healthy: t("ممتاز يا قائد! القاعدة تعمل بكفاءة.", "Excellent, Commander! The base is running efficiently."),
  lowEnergy: t("انتبه! مخزون الطاقة بدأ ينخفض.", "Careful! Our energy reserve is starting to drop."),
  importantDecision: t("قرار مهم! دعنا نراقب تأثيره.", "An important decision! Let's watch its effect."),
  water: t("الماء يحتاج انتباهنا… لنراقبه معًا.", "Our water needs attention… let's watch it together."),
  safety: t("السلامة أولًا يا قائد. لنحمِ الطاقم قبل أي شيء.", "Safety first, Commander. Let's protect the crew before anything else."),
  options: t("بعض الخيارات مقفلة الآن… فكّر: ماذا نحمي أولًا؟", "Some options are locked now… think: what do we protect first?"),
  recovery: t("أحسنت! النظام يتعافى.", "Well done! The system is recovering."),
  sheltered: t("الطاقم في أمان. خطوة ممتازة!", "The crew is safe. Excellent step!"),
  crops: t("محاصيلنا تنمو ببطء… سنراقبها.", "Our crops are growing slowly… we'll keep an eye on them."),
};

/** Which expression each of SUHAIL's dialogue rules uses. */
export const RULE_EXPRESSION: Record<string, CompanionExpression> = {
  SAFETY_WARNING: "warning",
  CREW_SHELTERED: "encouraging",
  OPTIONS_LIMITED_M2: "thinking",
  OPTIONS_LIMITED_M3: "thinking",
  RECOVERY_WATER: "encouraging",
  LOW_ENERGY: "warning",
  LOW_WATER: "concerned",
  LOW_GREENHOUSE: "concerned",
  GOOD_ENERGY: "happy",
};

const RULE_REACTION: Record<string, T> = {
  SAFETY_WARNING: REACTIONS.safety,
  CREW_SHELTERED: REACTIONS.sheltered,
  OPTIONS_LIMITED_M2: REACTIONS.options,
  OPTIONS_LIMITED_M3: REACTIONS.options,
  RECOVERY_WATER: REACTIONS.recovery,
  LOW_ENERGY: REACTIONS.lowEnergy,
  LOW_WATER: REACTIONS.water,
  LOW_GREENHOUSE: REACTIONS.crops,
  GOOD_ENERGY: REACTIONS.healthy,
};

export interface CompanionCue {
  expression: CompanionExpression;
  /** short reaction (one sentence) */
  reaction: T;
  /** SUHAIL's fuller explanation from the dialogue rules, if any */
  detail?: T;
  ruleId?: string;
}

/**
 * SUHAIL's reaction for this moment, from the highest-priority dialogue rule that applies.
 * With no rule: "healthy" (happy) when every crew report is stable, otherwise idle.
 */
export function companionCue(s: GameState, moment: DialogueMoment): CompanionCue {
  const top = suhailLines(s, moment, 1)[0];
  if (top) return { expression: RULE_EXPRESSION[top.id] ?? "idle", reaction: RULE_REACTION[top.id] ?? top.text, detail: top.text, ruleId: top.id };
  const allOk = crewReports(s).every((c) => c.level === "ok" || c.level === "recovery");
  return allOk ? { expression: "happy", reaction: REACTIONS.healthy } : { expression: "idle", reaction: t("أنا معك يا قائد.", "I'm right here with you, Commander.") };
}

/** Right after the child confirms a decision. */
export const afterDecisionCue = (): CompanionCue => ({ expression: "explaining", reaction: REACTIONS.importantDecision });

/** Combine a reaction with a detail into one line for display. */
export const joinCue = (c: CompanionCue): T => (c.detail && c.detail !== c.reaction ? { ar: `${c.reaction.ar} ${c.detail.ar}`, en: `${c.reaction.en} ${c.detail.en}` } : c.reaction);
