// Decision DATA. Options are declarative: the engine interprets prerequisites and effects,
// the UI renders them. Adding an option needs no engine change.
import { LOADS, THRESHOLDS, WATER } from "./config";
import type { Decision, DecisionId, T } from "./types";

const t = (ar: string, en: string): T => ({ ar, en });
const k = (n: number) => Math.round(n);

const SAFETY_FIRST = {
  kind: "safety-checks" as const,
  reason: t("أكمل خطوات السلامة الأربع أولًا.", "Complete the four safety steps first."),
};

export const DECISIONS: Record<DecisionId, Decision> = {
  /* ---------------- MISSION 01 — THE VANISHING SUN ---------------- */
  "d1-energy": {
    id: "d1-energy",
    day: 2,
    mission: 1,
    title: t("أزمة الطاقة", "Power Crisis"),
    problem: t(
      "الطاقة الشمسية المتاحة أقل من المتوقع. كيف ستشغّل القاعدة اليوم؟",
      "Available solar energy is lower than expected. How will you run the base today?",
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
            `البطارية: ${k(s.resources.energy)} ك.و.س. الإنتاج المتوقع اليوم أقل من نصف المعتاد.`,
            `Battery: ${k(s.resources.energy)} kWh. Today's expected production is under half of normal.`,
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
            `نمو المحاصيل ${k(s.resources.food)}%. التشغيل الكامل يستهلك ${LOADS.greenhouse.full} ك.و.س، والمعتدل ${LOADS.greenhouse.reduced}، والأدنى ${LOADS.greenhouse.minimal}.`,
            `Crops are ${k(s.resources.food)}% grown. Full lights use ${LOADS.greenhouse.full} kWh, moderate ${LOADS.greenhouse.reduced}, minimum ${LOADS.greenhouse.minimal}.`,
          ),
      },
    ],
    options: [
      {
        id: "farm-full",
        label: t("أعطِ الأولوية للمزرعة", "Prioritize the greenhouse"),
        description: t("نُبقي المزرعة والأبحاث بكامل طاقتها.", "Keep the greenhouse and research at full power."),
        benefit: t("المزرعة في أفضل حال والمحاصيل تنمو بسرعة", "Greenhouse at its best, crops grow fast"),
        cost: t("طاقة أكثر واحتياطي بطارية أقل", "More energy used, smaller battery reserve"),
        policy: { greenhouse: "full", research: true },
        facilityEffects: { greenhouse: "thriving" },
        consequences: [
          t("احتياطي البطارية سينخفض بسرعة اليوم.", "The battery reserve will drop quickly today."),
          t("قد تكون خيارات الطاقة أضيق في المهمة القادمة.", "Energy options may be tighter in the next mission."),
        ],
        explanation: t(
          "النباتات تحتاج ضوءًا للنمو، وأضواء النمو تستهلك كهرباء. عندما تقل الشمس، كل كيلوواط للمزرعة يأتي من البطارية.",
          "Plants need light to grow, and grow lights use electricity. With less sunlight, every kilowatt for the greenhouse comes from the battery.",
        ),
        suhail: t(
          "حافظت على نمو المحاصيل، لكنك استخدمت جزءًا كبيرًا من احتياطي البطارية. سأسجّل هذا القرار… قد يهمنا لاحقًا.",
          "You kept the crops growing, but used a big part of our battery reserve. I'll log this decision… it may matter later.",
        ),
        crew: { who: "mira", text: t("الظروف في المزرعة ممتازة يا قائد!", "Greenhouse conditions are great, Commander!") },
      },
      {
        id: "save-energy",
        label: t("وفّر الطاقة", "Conserve energy"),
        description: t("نخفّض المزرعة إلى الحد الأدنى ونؤجل الأبحاث.", "Turn the greenhouse to minimum and pause research."),
        benefit: t("أكبر احتياطي ممكن من الطاقة", "The biggest possible energy reserve"),
        cost: t("نمو المحاصيل يتباطأ كثيرًا", "Crop growth slows a lot"),
        policy: { greenhouse: "minimal", research: false },
        facilityEffects: { greenhouse: "dormant" },
        consequences: [
          t("نحفظ أكبر قدر من الكهرباء للأيام القادمة.", "We save the most electricity for the coming days."),
          t("المحاصيل ستحتاج وقتًا أطول لتنمو.", "Crops will need much longer to grow."),
        ],
        explanation: t(
          "البطارية مثل خزان للطاقة: كلما وفّرنا اليوم، صار عندنا مرونة أكبر لاحقًا — لكن التوفير له ثمن.",
          "A battery is like an energy tank: the more we save today, the more flexibility we have later — but saving has a price.",
        ),
        suhail: t(
          "حافظت على طاقة إضافية. لكن تذكّر: النباتات تحتاج وقتًا، ولا نستطيع تعويض نموها فورًا.",
          "You saved extra power. But remember: plants need time, and we can't make up their growth instantly.",
        ),
        crew: { who: "mira", text: t("خفّضت الإضاءة إلى الحد الأدنى. النباتات ستنمو ببطء.", "Lights at minimum. The plants will grow slowly.") },
      },
      {
        id: "balance",
        label: t("وازن الأحمال", "Balance energy loads"),
        description: t("نحمي الأنظمة الأساسية، ونؤجل الأبحاث، ونُبقي المزرعة بتشغيل معتدل.", "Protect essentials, pause research, keep the greenhouse moderate."),
        benefit: t("احتياطي متوازن والمزرعة تعمل جزئيًا", "A balanced reserve, greenhouse partly on"),
        cost: t("الأبحاث العلمية تتوقف مؤقتًا", "Science research pauses for now"),
        policy: { greenhouse: "reduced", research: false },
        facilityEffects: { greenhouse: "reduced" },
        consequences: [
          t("دعم الحياة محمي واحتياطي البطارية متوسط.", "Life support is protected and the battery reserve stays moderate."),
          t("المحاصيل تنمو بسرعة متوسطة.", "Crops keep growing at a moderate pace."),
        ],
        explanation: t(
          "المهندسون يرتبون الأنظمة حسب الأهمية: الأساسي أولًا، ثم المفيد، ثم ما يمكن تأجيله.",
          "Engineers rank systems by importance: essentials first, then useful ones, then what can wait.",
        ),
        suhail: t(
          "اخترت توزيع الموارد حسب الأولويات. هذا لا يضمن غياب الصعوبات، لكنه يمنحنا مرونة.",
          "You shared resources by priority. It doesn't guarantee an easy road, but it gives us room to move.",
        ),
        crew: { who: "adam", text: t("توزيع الأحمال جاهز. سنراقب النتائج.", "Load sharing is set. We'll watch the results.") },
      },
    ],
  },

  /* ---------------- MISSION 02 — THE LAST DROP ---------------- */
  "d2-water": {
    id: "d2-water",
    day: 3,
    mission: 2,
    title: t("القطرة الأخيرة", "The Last Drop"),
    problem: t(
      "كفاءة استعادة المياه انخفضت. نحتاج الماء للطاقم وللمزرعة.",
      "Water recovery efficiency has dropped. We need water for the crew and the greenhouse.",
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
            `الخزان: ${k(s.resources.water)} لتر. الاستعادة انخفضت إلى ${Math.round(s.recyclerEfficiency * 100)}%.`,
            `Tank: ${k(s.resources.water)} L. Recovery dropped to ${Math.round(s.recyclerEfficiency * 100)}%.`,
          ),
      },
      {
        title: t("تقرير الطاقة — آدم", "Energy report — Adam"),
        body: (s) =>
          t(
            `البطارية: ${k(s.resources.energy)} ك.و.س. زيادة التدوير تحتاج ${THRESHOLDS.boostMinEnergy} ك.و.س على الأقل، و${LOADS.recyclerBoostExtra} إضافية يوميًا.`,
            `Battery: ${k(s.resources.energy)} kWh. Boosting the recycler needs at least ${THRESHOLDS.boostMinEnergy} kWh, plus ${LOADS.recyclerBoostExtra} more per day.`,
          ),
      },
      {
        title: t("المزرعة — ميرا", "Greenhouse — Mira"),
        body: (s) =>
          t(
            `المحاصيل عند ${k(s.resources.food)}%. المزرعة تستهلك ${WATER.greenhouseNet[s.policy.greenhouse]} لترًا يوميًا.`,
            `Crops are ${k(s.resources.food)}% grown. The greenhouse uses ${WATER.greenhouseNet[s.policy.greenhouse]} L per day.`,
          ),
      },
    ],
    options: [
      {
        id: "boost",
        label: t("زِد تدوير المياه", "Increase water recycling"),
        description: t("نشغّل المدوّر بقوة أكبر.", "Run the recycler harder."),
        benefit: t("نستعيد ماءً أكثر ويتحسن نظام المياه", "Recover more water, better water system"),
        cost: t(`${LOADS.recyclerBoostExtra} ك.و.س إضافية يوميًا`, `${LOADS.recyclerBoostExtra} kWh extra every day`),
        prerequisites: [
          {
            kind: "resource-min",
            resource: "energy",
            min: THRESHOLDS.boostMinEnergy,
            reason: t(
              `يحتاج ${THRESHOLDS.boostMinEnergy} ك.و.س على الأقل في البطارية. (تذكّر قرار الطاقة في المهمة الأولى)`,
              `Needs at least ${THRESHOLDS.boostMinEnergy} kWh in the battery. (Remember your Mission 1 energy decision)`,
            ),
          },
        ],
        policy: { recyclerBoost: true },
        facilityEffects: { waterRecycling: "boosted" },
        consequences: [
          t("نستعيد ماءً أكثر كل يوم.", "We recover more water every day."),
          t("المدوّر يستهلك كهرباء إضافية كل يوم، والعطل ما زال موجودًا.", "The recycler uses extra power every day, and the fault is still there."),
        ],
        explanation: t(
          "تشغيل الآلة بقوة أكبر يعوّض ضعفها مؤقتًا، لكنه يستهلك طاقة ولا يعالج السبب.",
          "Running a machine harder makes up for a weakness for a while, but it costs energy and doesn't fix the cause.",
        ),
        suhail: t(
          "المدوّر يعمل بقوة أكبر ويستعيد ماءً أكثر — لكن السبب الحقيقي ما زال موجودًا، ونحن ندفع ثمنه بالكهرباء كل يوم.",
          "The recycler works harder and recovers more water — but the real cause is still there, and we pay for it in power every day.",
        ),
        crew: { who: "layan", text: t("الاستعادة تحسّنت. سنراقب الطاقة.", "Recovery is up. We'll keep an eye on power.") },
      },
      {
        id: "cut-farm",
        label: t("قلّل ماء المزرعة", "Reduce greenhouse water"),
        description: t("نحوّل الماء لاحتياجات الطاقم الأساسية.", "Send water to the crew's essential needs first."),
        benefit: t("نحفظ الماء لاحتياجات الطاقم", "Saves water for the crew's needs"),
        cost: t("المحاصيل تكاد تتوقف عن النمو", "Crops almost stop growing"),
        policy: { greenhouse: "minimal" },
        facilityEffects: { greenhouse: "dormant" },
        consequences: [
          t("الطاقم يحصل على الماء الذي يحتاجه.", "The crew gets the water it needs."),
          t("المحاصيل تتباطأ، فقد يقل الغذاء لاحقًا.", "Crops slow down, so food may run lower later."),
        ],
        explanation: t(
          "الماء نفسه يُستخدم للشرب والزراعة. حين يقل، علينا أن نقرر لمن نعطيه أولًا.",
          "The same water is used for drinking and farming. When it runs low, we must decide who gets it first.",
        ),
        suhail: t(
          "القرار الذي يحفظ موردًا اليوم قد يؤثر على مورد آخر غدًا. هذا هو التحدي الحقيقي في إدارة القاعدة.",
          "A choice that saves one resource today can affect another tomorrow. That's the real challenge of running a base.",
        ),
        crew: { who: "mira", text: t("حفظنا الماء، لكن النباتات ستتباطأ.", "We saved water, but the plants will slow down.") },
      },
      {
        id: "repair",
        label: t("افحص وأصلح", "Inspect and repair"),
        description: t("نبحث عن سبب العطل ونصلحه.", "Find the cause of the fault and fix it."),
        benefit: t("نعالج السبب نفسه، فتعود الاستعادة لطبيعتها", "Fixes the cause, recovery returns to normal"),
        cost: t(`${LOADS.repair} ك.و.س ويوم عمل كامل للطاقم`, `${LOADS.repair} kWh and a full day of crew time`),
        prerequisites: [
          {
            kind: "resource-min",
            resource: "energy",
            min: THRESHOLDS.repairMinEnergy,
            reason: t(
              `الإصلاح يحتاج ${THRESHOLDS.repairMinEnergy} ك.و.س على الأقل في البطارية.`,
              `Repairs need at least ${THRESHOLDS.repairMinEnergy} kWh in the battery.`,
            ),
          },
        ],
        today: { extraLoadKWh: LOADS.repair, researchPaused: true },
        flags: { recyclerRepairPending: true },
        consequences: [
          t("وجدنا مرشّحًا مسدودًا. المدوّر يعود لكفاءته من الغد.", "We found a clogged filter. The recycler is back to full efficiency from tomorrow."),
          t("اليوم نستهلك طاقة إضافية للإصلاح.", "Today we use extra energy for the repair."),
        ],
        explanation: t(
          "التشخيص أولًا: معرفة السبب تمنعنا من صرف موارد على حلول مؤقتة.",
          "Diagnosis first: knowing the cause stops us spending resources on temporary fixes.",
        ),
        suhail: t(
          "أحسنت في البحث عن السبب! بعض المشكلات تحتاج تشخيصًا قبل أن نصرف موارد إضافية.",
          "Great job looking for the cause! Some problems need a diagnosis before we spend extra resources.",
        ),
        crew: { who: "mira", text: t("استعدنا كفاءة النظام يا قائد!", "We restored the system's efficiency, Commander!") },
      },
    ],
  },

  /* ---------------- MISSION 03 — THE FINAL SIGNAL ---------------- */
  "d3-emergency": {
    id: "d3-emergency",
    day: 5,
    mission: 3,
    title: t("الإشارة الأخيرة", "The Final Signal"),
    problem: t(
      "الطاقم في المأوى والأنظمة الحيوية تعمل. ما خطة التشغيل للأيام الثلاثة الأخيرة؟",
      "The crew is in the shelter and vital systems are running. What's the operating plan for the last three days?",
    ),
    science: t(
      "الشمس أحيانًا تطلق دفعات من الجسيمات النشطة. على القمر لا يوجد غلاف جوي سميك يحمينا، لذلك يحتمي رواد الفضاء خلف دروع أو تحت التربة القمرية. (سيناريو تدريبي، ليس تنبؤًا حقيقيًا)",
      "The Sun sometimes throws out bursts of energetic particles. The Moon has no thick atmosphere, so astronauts shelter behind shielding or under lunar soil. (Training scenario, not a real forecast.)",
    ),
    hint: t(
      "لا تختر بسرعة. ما الأنظمة التي يجب أن نحميها؟ وما الأنشطة التي نستطيع تأجيلها؟",
      "Don't rush. Which systems must we protect? Which activities can wait?",
    ),
    reports: [
      {
        title: t("حالة القاعدة — راشد", "Base status — Rashid"),
        body: (s) =>
          t(
            `البطارية ${k(s.resources.energy)} ك.و.س، الماء ${k(s.resources.water)} لتر، الأكسجين ${k(s.resources.oxygen)}%، الغذاء ${k(s.resources.food)}%. المأوى يحتاج ${LOADS.shelter} ك.و.س يوميًا.`,
            `Battery ${k(s.resources.energy)} kWh, water ${k(s.resources.water)} L, oxygen ${k(s.resources.oxygen)}%, food ${k(s.resources.food)}%. The shelter needs ${LOADS.shelter} kWh per day.`,
          ),
      },
    ],
    options: [
      {
        id: "full-ops",
        label: t("واصل أغلب أهداف المهمة", "Continue most mission goals"),
        description: t("الأبحاث مستمرة والمزرعة بتشغيل معتدل.", "Research continues, greenhouse moderate."),
        benefit: t("الأبحاث العلمية تستمر", "Science research continues"),
        cost: t("يستهلك طاقة أكثر من البطارية", "Draws more power from the battery"),
        prerequisites: [
          SAFETY_FIRST,
          {
            kind: "resource-min",
            resource: "energy",
            min: THRESHOLDS.fullOpsMinEnergy,
            reason: t("الطاقة الحالية لا تكفي لهذه الخطة بأمان.", "Current energy can't support this plan safely."),
          },
          {
            kind: "resource-min",
            resource: "water",
            min: THRESHOLDS.fullOpsMinWater,
            reason: t("الماء الحالي لا يكفي لهذه الخطة بأمان.", "Current water can't support this plan safely."),
          },
        ],
        policy: { greenhouse: "reduced", research: true },
        consequences: [t("الأبحاث تستمر رغم الطوارئ.", "Research continues through the emergency.")],
        explanation: t(
          "الاستعداد المبكر يمنحنا خيارات وقت الأزمات.",
          "Preparing early gives us choices when a crisis comes.",
        ),
        suhail: t(
          "مواردنا تسمح بذلك لأنك استعددت جيدًا في الأيام السابقة. سنراقب كل شيء.",
          "Our resources allow this because you prepared well in earlier days. We'll monitor everything.",
        ),
        crew: { who: "rashed", text: t("الخطة قيد التنفيذ. الطاقم آمن.", "Plan running. The crew is safe.") },
      },
      {
        id: "essential",
        label: t("الأساسيات + مزرعة معتدلة", "Essentials + moderate greenhouse"),
        description: t("نؤجل الأبحاث ونحمي الأنظمة الأساسية.", "Pause research and protect essential systems."),
        benefit: t("حماية قوية مع بعض الإنتاج", "Strong protection with some production"),
        cost: t("نؤجل الأبحاث العلمية", "Research is postponed"),
        prerequisites: [SAFETY_FIRST],
        policy: { greenhouse: "reduced", research: false },
        consequences: [t("الأنظمة الأساسية محمية، والأبحاث مؤجلة.", "Essential systems are protected; research is postponed.")],
        explanation: t(
          "في المهمات الفضائية، تأجيل نشاط غير ضروري قد يكون القرار الأذكى.",
          "In space missions, postponing a non-essential task can be the smartest decision.",
        ),
        suhail: t(
          "خطة متوازنة. أحيانًا تأجيل نشاط غير ضروري هو القرار الصحيح.",
          "A balanced plan. Sometimes postponing a non-essential task is the right call.",
        ),
        crew: { who: "adam", text: t("خفّضنا الأحمال. الأنظمة الأساسية مستقرة.", "Loads reduced. Essential systems stable.") },
      },
      {
        id: "conserve",
        label: t("وضع الحفاظ على الموارد", "Resource conservation mode"),
        description: t("نوقف كل شيء غير ضروري ونُنهي الأبحاث.", "Stop everything non-essential and end research."),
        benefit: t("أقصى حماية للأنظمة الحيوية", "Maximum protection for vital systems"),
        cost: t("ننهي الأهداف البحثية مبكرًا", "Research goals end early"),
        prerequisites: [SAFETY_FIRST],
        policy: { greenhouse: "minimal", research: false, recyclerBoost: false },
        flags: { researchEnded: true },
        consequences: [t("أنهينا الأهداف البحثية مبكرًا لحماية الطاقم.", "We ended research goals early to protect the crew.")],
        explanation: t(
          "حين تقل الموارد كثيرًا، نحمي الحياة أولًا ونؤجل كل ما عداها.",
          "When resources run very low, we protect life first and postpone everything else.",
        ),
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
