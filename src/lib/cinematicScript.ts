// Bilingual script for the cinematic introduction (Arabic is the source text from the team's story).
import type { T } from "@/lib/game/types";
import { t } from "@/lib/i18n";

export const SCENES = ["space", "base", "command", "suhail", "commander", "explore", "day1"] as const;
export type SceneId = (typeof SCENES)[number];

export const SCENE_NAMES: Record<SceneId, T> = {
  space: t("الفضاء العميق", "Deep space"),
  base: t("القاعدة القمرية", "Lunar base"),
  command: t("مركز القيادة", "Command center"),
  suhail: t("تعرّف على سهيل", "Meet SUHAIL"),
  commander: t("أصبحت القائد", "Become the commander"),
  explore: t("استكشف قاعدتك", "Explore your base"),
  day1: t("اليوم الأول", "Mission Day 1"),
};

/** SUHAIL's welcome (scene 04), one subtitle per line. */
export const SUHAIL_WELCOME: T[] = [
  t("مرحبًا أيها القائد!\nأخيرًا وصلت إلى القاعدة SELENE-1.", "Hello, Commander!\nYou've finally reached base SELENE-1."),
  t("أنا سهيل، مساعدك الذكي خلال هذه المهمة.", "I'm SUHAIL, your smart assistant for this mission."),
  t(
    "على بُعد آلاف الكيلومترات من الأرض، يعيش أربعة رواد فضاء داخل هذه القاعدة.",
    "Hundreds of thousands of kilometres from Earth, four astronauts live inside this base.",
  ),
  t("هنا، لدينا الطاقة والمياه والأكسجين والغذاء.", "Here, we have energy, water, oxygen and food."),
  t(
    "لكن انتبه! هذه الموارد ليست غير محدودة.\nكل نظام في القاعدة يعتمد على أنظمة أخرى.",
    "But careful! These resources are not unlimited.\nEvery system on the base depends on the others.",
  ),
  t(
    "وأنت الآن قائد المهمة.\nقراراتك ستحدد كيف سنستخدم مواردنا خلال الأيام السبعة القادمة.",
    "And you are now the mission commander.\nYour decisions will decide how we use our resources over the next seven days.",
  ),
  t("هل أنت مستعد لخوض مغامرتنا؟", "Are you ready for our adventure?"),
];

/** SUHAIL's send-off (scene 07). */
export const SUHAIL_DAY1: T[] = [
  t("ممتاز أيها القائد!\nالآن أصبحت تعرف أهم أجزاء قاعدتنا.", "Excellent, Commander!\nNow you know the most important parts of our base."),
  t(
    "لكن تذكر...\nالطاقة والمياه والغذاء والهواء كلها مرتبطة ببعضها.",
    "But remember…\nenergy, water, food and air are all connected.",
  ),
  t("كل قرار تتخذه قد يغير ما نستطيع فعله لاحقًا.", "Every decision you make can change what we can do later."),
  t("سأكون معك في كل خطوة.\nهيا بنا، لدينا سبعة أيام من المغامرة والاكتشاف!", "I'll be with you every step of the way.\nLet's go — we have seven days of adventure and discovery!"),
];

export const RESPONSIBILITIES: { icon: string; text: T }[] = [
  { icon: "⚡", text: t("إدارة الطاقة", "Manage energy") },
  { icon: "💧", text: t("حماية مخزون المياه", "Protect water supplies") },
  { icon: "🫧", text: t("الحفاظ على الأكسجين ودعم الحياة", "Maintain oxygen and life support") },
  { icon: "🌱", text: t("دعم إنتاج الغذاء", "Support food production") },
  { icon: "🛡️", text: t("حماية الطاقم", "Protect the crew") },
  { icon: "🧭", text: t("اتخاذ قرارات تؤثر في المهمات القادمة", "Make decisions that shape future missions") },
];

export type ExploreId = "energy" | "water" | "greenhouse" | "life";
export const EXPLORE: { id: ExploreId; name: T; line: T }[] = [
  {
    id: "energy",
    name: t("محطة الطاقة", "Power Station"),
    line: t(
      "تجمع الألواح الشمسية الضوء لإنتاج الكهرباء، وتخزن البطاريات جزءًا منها.",
      "Solar panels collect sunlight to make electricity, and batteries store some of it.",
    ),
  },
  {
    id: "water",
    name: t("نظام تدوير المياه", "Water Recycling System"),
    line: t("نعالج المياه ونعيد استخدامها لتقليل الهدر.", "We clean water and use it again to reduce waste."),
  },
  {
    id: "greenhouse",
    name: t("المزرعة الفضائية", "Space Greenhouse"),
    line: t("هنا نزرع المحاصيل التي تساعدنا في توفير الغذاء.", "Here we grow the crops that help provide our food."),
  },
  {
    id: "life",
    name: t("نظام دعم الحياة", "Life Support System"),
    line: t(
      "يساعدنا هذا النظام على الحفاظ على بيئة مناسبة لعيش الطاقم.",
      "This system keeps the base a safe, comfortable place for the crew to live.",
    ),
  },
];

export const CINE_UI = {
  skip: t("تخطي المقدمة", "Skip intro"),
  next: t("متابعة", "Continue"),
  replay: t("إعادة", "Replay"),
  finish: t("أنا مستعد!", "I'm ready!"),
  sound: t("المؤثرات", "Sound"),
  music: t("الموسيقى", "Music"),
  soundHint: t("🎧 شغّل الصوت لتجربة سينمائية كاملة", "🎧 Turn on sound for the full cinematic experience"),
  outpost: t("محطة أبحاث قمرية", "LUNAR RESEARCH OUTPOST"),
  southPole: t("قرب القطب الجنوبي للقمر", "Near the Moon's south pole"),
  missionBegins: t("مهمتك تبدأ هنا", "YOUR MISSION BEGINS HERE"),
  youAreCommander: t("أنت الآن قائد القاعدة SELENE-1.", "You are now the commander of SELENE-1."),
  responsibilities: t("مسؤولياتك", "Your responsibilities"),
  resources: t("الموارد الأربعة", "The four resources"),
  crew: t("طاقمك", "Your crew"),
  exploreTitle: t("استكشف قاعدتك", "Explore your base"),
  exploreHint: t("اضغط على كل مرفق ليعرّفك عليه سهيل.", "Tap each facility and SUHAIL will introduce it."),
  exploreIntro: t("هذه قاعدتك! اختر مرفقًا وسأخبرك ماذا يفعل.", "This is your base! Pick a facility and I'll tell you what it does."),
  explored: t("المرافق التي استكشفتها", "Facilities explored"),
  backToCommand: t("العودة إلى مركز القيادة", "Back to the command center"),
  day1: t("اليوم الأول للمهمة", "MISSION DAY 1"),
  online: t("الأنظمة تعمل", "SYSTEMS ONLINE"),
  start: t("ابدأ المهمة", "Start the mission"),
  scene: t("المشهد", "Scene"),
  tapToContinue: t("اضغط للمتابعة", "Tap to continue"),
};
