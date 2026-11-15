// SUHAIL's contextual dialogue — data-driven rules evaluated against the REAL game state.
// SUHAIL explains and asks; he never chooses an option for the player.
import { THRESHOLDS } from "./config";
import { DECISIONS } from "./decisions";
import { lockReason } from "./engine";
import { allSafetyChecksDone } from "./safety";
import type { DecisionId, GameState, T } from "./types";

const t = (ar: string, en: string): T => ({ ar, en });

export type DialogueMoment = "mission-1" | "mission-2-alert" | "mission-2" | "mission-3-alert" | "mission-3" | "after-decision" | "chapter-end";

export interface DialogueRule {
  id: string;
  moments: DialogueMoment[];
  /** higher first */
  priority: number;
  when: (s: GameState) => boolean;
  text: T;
}

const anyLocked = (s: GameState, id: DecisionId) => DECISIONS[id].options.some((o) => lockReason(s, id, o.id));

export const DIALOGUE_RULES: DialogueRule[] = [
  {
    id: "SAFETY_WARNING",
    moments: ["mission-3-alert", "mission-3"],
    priority: 100,
    when: (s) => s.flags.storm && !allSafetyChecksDone(s),
    text: t(
      "قبل أن نكمل الأبحاث، يجب أن نتأكد أن طاقمنا وأنظمتنا الأساسية محمية.",
      "Before continuing research, we must confirm that our crew and essential systems are protected.",
    ),
  },
  {
    id: "OPTIONS_LIMITED_M2",
    moments: ["mission-2-alert", "mission-2"],
    priority: 90,
    when: (s) => anyLocked(s, "d2-water"),
    text: t(
      "تذكّر قرار الطاقة في المهمة الأولى: احتياطينا الآن لا يكفي لكل الخطط. ما زال بإمكاننا اختيار طريق آخر.",
      "Remember the energy decision in Mission 1: our reserve can't support every plan now. We can still choose another path.",
    ),
  },
  {
    id: "OPTIONS_LIMITED_M3",
    moments: ["mission-3"],
    priority: 90,
    when: (s) => allSafetyChecksDone(s) && anyLocked(s, "d3-emergency"),
    text: t(
      "قراراتنا السابقة تركت احتياطيات أقل مما نحتاج لمواصلة كل الأهداف. ما الذي يجب أن نحميه أولًا؟",
      "Our earlier decisions left smaller reserves than we need to keep every goal going. What must we protect first?",
    ),
  },
  {
    id: "CREW_SHELTERED",
    moments: ["chapter-end"],
    priority: 95,
    when: (s) => s.flags.storm && allSafetyChecksDone(s),
    text: t(
      "الطاقم محمي داخل المأوى. السلامة أولًا كانت الترتيب الصحيح — لنرَ الآن كيف صمدت مواردنا.",
      "The crew is protected inside the shelter. Safety first was the right order — now let's see how our resources held up.",
    ),
  },
  {
    id: "RECOVERY_WATER",
    moments: ["after-decision", "chapter-end"],
    priority: 85,
    when: (s) => s.facilities.waterRecycling === "repaired",
    text: t(
      "المدوّر يعمل من جديد — هذا ما يسميه المهندسون «تعافيًا». إصلاح المشكلة مبكرًا يحمي القاعدة كلها.",
      "The recycler works again — engineers call that a recovery. Fixing a problem early protects the whole base.",
    ),
  },
  {
    id: "LOW_ENERGY",
    moments: ["mission-1", "mission-2-alert", "mission-2", "mission-3", "after-decision", "chapter-end"],
    priority: 80,
    when: (s) => s.resources.energy < THRESHOLDS.lowEnergy,
    text: t(
      "احتياطي البطارية يصغر. يجب أن نراجع أي الأنظمة تحتاج الطاقة أولًا.",
      "Our battery reserve is getting smaller. We should review which systems need power first.",
    ),
  },
  {
    id: "LOW_WATER",
    moments: ["mission-2-alert", "mission-2", "mission-3", "after-decision", "chapter-end"],
    priority: 70,
    when: (s) => s.facilities.waterRecycling === "faulty" || s.resources.water < THRESHOLDS.lowWater,
    text: t(
      "استعدنا ماءً أقل من المتوقع. لنبحث عن السبب قبل أن نصرف موارد أكثر.",
      "We recovered less water than expected. Let's investigate before using more resources.",
    ),
  },
  {
    id: "LOW_GREENHOUSE",
    moments: ["mission-2-alert", "mission-2", "mission-3", "after-decision", "chapter-end"],
    priority: 60,
    when: (s) => s.facilities.greenhouse !== "thriving",
    text: t(
      "محاصيلنا تحتاج وقتًا أطول لتنمو. يجب أن نفكر في مخزون الغذاء المتبقي.",
      "Our crops need more time to grow. We should consider our remaining food supplies.",
    ),
  },
  {
    id: "GOOD_ENERGY",
    moments: ["mission-2-alert", "mission-2", "mission-3", "after-decision", "chapter-end"],
    priority: 50,
    when: (s) => s.resources.energy >= THRESHOLDS.goodEnergy,
    text: t(
      "ما زال لدينا مرونة في الطاقة. هذا يمنحنا خيارات أكثر للتحدي القادم.",
      "We still have some energy flexibility. That gives us more options for the next challenge.",
    ),
  },
];

/** The most relevant lines for this moment (highest priority first), at most `max`. */
export function suhailLines(s: GameState, moment: DialogueMoment, max = 2): { id: string; text: T }[] {
  return DIALOGUE_RULES.filter((r) => r.moments.includes(moment) && r.when(s))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, max)
    .map((r) => ({ id: r.id, text: r.text }));
}

/** One combined line for a decision screen: contextual lines + the decision's own question. */
export function suhailForDecision(id: DecisionId, s: GameState): T {
  const moment: DialogueMoment = id === "d1-energy" ? "mission-1" : id === "d2-water" ? "mission-2" : "mission-3";
  const lines = [...suhailLines(s, moment, 1).map((l) => l.text), DECISIONS[id].hint];
  return { ar: lines.map((l) => l.ar).join(" "), en: lines.map((l) => l.en).join(" ") };
}
