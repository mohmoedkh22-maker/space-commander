// "Why did this happen?" — pure functions that turn state changes into child-friendly explanations.
import { ILLUMINATION } from "@/lib/nasa/illumination";
import { ENDING_RULES, LOADS } from "./config";
import { OUTCOME_OF, computeEnding } from "./engine";
import { suhailForDecision, suhailLines } from "./dialogue";
import type { Consequence, DayLog, DecisionId, FacilityConditions, GameState, MissionResult, T } from "./types";

const t = (ar: string, en: string): T => ({ ar, en });
const r = (n: number) => Math.round(n);

const FACILITY_NAMES: Record<keyof FacilityConditions, T> = {
  powerStation: t("محطة الطاقة", "Power Station"),
  waterRecycling: t("وحدة تدوير المياه", "Water Recycling"),
  greenhouse: t("المزرعة", "Greenhouse"),
  lifeSupport: t("دعم الحياة", "Life Support"),
  shelter: t("المأوى", "Shelter"),
};

const CONDITION_TEXT: Record<string, T> = {
  nominal: t("يعمل طبيعيًا", "working normally"),
  "low-reserve": t("احتياطي البطارية منخفض", "battery reserve is low"),
  boosted: t("يعمل بقوة إضافية", "running boosted"),
  ready: t("جاهز", "ready"),
  faulty: t("فيه عطل", "has a fault"),
  repaired: t("تم إصلاحه", "repaired"),
  thriving: t("مزدهر", "thriving"),
  reduced: t("بتشغيل مخفّض", "running reduced"),
  dormant: t("شبه متوقف", "almost dormant"),
  strained: t("تحت ضغط — نقص في الكهرباء", "under strain — not enough power"),
  standby: t("في وضع الاستعداد", "on standby"),
  active: t("نشط — الطاقم في الداخل", "active — crew inside"),
};

const SHED_TEXT: Record<string, T> = {
  research: t("الأبحاث", "research"),
  greenhouse: t("جزء من المزرعة", "part of the greenhouse"),
  recyclerBoost: t("التشغيل الإضافي للمدوّر", "the recycler boost"),
};

/** Explains one simulated day: where energy came from and went, and why water, food and oxygen changed. */
export function explainDay(log: DayLog, before: GameState, after: GameState): Consequence[] {
  const out: Consequence[] = [];
  const lightPct = r(ILLUMINATION.fraction * log.lightFactor * 100);
  out.push({
    kind: "energy",
    text: t(
      `الألواح أنتجت ${r(log.solarKWh)} ك.و.س لأن ضوء الشمس اليوم كان حوالي ${lightPct}% (متوسط ناسا 88% × ظروف القصة).`,
      `The panels made ${r(log.solarKWh)} kWh because today's sunlight was about ${lightPct}% (NASA's 88% average × the story's conditions).`,
    ),
  });
  const L = log.loads;
  out.push({
    kind: "load",
    text: t(
      `القاعدة استهلكت ${r(log.loadKWh)} ك.و.س: دعم الحياة ${L.lifeSupport}، المدوّر ${L.recycler}، المزرعة ${L.greenhouse}${L.research ? `، الأبحاث ${L.research}` : ""}${L.shelter ? `، المأوى ${L.shelter}` : ""}${L.extra ? `، أعمال إضافية ${L.extra}` : ""}.`,
      `The base used ${r(log.loadKWh)} kWh: life support ${L.lifeSupport}, recycler ${L.recycler}, greenhouse ${L.greenhouse}${L.research ? `, research ${L.research}` : ""}${L.shelter ? `, shelter ${L.shelter}` : ""}${L.extra ? `, extra work ${L.extra}` : ""}.`,
    ),
    effect: { resource: "energy", delta: after.resources.energy - before.resources.energy },
  });
  if (log.shed.length) {
    const names = log.shed.map((x) => SHED_TEXT[x]);
    out.push({
      kind: "shed",
      text: t(
        `البطارية لم تكفِ، فأوقف سهيل تلقائيًا: ${names.map((n) => n.ar).join("، ")} — لحماية دعم الحياة.`,
        `The battery wasn't enough, so SUHAIL automatically switched off ${names.map((n) => n.en).join(", ")} to protect life support.`,
      ),
    });
  }
  const waterLost = before.resources.water - after.resources.water;
  out.push({
    kind: "water",
    text: t(
      `فقدنا ${r(waterLost)} لتر: الطاقم استخدم ${log.crewWaterUseL} لترًا واستعاد المدوّر ${r(log.recyclerEfficiency * 100)}% منها، والمزرعة استهلكت ${log.greenhouseWaterL} لترًا.`,
      `We lost ${r(waterLost)} L: the crew used ${log.crewWaterUseL} L and the recycler recovered ${r(log.recyclerEfficiency * 100)}% of it; the greenhouse used ${log.greenhouseWaterL} L.`,
    ),
    effect: { resource: "water", delta: after.resources.water - before.resources.water },
  });
  out.push({
    kind: "food",
    text:
      log.cropGrowth > 0
        ? t(`المحاصيل نمت ${log.cropGrowth}% حسب مستوى تشغيل المزرعة.`, `Crops grew ${log.cropGrowth}% based on how much the greenhouse was running.`)
        : t("المحاصيل لم تنمُ لأن الماء كان قليلًا جدًا.", "Crops didn't grow because there was too little water."),
    effect: { resource: "food", delta: after.resources.food - before.resources.food },
  });
  if (log.shortfallKWh > 0) {
    out.push({
      kind: "oxygen",
      text: t(
        `نقص ${r(log.shortfallKWh)} ك.و.س جعل دعم الحياة يعمل تحت ضغط فانخفض الأكسجين قليلًا. الطاقم ما زال محميًا.`,
        `A ${r(log.shortfallKWh)} kWh shortfall put life support under strain, so oxygen dipped a little. The crew is still protected.`,
      ),
      effect: { resource: "oxygen", delta: after.resources.oxygen - before.resources.oxygen },
    });
  }
  return [...out, ...explainFacilities(before, after)];
}

/** Lists facilities whose condition changed. */
export function explainFacilities(before: GameState, after: GameState): Consequence[] {
  return (Object.keys(after.facilities) as (keyof FacilityConditions)[])
    .filter((k) => before.facilities[k] !== after.facilities[k])
    .map((k) => ({
      kind: "facility" as const,
      text: t(
        `${FACILITY_NAMES[k].ar}: ${CONDITION_TEXT[after.facilities[k]].ar}.`,
        `${FACILITY_NAMES[k].en}: ${CONDITION_TEXT[after.facilities[k]].en}.`,
      ),
    }));
}

/**
 * SUHAIL's guidance comes from the data-driven rules in dialogue.ts, evaluated on the real state,
 * so earlier decisions change what he says. He explains the situation; he never picks the option.
 */
export function guidanceFor(at: DecisionId | "evt-fault", s: GameState): T {
  if (at === "evt-fault") {
    const lines = suhailLines(s, "mission-2-alert", 2).map((l) => l.text);
    if (!lines.length) return t("لدينا مشكلة جديدة في نظام المياه أيها القائد.", "We have a new problem in the water system, Commander.");
    return { ar: lines.map((l) => l.ar).join(" "), en: lines.map((l) => l.en).join(" ") };
  }
  return suhailForDecision(at, s);
}
/** Final result with plain reasons for the ending. */
export function missionResult(s: GameState): MissionResult {
  const ending = computeEnding(s);
  const R = ENDING_RULES;
  const reasons: T[] = [];
  if (s.flags.researchEnded) {
    reasons.push(t("اخترت وضع الحفاظ على الموارد، فتوقفت الأهداف البحثية مبكرًا.", "You chose conservation mode, so research goals ended early."));
  }
  if (s.shortfallDays > R.interrupted.maxShortfallDays) {
    reasons.push(t(`نقصت الكهرباء في ${s.shortfallDays} أيام.`, `Power ran short on ${s.shortfallDays} days.`));
  }
  if (s.resources.water < R.interrupted.minWater) {
    reasons.push(t("انخفض الماء تحت الحد الآمن.", "Water fell below the safe level."));
  }
  if (ending !== "C") {
    if (!s.policy.research) {
      reasons.push(
        t(
          "أجّلنا الأبحاث العلمية في الأيام الأخيرة لنحمي الأنظمة الأساسية، فلم تكتمل كل أهداف المهمة.",
          "We postponed science research in the final days to protect essential systems, so not every mission goal was completed.",
        ),
      );
    } else if (s.researchPoints < R.accomplished.minResearch) {
      reasons.push(
        t(
          `أنجزنا ${s.researchPoints} أيام من الأبحاث من ${R.accomplished.minResearch} مطلوبة.`,
          `We completed ${s.researchPoints} research days of the ${R.accomplished.minResearch} needed.`,
        ),
      );
    }
    if (s.resources.food < R.accomplished.minFood) reasons.push(t(`المحاصيل وصلت ${r(s.resources.food)}% فقط (المطلوب ${R.accomplished.minFood}%).`, `Crops only reached ${r(s.resources.food)}% (${R.accomplished.minFood}% needed).`));
    if (s.resources.energy < R.accomplished.minEnergy) reasons.push(t(`البطارية انتهت عند ${r(s.resources.energy)} ك.و.س فقط.`, `The battery ended at only ${r(s.resources.energy)} kWh.`));
    if (s.resources.water < R.accomplished.minWater) reasons.push(t(`الماء انتهى عند ${r(s.resources.water)} لتر.`, `Water ended at ${r(s.resources.water)} L.`));
    if (ending === "A") {
      reasons.push(
        t(
          "حافظت على الطاقة والماء، وواصلت الأبحاث، ونمت المحاصيل — كل الأهداف تحققت والطاقم آمن.",
          "You kept power and water healthy, continued research and grew the crops — every goal met and the crew safe.",
        ),
      );
    }
  }
  reasons.push(t(`دعم الحياة يحتاج ${LOADS.lifeSupport} ك.و.س يوميًا ولم يُطفأ أبدًا — الطاقم آمن في كل النهايات.`, `Life support needs ${LOADS.lifeSupport} kWh a day and was never switched off — the crew is safe in every ending.`));
  return {
    ending,
    outcome: OUTCOME_OF[ending],
    crewSafe: true,
    final: { ...s.resources },
    reasons,
  };
}
