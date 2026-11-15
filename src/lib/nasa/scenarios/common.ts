// WP06.4 — wording shared by all scenarios (bilingual, child-friendly, scientifically careful).
import { t, type DataQuality, type WhatIfHook } from "./types.ts";

/** Neither DONKI nor RadLab provides a confidence score, so none is invented. */
export const NO_CONFIDENCE: Pick<DataQuality, "confidence" | "confidenceNote"> = {
  confidence: null,
  confidenceNote: t(
    "لا تقدّم ناسا درجة ثقة رقمية لهذا السجل، لذلك لم نضع رقمًا. مؤشرات الجودة أدناه منقولة من المصدر كما هي.",
    "NASA provides no numeric confidence score for this record, so none is given. The quality indicators are copied from the source as they are.",
  ),
};

export const COMMON_LIMITS = {
  notLive: [t("بيانات تاريخية محفوظة، وليست طقسًا فضائيًا حاليًا.", "Historical, cached data: not current space weather.")],
  radiation: [
    t("القراءة من جهاز الكشف نفسه (جرعة ممتصة في مادة الكاشف)، وليست جرعة في جسم رائد فضاء.", "The reading is from the detector itself (absorbed dose in the detector material), not a dose in an astronaut's body."),
    t("لا نحسب الجرعة المكافئة من الجرعة الممتصة.", "No equivalent dose is calculated from the absorbed dose."),
    t("مادة الكاشف غير مذكورة في بيانات RadLab، فهي غير معروفة هنا.", "The detector material is not stated by RadLab, so it is unknown here."),
    t(
      "التوقيت محفوظ كما ورد بدون منطقة زمنية؛ اليوم محسوب بافتراض UTC، وهذا افتراض غير مؤكد.",
      "Timestamps are kept as returned, without a timezone; the day is grouped assuming UTC, which is unconfirmed.",
    ),
    t("القراءة الصفرية لا تعني انعدام الإشعاع؛ قد تكون انقطاعًا في الجهاز.", "A zero reading does not mean no radiation; it may be an instrument dropout."),
    t("الفجوات في البيانات لم تُملأ.", "Gaps in the data were not filled."),
    t("قراءات الإشعاع لا تتحول هنا إلى نقص في الأكسجين أو الماء أو الغذاء أو الطاقة.", "Radiation readings are not turned into oxygen, water, food or energy penalties here."),
  ],
};

export const SOLAR_WHATIF: WhatIfHook = {
  question: t(
    "ماذا لو رُصد حدث مثل هذا أثناء مهمة سيليني-1؟ ما أول شيء يجب أن نعرفه؟",
    "What if an event like this were detected during the SELENE-1 mission? What should we find out first?",
  ),
  linkedDecisionId: "d3-emergency",
  predictionDirections: ["more", "same", "less"],
  resourceEffects: null,
  note: t(
    "سؤال نوعي فقط للمختبر لاحقًا. لا يغيّر محرك اللعبة ولا الموارد.",
    "A qualitative question for a later What If Lab. It does not change the game engine or resources.",
  ),
};

export const RADIATION_WHATIF: WhatIfHook = {
  question: t(
    "ماذا لو كان طاقم سيليني-1 على القمر في يوم مثل هذا؟ ما المعلومات التي نحتاجها قبل أن نقرّر؟",
    "What if the SELENE-1 crew were on the Moon on a day like this? What information would we need before deciding?",
  ),
  linkedDecisionId: "d3-emergency",
  predictionDirections: ["more", "same", "less"],
  resourceEffects: null,
  note: t(
    "قراءة مدارية تاريخية للمقارنة فقط. لا تُحوَّل إلى قيمة على سطح القمر ولا إلى تأثير على الموارد.",
    "A historical orbital reading for comparison only. It is not converted into a lunar-surface value or a resource effect.",
  ),
};
