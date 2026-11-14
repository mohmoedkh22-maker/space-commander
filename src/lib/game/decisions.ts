import { LOADS, WATER } from "./config";
import type { Decision, DecisionId, GameState, T } from "./types";

const t = (ar: string, en: string): T => ({ ar, en });
const k = (n: number) => Math.round(n);

const withPolicy = (s: GameState, p: Partial<GameState["policy"]>): GameState => ({
  ...s,
  policy: { ...s.policy, ...p },
});

export const DECISIONS: Record<DecisionId, Decision> = {
  "d1-energy": {
    id: "d1-energy",
    day: 2,
    mission: 1,
    title: t("أزمة الطاقة", "Power Crisis"),
    problem: t(
      "توقعات الإضاءة تقول إن الألواح ستنتج اليوم أقل بكثير مما تحتاجه القاعدة إذا شغّلنا كل شيء كالمعتاد.",
      "The light forecast says the panels will make far less power today than the base uses when everything runs normally.",
    ),
    science: t(
      "قرب القطب الجنوبي للقمر تبقى الشمس منخفضة عند الأفق، فتلقي الجبال والفوهات ظلالًا طويلة. بيانات ناسا تقول إن موقعنا مضاء حوالي 88% من الوقت على المدى الطويل، لكن ليس كل يوم.",
      "Near the Moon's south pole the Sun stays low on the horizon, so mountains and craters cast long shadows. NASA data says our site is lit about 88% of the time over the long run — but not every single day.",
    ),
    hint: t(
      "اسأل نفسك: ما الذي يجب أن نحافظ عليه أولًا؟ وما الذي يمكن تقليله مؤقتًا؟",
      "Ask yourself: what must we protect first? What can we turn down for a while?",
    ),
    reports: [
      {
        title: t("تقرير الطاقة — آدم", "Energy report — Adam"),
        body: (s) =>
          t(
            `البطارية: ${k(s.batteryKWh)} ك.و.س. الإنتاج المتوقع اليوم أقل من نصف المعتاد.`,
            `Battery: ${k(s.batteryKWh)} kWh. Today's expected production is under half of normal.`,
          ),
      },
      {
        title: t("دعم الحياة — ليان", "Life support — Layan"),
        body: () =>
          t(
            `دعم الحياة يحتاج ${LOADS.lifeSupport} ك.و.س يوميًا كحد أدنى. هذا لا نقبل تقليله.`,
            `Life support needs at least ${LOADS.lifeSupport} kWh per day. We never cut this.`,
          ),
      },
      {
        title: t("المزرعة — ميرا", "Greenhouse — Mira"),
        body: (s) =>
          t(
            `نمو المحاصيل ${k(s.cropPct)}%. التشغيل الكامل يستهلك ${LOADS.greenhouse.full} ك.و.س، والمخفّض ${LOADS.greenhouse.reduced}.`,
            `Crops are ${k(s.cropPct)}% grown. Full lights use ${LOADS.greenhouse.full} kWh, reduced uses ${LOADS.greenhouse.reduced}.`,
          ),
      },
    ],
    options: [
      {
        id: "farm-full",
        label: t("نُبقي المزرعة بكامل طاقتها", "Keep the greenhouse at full power"),
        benefit: t("المحاصيل تستمر في النمو بسرعة", "Crops keep growing fast"),
        cost: t("البطارية تنخفض بسرعة", "The battery drains quickly"),
        apply: (s) => withPolicy(s, { greenhouse: "full", research: true }),
        suhail: t(
          "حافظت على نمو المحاصيل، لكنك استخدمت جزءًا كبيرًا من احتياطي البطارية. سأسجّل هذا القرار… قد يهمنا لاحقًا.",
          "You kept the crops growing, but used a big part of our battery reserve. I'll log this decision… it may matter later.",
        ),
        crew: { who: "mira", text: t("الظروف في المزرعة ممتازة يا قائد!", "Greenhouse conditions are great, Commander!") },
      },
      {
        id: "farm-reduced",
        label: t("نخفّض تشغيل المزرعة مؤقتًا", "Turn the greenhouse down for now"),
        benefit: t("نوفّر كهرباء أكثر", "We save more electricity"),
        cost: t("نمو المحاصيل يتأخر", "Crop growth slows down"),
        apply: (s) => withPolicy(s, { greenhouse: "reduced", research: true }),
        suhail: t(
          "حافظت على طاقة إضافية. لكن تذكّر: النباتات تحتاج وقتًا، ولا نستطيع تعويض نموها فورًا.",
          "You saved extra power. But remember: plants need time, and we can't make up their growth instantly.",
        ),
        crew: { who: "mira", text: t("خفّضت الإضاءة. النباتات ستنمو أبطأ.", "Lights dimmed. The plants will grow slower.") },
      },
      {
        id: "balance",
        label: t("نوزّع الطاقة حسب الأولويات", "Share power by priority"),
        benefit: t("دعم الحياة محمي، والمزرعة تعمل جزئيًا", "Life support protected, greenhouse partly on"),
        cost: t("نوقف الأبحاث العلمية مؤقتًا", "Science research pauses for now"),
        apply: (s) => withPolicy(s, { greenhouse: "reduced", research: false }),
        suhail: t(
          "اخترت توزيع الموارد حسب الأولويات. هذا لا يضمن غياب الصعوبات، لكنه يمنحنا مرونة.",
          "You shared resources by priority. It doesn't guarantee an easy road, but it gives us room to move.",
        ),
        crew: { who: "adam", text: t("توزيع الأحمال جاهز. سنراقب النتائج.", "Load sharing is set. We'll watch the results.") },
      },
      {
        id: "inspect",
        label: t("نفحص محطة الطاقة أولًا", "Inspect the power station first"),
        benefit: t("نكتشف المزيد عن الألواح قبل الخطة", "Learn more about the panels before planning"),
        cost: t("الفحص يأخذ وقت الطاقم وبعض الطاقة، ولا يغيّر كمية الضوء", "Inspection costs crew time and some power — it can't change the sunlight"),
        apply: (s) => ({
          ...withPolicy(s, { greenhouse: "reduced", research: false }),
          today: { ...s.today, extraLoadKWh: s.today.extraLoadKWh + LOADS.inspection },
          performanceFactor: 0.95, // ASSUMPTION: cleaning dust raises panel performance
          facilities: { ...s.facilities, energy: "serviced" },
          flags: { ...s.flags, panelsInspected: true },
        }),
        suhail: t(
          "فحص ذكي! وجد آدم غبارًا قمريًا على الألواح ونظّفها. الضوء نفسه لم يزد، لكن الألواح صارت تستفيد منه أكثر.",
          "Smart check! Adam found Moon dust on the panels and cleaned it. The sunlight didn't change — but the panels now use it better.",
        ),
        crew: { who: "adam", text: t("الألواح نظيفة الآن. كفاءتها أعلى.", "Panels are clean now. Their efficiency is up.") },
      },
    ],
  },

  "d2-water": {
    id: "d2-water",
    day: 3,
    mission: 2,
    title: t("القطرة الأخيرة", "The Last Drop"),
    problem: t(
      "نظام إعادة تدوير المياه يستعيد كمية أقل من المعتاد. نحتاج الماء للطاقم وللمزرعة.",
      "The water recycler is recovering less water than normal. We need water for the crew and the greenhouse.",
    ),
    science: t(
      "في الفضاء نعيد تدوير معظم الماء: الرطوبة والعرق وحتى البول تُنقّى من جديد. لكن أجهزة التنقية تحتاج كهرباء — فالماء والطاقة مترابطان.",
      "In space we recycle most water — humidity, sweat, even urine gets cleaned again. But the cleaning machines need electricity, so water and power are linked.",
    ),
    hint: t(
      "العلماء لا يبدأون بتخمين الحل. أحيانًا أفضل خطوة هي معرفة سبب المشكلة.",
      "Scientists don't start by guessing a fix. Sometimes the best first step is finding the cause.",
    ),
    reports: [
      {
        title: t("تقرير المياه — ليان", "Water report — Layan"),
        body: (s) =>
          t(
            `الخزان: ${k(s.waterL)} لتر. الاستعادة انخفضت إلى ${Math.round(s.recyclerEfficiency * 100)}%.`,
            `Tank: ${k(s.waterL)} L. Recovery dropped to ${Math.round(s.recyclerEfficiency * 100)}%.`,
          ),
      },
      {
        title: t("تقرير الطاقة — آدم", "Energy report — Adam"),
        body: (s) =>
          t(
            `البطارية: ${k(s.batteryKWh)} ك.و.س. التشغيل الإضافي للمدوّر يحتاج ${LOADS.recyclerBoostExtra} ك.و.س يوميًا.`,
            `Battery: ${k(s.batteryKWh)} kWh. Boosting the recycler needs ${LOADS.recyclerBoostExtra} kWh more per day.`,
          ),
      },
      {
        title: t("المزرعة — ميرا", "Greenhouse — Mira"),
        body: (s) =>
          t(
            s.cropPct < 45
              ? `المحاصيل عند ${k(s.cropPct)}% فقط. أي تقليل إضافي للماء سيؤخرها أكثر.`
              : `المحاصيل عند ${k(s.cropPct)}%. المزرعة تستهلك ${WATER.greenhouseNet[s.policy.greenhouse]} لترًا يوميًا.`,
            s.cropPct < 45
              ? `Crops are only ${k(s.cropPct)}% grown. Any extra water cut will slow them more.`
              : `Crops are ${k(s.cropPct)}% grown. The greenhouse uses ${WATER.greenhouseNet[s.policy.greenhouse]} L per day.`,
          ),
      },
    ],
    options: [
      {
        id: "boost",
        label: t("نزيد تشغيل نظام التدوير", "Run the recycler harder"),
        benefit: t("نستعيد ماءً أكثر", "Recover more water"),
        cost: t(`${LOADS.recyclerBoostExtra} ك.و.س إضافية يوميًا`, `${LOADS.recyclerBoostExtra} kWh extra every day`),
        locked: (s) =>
          s.batteryKWh < 150
            ? t(
                "احتياطي الطاقة غير كافٍ لهذه الخطة. (تذكّر قرار الطاقة في اليوم الثاني)",
                "Power reserve too low for this plan. (Remember the Day 2 energy decision)",
              )
            : null,
        apply: (s) => withPolicy(s, { recyclerBoost: true }),
        suhail: t(
          "المدوّر يعمل بقوة أكبر ويستعيد ماءً أكثر — لكن السبب الحقيقي ما زال موجودًا، ونحن ندفع ثمنه بالكهرباء كل يوم.",
          "The recycler works harder and recovers more water — but the real cause is still there, and we pay for it in power every day.",
        ),
        crew: { who: "layan", text: t("الاستعادة تحسّنت. سنراقب الطاقة.", "Recovery is up. We'll keep an eye on power.") },
      },
      {
        id: "cut-farm",
        label: t("نقلّل ماء المزرعة مؤقتًا", "Cut greenhouse water for now"),
        benefit: t("نحفظ الماء لاحتياجات الطاقم", "Save water for the crew"),
        cost: t("المحاصيل تكاد تتوقف عن النمو", "Crops almost stop growing"),
        apply: (s) => withPolicy(s, { greenhouse: "minimal" }),
        suhail: t(
          "القرار الذي يحفظ موردًا اليوم قد يؤثر على مورد آخر غدًا. هذا هو التحدي الحقيقي في إدارة القاعدة.",
          "A choice that saves one resource today can affect another tomorrow. That's the real challenge of running a base.",
        ),
        crew: { who: "mira", text: t("حفظنا الماء، لكن النباتات ستتباطأ.", "We saved water, but the plants will slow down.") },
      },
      {
        id: "repair",
        label: t("نفحص النظام ونصلح الخلل", "Diagnose and repair the system"),
        benefit: t("نعالج السبب نفسه إذا وجدنا العطل", "Fix the cause itself if we find the fault"),
        cost: t(`${LOADS.repair} ك.و.س للإصلاح، والطاقم مشغول يومًا كاملًا`, `${LOADS.repair} kWh for repairs, and the crew is busy all day`),
        locked: (s) =>
          s.batteryKWh < 100
            ? t("الإصلاح يحتاج 100 ك.و.س على الأقل في البطارية.", "Repairs need at least 100 kWh in the battery.")
            : null,
        apply: (s) => ({
          ...s,
          today: { extraLoadKWh: s.today.extraLoadKWh + LOADS.repair, researchPaused: true },
          flags: { ...s.flags, recyclerRepairPending: true },
        }),
        suhail: t(
          "أحسنت في البحث عن السبب! وجدت ميرا مرشّحًا مسدودًا. بعض المشكلات تحتاج تشخيصًا قبل أن نصرف موارد إضافية.",
          "Great job looking for the cause! Mira found a clogged filter. Some problems need a diagnosis before we spend extra resources.",
        ),
        crew: { who: "mira", text: t("استعدنا كفاءة النظام يا قائد!", "We restored the system's efficiency, Commander!") },
      },
      {
        id: "ration",
        label: t("نطبّق خطة ترشيد مدروسة", "Use a careful saving plan"),
        benefit: t("الطاقم يستهلك ماءً أقل", "The crew uses less water"),
        cost: t("نوقف بعض الأنشطة العلمية", "Some science work pauses"),
        apply: (s) => withPolicy(s, { ration: true, research: false }),
        suhail: t(
          "الترشيد يبطئ نزول الخزان، لكن العطل ما زال قائمًا. خطة معقولة عندما لا نستطيع الإصلاح الآن.",
          "Saving slows the tank's drop, but the fault is still there. A sensible plan when we can't repair right now.",
        ),
        crew: { who: "layan", text: t("خطة الترشيد مطبّقة. الطاقم متعاون.", "Saving plan active. The crew is on board.") },
      },
    ],
  },

  "d3-emergency": {
    id: "d3-emergency",
    day: 5,
    mission: 3,
    title: t("الإشارة الأخيرة", "The Final Signal"),
    problem: t(
      "الطاقم في المأوى، والأنظمة الحيوية تعمل. الآن: ما خطة التشغيل للأيام الثلاثة الأخيرة؟",
      "The crew is in the shelter and vital systems are running. Now: what's our operating plan for the last three days?",
    ),
    science: t(
      "الشمس أحيانًا تطلق دفعات من الجسيمات النشطة. على القمر لا يوجد غلاف جوي سميك يحمينا، لذلك يحتمي رواد الفضاء خلف دروع أو تحت التربة القمرية.",
      "The Sun sometimes throws out bursts of energetic particles. The Moon has no thick atmosphere to shield us, so astronauts shelter behind shielding or under lunar soil.",
    ),
    hint: t(
      "لا تختر بسرعة. ما الأنظمة التي يجب أن نحميها؟ وما الأنشطة التي نستطيع تأجيلها؟",
      "Don't rush. Which systems must we protect? Which activities can wait?",
    ),
    reports: [
      {
        title: t("حالة القاعدة — راشد", "Base status — Rashed"),
        body: (s) =>
          t(
            `البطارية ${k(s.batteryKWh)} ك.و.س، الماء ${k(s.waterL)} لتر، المحاصيل ${k(s.cropPct)}%. المأوى يحتاج ${LOADS.shelter} ك.و.س يوميًا.`,
            `Battery ${k(s.batteryKWh)} kWh, water ${k(s.waterL)} L, crops ${k(s.cropPct)}%. The shelter needs ${LOADS.shelter} kWh per day.`,
          ),
      },
    ],
    options: [
      {
        id: "full-ops",
        label: t("نواصل أغلب أهداف المهمة", "Continue most mission goals"),
        benefit: t("الأبحاث العلمية تستمر، والمزرعة تعمل جزئيًا", "Science research continues, greenhouse partly on"),
        cost: t("يستهلك طاقة أكثر من البطارية", "Draws more power from the battery"),
        locked: (s) =>
          s.batteryKWh < 150 || s.waterL < 300
            ? t("الموارد الحالية لا تكفي لهذه الخطة بأمان.", "Current resources can't support this plan safely.")
            : null,
        apply: (s) => withPolicy(s, { greenhouse: "reduced", research: true }),
        suhail: t(
          "مواردنا تسمح بذلك لأنك استعددت جيدًا في الأيام السابقة. سنراقب كل شيء.",
          "Our resources allow this because you prepared well in earlier days. We'll monitor everything.",
        ),
        crew: { who: "rashed", text: t("الخطة الكاملة قيد التنفيذ. الطاقم آمن.", "Full plan running. The crew is safe.") },
      },
      {
        id: "essential",
        label: t("الأنظمة الأساسية + مزرعة مخفّضة", "Essentials + reduced greenhouse"),
        benefit: t("حماية قوية مع بعض الإنتاج", "Strong protection with some production"),
        cost: t("نؤجل الأبحاث العلمية", "Research is postponed"),
        apply: (s) => withPolicy(s, { greenhouse: "reduced", research: false }),
        suhail: t(
          "خطة متوازنة. أحيانًا تأجيل نشاط غير ضروري هو القرار الصحيح في المهمات الفضائية.",
          "A balanced plan. In space missions, postponing a non-essential task is sometimes the right call.",
        ),
        crew: { who: "adam", text: t("خفّضنا الأحمال. الأنظمة الأساسية مستقرة.", "Loads reduced. Essential systems stable.") },
      },
      {
        id: "conserve",
        label: t("وضع الحفاظ على الموارد", "Resource conservation mode"),
        benefit: t("أقصى حماية للأنظمة الحيوية", "Maximum protection for vital systems"),
        cost: t("ننهي الأهداف البحثية مبكرًا", "Research goals end early"),
        apply: (s) => ({
          ...withPolicy(s, { greenhouse: "minimal", research: false, recyclerBoost: false }),
          flags: { ...s.flags, researchEnded: true },
        }),
        suhail: t(
          "فعّلنا خطة الحفاظ على الأنظمة الأساسية. سلامة الطاقم أهم من أي نقاط.",
          "Conservation plan active. Crew safety matters more than any score.",
        ),
        crew: { who: "layan", text: t("الأنظمة الحيوية محمية بالكامل.", "Vital systems are fully protected.") },
      },
    ],
  },
};

export const DECISION_ORDER: DecisionId[] = ["d1-energy", "d2-water", "d3-emergency"];
