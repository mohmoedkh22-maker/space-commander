// WP06.4 — Three featured SUHAIL lessons built on generated data scenarios.
// SUHAIL keeps the existing identity (friendly robot companion, expressions from src/lib/game/companion.ts):
// it explains and encourages, and never chooses for the child. Numbers are quoted from the scenarios, never invented.
import { t, type ScientificScenario, type SuhailLesson } from "./types.ts";

const fmt = (v: number) => (Math.round(v * 100) / 100).toString();

function pickSolarStorm(scenarios: ScientificScenario[]): ScientificScenario | undefined {
  const sep = scenarios.filter((s) => s.category === "SEP" && s.classification === "historical-observation");
  return sep.find((s) => /GOES/i.test(String(s.dataQuality.sourceIndicators.instruments))) ?? sep[0];
}
const peakOf = (scenarios: ScientificScenario[], category: ScientificScenario["category"]) =>
  scenarios.find((s) => s.category === category && s.id.includes("-peak-"));

/** Lesson 1 — a solar particle alert: what does a NASA detection tell us? */
function solarAlertLesson(sep: ScientificScenario): SuhailLesson {
  const instr = String(sep.dataQuality.sourceIndicators.instruments);
  const when = sep.sourceRecords[0].timestamp ?? sep.observationDate;
  // GOES satellites orbit Earth; for any other instrument we only say "in space", which is always true
  const nearEarth = /GOES/i.test(instr);
  const whereAr = nearEarth ? "قرب الأرض" : "في الفضاء";
  const whereEn = nearEarth ? "near Earth" : "in space";
  return {
    id: "lesson-suhail-solar-alert",
    title: t("سهيل وتنبيه الجسيمات الشمسية", "SUHAIL and the solar particle alert"),
    expression: "curious",
    suhailIntro: t(
      `يا قائد! وصلنا خبر من ناسا: في ${when} رصد الجهاز ${instr} جسيمات شمسية سريعة. لنفهمه معًا!`,
      `Commander! News from NASA: on ${when}, the instrument ${instr} detected fast solar particles. Let's understand it together!`,
    ),
    childExplanation: t(
      `الشمس تطلق أحيانًا جسيمات صغيرة جدًا وسريعة جدًا. أجهزة على مركبات فضائية تلتقطها، مثل جرس إنذار. هذا الجهاز كان ${whereAr}، وليس على القمر.`,
      `Sometimes the Sun sends out tiny, very fast particles. Detectors on spacecraft pick them up, like an alarm bell. This detector was ${whereEn}, not on the Moon.`,
    ),
    challenge: t("ماذا نفعل أولًا عندما يصل خبر مثل هذا؟", "What should we do first when news like this arrives?"),
    choices: [
      {
        id: "read-record",
        label: t("نقرأ سجل ناسا: من رصد الحدث، وأين؟", "Read NASA's record: who detected it, and where?"),
        educationalConsequence: t(
          `ممتاز! عرفنا أن الرصد كان بجهاز ${whereAr}، وليس على القمر. هذا يساعدنا أن نفهم الخبر بدقة.`,
          `Excellent! We learned it was detected by an instrument ${whereEn}, not on the Moon. That helps us understand the news accurately.`,
        ),
      },
      {
        id: "get-ready",
        label: t("نجهّز المأوى احتياطيًا ونتابع", "Prepare the shelter as a precaution and keep watching"),
        educationalConsequence: t(
          "خطوة حكيمة! الاستعداد لا يضر. ونتابع البيانات لنعرف هل الأمر يخص القمر فعلًا.",
          "A wise step! Being ready never hurts. We keep checking the data to see whether it really concerns the Moon.",
        ),
      },
      {
        id: "assume-moon",
        label: t("نقول إن القمر تأثر بالتأكيد", "Say the Moon was definitely affected"),
        educationalConsequence: t(
          "لنتمهل! الجهاز لم يكن على القمر. العالِم لا يقول «بالتأكيد» قبل أن يرى بيانات من المكان نفسه.",
          "Let's slow down! The detector wasn't on the Moon. A scientist doesn't say “definitely” before seeing data from that place.",
        ),
      },
    ],
    learningObjective: t(
      "أعرف أن كل رصد علمي له مكان وجهاز، وأن رصد حدث قرب الأرض لا يعني أنه قيس على القمر.",
      "I know every scientific detection has a place and an instrument, and that a detection near Earth is not a measurement on the Moon.",
    ),
    basedOnScenarioIds: [sep.id],
    sourceRecordIds: sep.sourceRecords.map((r) => r.id),
    classification: sep.classification,
    limitations: [
      t("السجل لا يحتوي على قيمة لشدة الجسيمات.", "The record contains no particle-intensity value."),
      t("القصة تعليمية؛ السجل نفسه تاريخي من ناسا.", "The story is educational; the record itself is historical NASA data."),
    ],
    relations: [],
  };
}

/** Lesson 2 — orbit is not the surface; a detector reading is not a human dose. */
function orbitLesson(peak: ScientificScenario): SuhailLesson {
  const m = peak.measurements[0];
  return {
    id: "lesson-suhail-orbit-not-surface",
    title: t("سهيل: فوق القمر أم عليه؟", "SUHAIL: above the Moon or on it?"),
    expression: "explaining",
    suhailIntro: t(
      `انظر يا قائد! في ${peak.observationDate} سجّل جهاز CRaTER قراءة وصلت إلى ${fmt(m.value)} ${m.unit}. لكن أين كان الجهاز؟`,
      `Look, Commander! On ${peak.observationDate}, the CRaTER detector recorded a reading up to ${fmt(m.value)} ${m.unit}. But where was the detector?`,
    ),
    childExplanation: t(
      "جهاز CRaTER موجود على مركبة تدور حول القمر، فوقه بكثير. القراءة تخبرنا بما التقطه الجهاز هناك. ليست قراءة على سطح القمر، وليست ما يصل إلى جسم إنسان.",
      "The CRaTER detector rides on a spacecraft that circles high above the Moon. The reading tells us what the detector picked up up there. It is not a reading on the Moon's surface, and it is not what reaches a person's body.",
    ),
    challenge: t("كيف نصف هذا الرقم بشكل صحيح؟", "How do we describe this number correctly?"),
    choices: [
      {
        id: "orbit-detector",
        label: t("قراءة جهاز في مدار حول القمر", "A detector reading in orbit around the Moon"),
        educationalConsequence: t("أحسنت! هذا وصف دقيق: نذكر الجهاز والمكان.", "Well done! That's an accurate description: we name the detector and the place."),
      },
      {
        id: "surface-value",
        label: t("كمية الإشعاع على سطح القمر", "The amount of radiation on the Moon's surface"),
        educationalConsequence: t(
          "ليس بعد! الجهاز لم يكن على السطح. المكان مختلف، لذلك لا ننقل الرقم إلى مكان آخر.",
          "Not yet! The detector wasn't on the surface. It's a different place, so we don't move the number somewhere else.",
        ),
      },
      {
        id: "body-dose",
        label: t("ما يصل إلى جسم رائد الفضاء", "What reaches an astronaut's body"),
        educationalConsequence: t(
          "فكرة قريبة! لكن جسم الإنسان والدروع حوله مختلفة عن الجهاز. لذلك لا نساوي بينهما.",
          "Close idea! But a human body and the shielding around it are different from the detector. So we don't treat them as the same.",
        ),
      },
    ],
    learningObjective: t(
      "أميّز بين القياس في المدار والقياس على السطح، وأعرف أن قراءة الجهاز ليست جرعة في جسم إنسان.",
      "I can tell apart a measurement in orbit from one on the surface, and I know a detector reading is not a dose in a human body.",
    ),
    basedOnScenarioIds: [peak.id],
    sourceRecordIds: peak.sourceRecords.map((r) => r.id),
    classification: peak.classification,
    limitations: [
      t("قياس في مدار القمر، وليس على سطحه.", "A measurement in lunar orbit, not on the surface."),
      t("قراءة الجهاز ليست جرعة في جسم إنسان.", "A detector reading is not a dose in a human body."),
    ],
    relations: [],
  };
}

/** Lesson 3 — two spacecraft, one stormy week: same time does not prove cause. */
function correlationLesson(lunarPeak: ScientificScenario, deepPeak: ScientificScenario, sepIds: string[]): SuhailLesson {
  const a = lunarPeak.measurements[0];
  const b = deepPeak.measurements[0];
  return {
    id: "lesson-suhail-same-time-not-cause",
    title: t("سهيل: حدثا معًا… فهل أحدهما سبب الآخر؟", "SUHAIL: they happened together… did one cause the other?"),
    expression: "thinking",
    suhailIntro: t(
      `يا قائد، لاحظت شيئًا! في مايو 2024 سجّل جهازان في مكانين بعيدين قراءات مرتفعة: CRaTER حول القمر (${fmt(a.value)} ${a.unit}) وبيوسنتينل حول الشمس (${fmt(b.value)} ${b.unit}). وفي الشهر نفسه ذكرت ناسا أحداث جسيمات شمسية.`,
      `Commander, I noticed something! In May 2024, two detectors in two faraway places recorded high readings: CRaTER around the Moon (${fmt(a.value)} ${a.unit}) and BioSentinel around the Sun (${fmt(b.value)} ${b.unit}). In the same month, NASA listed solar particle events.`,
    ),
    childExplanation: t(
      "عندما يحدث شيئان في الوقت نفسه، قد يكونان مرتبطين، وقد لا يكونان. حدوثهما معًا لا يثبت أن أحدهما سبّب الآخر. لكي نعرف السبب، يدرس العلماء أدلة أكثر.",
      "When two things happen at the same time, they might be connected, or they might not. Happening together does not prove that one caused the other. To find a cause, scientists study more evidence.",
    ),
    challenge: t("ماذا نستنتج من حدوثها في الوقت نفسه؟", "What can we conclude from them happening at the same time?"),
    choices: [
      {
        id: "proven-cause",
        label: t("الأحداث الشمسية سبّبت القراءات، هذا مؤكد", "The solar events caused the readings, for sure"),
        educationalConsequence: t(
          "لنتمهل! التزامن وحده لا يثبت السبب. نحتاج أدلة أكثر قبل أن نقول «مؤكد».",
          "Let's slow down! Timing alone doesn't prove a cause. We need more evidence before we say “for sure”.",
        ),
      },
      {
        id: "worth-studying",
        label: t("حدثت معًا؛ هذا يستحق الدراسة", "They happened together; that's worth studying"),
        educationalConsequence: t(
          "تفكير علمي رائع! نلاحظ التزامن، ثم نبحث عن أدلة قبل أن نحكم.",
          "Great scientific thinking! We notice the timing, then look for evidence before deciding.",
        ),
      },
      {
        id: "unrelated",
        label: t("لا علاقة بينها أبدًا", "They are not related at all"),
        educationalConsequence: t(
          "لا نستطيع قول ذلك أيضًا. لم نثبت العلاقة، ولم نثبت عدمها. «لا نعرف بعد» جواب علمي صادق.",
          "We can't say that either. We haven't proven a link, and we haven't ruled one out. “We don't know yet” is an honest scientific answer.",
        ),
      },
    ],
    learningObjective: t(
      "أعرف أن حدوث شيئين معًا يسمّى ارتباطًا زمنيًا، وأنه لا يثبت أن أحدهما سبب الآخر.",
      "I know that two things happening together is a timing link (correlation), and that it does not prove one caused the other.",
    ),
    basedOnScenarioIds: [lunarPeak.id, deepPeak.id, ...sepIds.map((id) => `scn-sep-${id}`)],
    sourceRecordIds: [...lunarPeak.sourceRecords.map((r) => r.id), ...deepPeak.sourceRecords.map((r) => r.id), ...sepIds],
    classification: "historical-observation",
    limitations: [
      t("هذا ارتباط زمني فقط، وليس دليلًا على السبب.", "This is a timing correlation only, not evidence of a cause."),
      t("بيوسنتينل ليس قرب القمر، وCRaTER في المدار وليس على السطح.", "BioSentinel is not near the Moon, and CRaTER is in orbit, not on the surface."),
      t("بيانات DONKI وRadLab محفوظة منفصلة ولم تُدمج.", "DONKI and RadLab data are stored separately and were not merged."),
    ],
    relations: [
      {
        kind: "temporal-correlation-only",
        recordIds: [...lunarPeak.sourceRecords.map((r) => r.id), ...deepPeak.sourceRecords.map((r) => r.id), ...sepIds],
        statement: t(
          "هذه السجلات من الفترة نفسها. لا يُدّعى أن أحدها سبّب الآخر.",
          "These records are from the same period. It is not claimed that any of them caused another.",
        ),
      },
    ],
  };
}

/** The three featured lessons, or fewer if the data needed for one is missing (nothing is invented to fill the gap). */
export function suhailLessons(scenarios: ScientificScenario[]): SuhailLesson[] {
  const out: SuhailLesson[] = [];
  const sep = pickSolarStorm(scenarios);
  if (sep) out.push(solarAlertLesson(sep));
  const lunar = peakOf(scenarios, "LUNAR_ORBIT_RADIATION");
  if (lunar) out.push(orbitLesson(lunar));
  const deep = peakOf(scenarios, "DEEP_SPACE_COMPARISON");
  if (lunar && deep) {
    const sepIds = scenarios
      .filter((s) => s.category === "SEP" && s.observationDate.slice(0, 7) === lunar.observationDate.slice(0, 7))
      .map((s) => s.sourceRecords[0].id);
    out.push(correlationLesson(lunar, deep, sepIds));
  }
  return out;
}
