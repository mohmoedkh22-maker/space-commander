// Bilingual script for the cinematic opening (Phase 1 of the cinematic experience).
// WONDER → RESPONSIBILITY → DISCOVERY. Arabic is the source text; the story is fictional.
import type { CrewId, T } from "@/lib/game/types";
import { t } from "@/lib/i18n";

/** Six scenes: deep space → approach → mission alert → SUHAIL → crew → commander moment. */
export const SCENES = ["space", "approach", "alert", "suhail", "crew", "commander"] as const;
export type SceneId = (typeof SCENES)[number];

export const SCENE_NAMES: Record<SceneId, T> = {
  space: t("الفضاء العميق", "Deep space"),
  approach: t("الاقتراب من القمر", "Approaching the Moon"),
  alert: t("نداء المهمة", "The mission alert"),
  suhail: t("تعرّف على سهيل", "Meet SUHAIL"),
  crew: t("الطاقم", "The crew"),
  commander: t("لحظة القائد", "The commander moment"),
};

/** Establishing shots advance by themselves (ms); the child can always press Continue sooner. */
export const SCENE_AUTO_MS: Partial<Record<SceneId, number>> = { space: 8000, approach: 10000, alert: 10000 };
/** With Reduce Motion the same scenes hold a shorter, still frame. */
export const SCENE_AUTO_REDUCED_MS = 4000;
/** Each crew member's spotlight (ms) before the next one steps in. */
export const CREW_SPOTLIGHT_MS = 3200;

/** Scene 3: a short transmission from (fictional) Mission Control on Earth. */
export const ALERT = {
  from: t("مركز التحكم بالمهمة · الأرض", "MISSION CONTROL · EARTH"),
  title: t("رسالة واردة", "INCOMING TRANSMISSION"),
  lines: [
    t("إلى قاعدة SELENE-1…", "To base SELENE-1…"),
    t("القاعدة تحتاج قائدًا جديدًا يرعى أنظمة الحياة فيها.", "The base needs a new commander to watch over its survival systems."),
    t("الطاقة · الماء · الهواء · الغذاء", "Energy · Water · Air · Food"),
  ],
  question: t("هل أنت القائد الذي ننتظره؟", "Are you the commander we've been waiting for?"),
};

/** Scene 4: SUHAIL's welcome (from the approved script). */
export const SUHAIL_WELCOME: T[] = [
  t("مرحبًا أيها القائد!", "Hello, Commander!"),
  t("أنا سهيل، مساعدك العلمي في قاعدة SELENE-1.", "I'm SUHAIL, your science assistant on base SELENE-1."),
  t("لدينا مهمة مهمة اليوم… هل أنت مستعد لاكتشاف أسرار القمر؟", "We have an important mission today… are you ready to discover the Moon's secrets?"),
];

/** Scene 5: one short line per crew member — specialty and personality, no biographies. */
export const CREW_INTRO: { id: CrewId; icon: string; line: T }[] = [
  { id: "layan", icon: "🫧", line: t("أنا ليان. أتأكد أن كل نَفَس تأخذه هنا آمن.", "I'm Layan. I make sure every breath you take here is safe.") },
  { id: "adam", icon: "⚡", line: t("أنا آدم. كل كيلوواط في هذه القاعدة يمرّ من عندي.", "I'm Adam. Every kilowatt on this base passes through me.") },
  { id: "mira", icon: "🌱", line: t("أنا ميرا. نباتاتي تحوّل الضوء والماء إلى غذاء.", "I'm Mira. My plants turn light and water into food.") },
  { id: "rashed", icon: "🛡️", line: t("أنا راشد. مهمتي أن يعود الجميع سالمين.", "I'm Rashid. My job is to bring everyone home safe.") },
];

/** Scene 6: the responsibility moment. */
export const COMMANDER_LINES: T[] = [
  t("هذه القاعدة أصبحت مسؤوليتك الآن.", "This base is your responsibility now."),
  t("قراراتك ستحدد كيف نعيش ونستكشف القمر.", "Your decisions will shape how we live and explore on the Moon."),
];
export const READY_QUESTION = t("هل أنت مستعد لقيادة المهمة؟", "Are you ready to lead the mission?");

/** "Discover the story" — the same story as the start menu, kept short. */
export const STORY = {
  title: t("عملية ضوء القمر", "Operation Moonlight"),
  lead: t("سبعة أيام. أربعة رواد فضاء. قائد واحد.", "Seven days. Four astronauts. One commander."),
  body: t(
    "أنت القائد الجديد لقاعدة SELENE-1 البحثية قرب القطب الجنوبي للقمر. الطاقة والماء والغذاء والهواء مترابطة، وكل قرار تتخذه يغيّر ما سيحدث لاحقًا. ضوء الشمس في كل يوم من بيانات ناسا الحقيقية؛ القاعدة والطاقم والأحداث خيالية.",
    "You are the new commander of SELENE-1, a research base near the Moon's south pole. Power, water, food and air are all linked — and every decision changes what happens next. Each day's sunlight comes from real NASA data; the base, crew and events are fictional.",
  ),
  chapters: [
    t("الفصل 1 — الشمس التي تختفي (الطاقة)", "Chapter 1 — The Vanishing Sun (energy)"),
    t("الفصل 2 — القطرة الأخيرة (الماء والغذاء)", "Chapter 2 — The Last Drop (water and food)"),
    t("الفصل 3 — الإشارة الأخيرة (سلامة الطاقم)", "Chapter 3 — The Final Signal (crew safety)"),
  ],
};

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
  startMission: t("ابدأ المهمة", "Start Mission"),
  discoverStory: t("اكتشف القصة", "Discover the story"),
  close: t("إغلاق", "Close"),
  meetCrew: t("تعرّف على طاقمك", "Meet your crew"),
  nextCrew: t("التالي", "Next"),
  scene: t("المشهد", "Scene"),
};
