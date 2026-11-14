// "Why did this happen?" — pure functions that turn state changes into child-friendly explanations.
import { ILLUMINATION } from "@/lib/nasa/illumination";
import { ENDING_RULES, LOADS } from "./config";
import { DECISIONS } from "./decisions";
import { computeEnding, isOptionLocked } from "./engine";
import type { Consequence, DayLog, DecisionId, FacilityConditions, GameState, MissionResult, T } from "./types";

const t = (ar: string, en: string): T => ({ ar, en });
const r = (n: number) => Math.round(n);

const FACILITY_NAMES: Record<keyof FacilityConditions, T> = {
  energy: t("محطة الطاقة", "Energy Station"),
  water: t("وحدة تدوير المياه", "Water Recycling"),
  greenhouse: t("المزرعة", "Greenhouse"),
  life: t("دعم الحياة", "Life Support"),
  shelter: t("المأوى", "Shelter"),
};

const CONDITION_TEXT: Record<string, T> = {
  nominal: t("يعمل طبيعيًا", "working normally"),
  serviced: t("نظيف ويعمل بكفاءة أعلى", "cleaned and more efficient"),
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
    effect: { resource: "batteryKWh", delta: after.batteryKWh - before.batteryKWh },
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
  const waterLost = before.waterL - after.waterL;
  out.push({
    kind: "water",
    text: t(
      `فقدنا ${r(waterLost)} لتر: الطاقم استخدم ${log.crewWaterUseL} لترًا واستعاد المدوّر ${r(log.recyclerEfficiency * 100)}% منها، والمزرعة استهلكت ${log.greenhouseWaterL} لترًا.`,
      `We lost ${r(waterLost)} L: the crew used ${log.crewWaterUseL} L and the recycler recovered ${r(log.recyclerEfficiency * 100)}% of it; the greenhouse used ${log.greenhouseWaterL} L.`,
    ),
    effect: { resource: "waterL", delta: after.waterL - before.waterL },
  });
  out.push({
    kind: "food",
    text:
      log.cropGrowth > 0
        ? t(`المحاصيل نمت ${log.cropGrowth}% حسب مستوى تشغيل المزرعة.`, `Crops grew ${log.cropGrowth}% based on how much the greenhouse was running.`)
        : t("المحاصيل لم تنمُ لأن الماء كان قليلًا جدًا.", "Crops didn't grow because there was too little water."),
    effect: { resource: "cropPct", delta: after.cropPct - before.cropPct },
  });
  if (log.shortfallKWh > 0) {
    out.push({
      kind: "oxygen",
      text: t(
        `نقص ${r(log.shortfallKWh)} ك.و.س جعل دعم الحياة يعمل تحت ضغط فانخفض الأكسجين قليلًا. الطاقم ما زال محميًا.`,
        `A ${r(log.shortfallKWh)} kWh shortfall put life support under strain, so oxygen dipped a little. The crew is still protected.`,
      ),
      effect: { resource: "oxygenPct", delta: after.oxygenPct - before.oxygenPct },
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
 * SUHAIL's guidance changes with the base's condition (so earlier decisions change what he says).
 * He explains the situation; he never picks the option.
 */
export function guidanceFor(at: DecisionId | "evt-fault", s: GameState): T {
  if (at === "evt-fault") {
    return s.batteryKWh < 150
      ? t(
          "مشكلة جديدة أيها القائد. واحتياطي البطارية محدود الآن — لن نستطيع زيادة تشغيل كل المعدات دون مراجعة الأنظمة الأخرى. هنا يظهر أثر قرارنا السابق.",
          "A new problem, Commander. And our battery reserve is limited now — we can't run every machine harder without checking other systems. Here's where our earlier decision shows up.",
        )
      : t(
          "مشكلة جديدة أيها القائد. لدينا احتياطي كهرباء جيد، وهذا يمنحنا مساحة إضافية — لكنه لا يجعل الموارد غير محدودة.",
          "A new problem, Commander. We have a good power reserve, which gives us extra room — but it doesn't make resources unlimited.",
        );
  }
  if (at === "d2-water") {
    if (isOptionLocked(s, "d2-water", "boost")) {
      return t(
        "تذكّر عندما استخدمنا جزءًا كبيرًا من الطاقة؟ ذلك القرار قيّد خياراتنا الآن. لا يزال بإمكاننا البحث عن خطة أخرى — ما سبب المشكلة برأيك؟",
        "Remember when we used a lot of power? That choice limits our options now. We can still find another plan — what do you think is causing the problem?",
      );
    }
    return DECISIONS["d2-water"].hint;
  }
  if (at === "d3-emergency") {
    if (isOptionLocked(s, "d3-emergency", "full-ops")) {
      return t(
        "احتياطياتنا أقل مما نحتاج لمواصلة كل الأهداف. ما الأنظمة الأساسية التي يجب أن نحميها؟ وما الأنشطة التي نستطيع تأجيلها؟",
        "Our reserves are lower than we need to keep every goal going. Which essential systems must we protect? Which activities can wait?",
      );
    }
    return t(
      "استعدادك في الأيام السابقة منحنا مرونة. لا تختر بسرعة: ما الذي يستحق الاستمرار، وما الذي نؤجله؟",
      "Your preparation in earlier days gave us flexibility. Don't rush: what is worth continuing, and what can wait?",
    );
  }
  return DECISIONS[at].hint;
}

/** Final result with plain reasons for the ending. */
export function missionResult(s: GameState): MissionResult {
  const ending = s.outcome ?? computeEnding(s);
  const R = ENDING_RULES;
  const reasons: T[] = [];
  if (s.flags.researchEnded) {
    reasons.push(t("اخترت وضع الحفاظ على الموارد، فتوقفت الأهداف البحثية مبكرًا.", "You chose conservation mode, so research goals ended early."));
  }
  if (s.shortfallDays > R.interrupted.maxShortfallDays) {
    reasons.push(t(`نقصت الكهرباء في ${s.shortfallDays} أيام.`, `Power ran short on ${s.shortfallDays} days.`));
  }
  if (s.waterL < R.interrupted.minWater) {
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
    if (s.cropPct < R.accomplished.minCrop) reasons.push(t(`المحاصيل وصلت ${r(s.cropPct)}% فقط.`, `Crops only reached ${r(s.cropPct)}%.`));
    if (s.batteryKWh < R.accomplished.minBattery) reasons.push(t(`البطارية انتهت عند ${r(s.batteryKWh)} ك.و.س فقط.`, `The battery ended at only ${r(s.batteryKWh)} kWh.`));
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
    crewSafe: true,
    final: { batteryKWh: s.batteryKWh, waterL: s.waterL, oxygenPct: s.oxygenPct, cropPct: s.cropPct },
    reasons,
  };
}
