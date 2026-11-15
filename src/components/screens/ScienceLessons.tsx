"use client";
// WP06.5 — SUHAIL's NASA science lessons.
// A guided path of three featured lessons (from public/data/scenarios/scenarios.json) plus an optional science archive.
// Educational only: nothing here reads or changes resources, decisions, the day, the ending or the mission save.
import { useEffect, useMemo, useState } from "react";
import { t } from "@/lib/i18n";
import type { Choices, T } from "@/lib/game/types";
import {
  CATEGORY_LABEL,
  CLASSIFICATION_LABEL,
  DATASET_LABEL,
  LESSONS_KEY,
  bidiT,
  chooseOption,
  emptyLessonProgress,
  isLessonDone,
  lessonScenarios,
  lessonsDone,
  nextLessonId,
  parseLessonProgress,
  serializeLessonProgress,
  whatIfConnection,
  type LessonProgress,
} from "@/lib/game/scienceLessons";
import { SCENARIO_CATEGORIES, type ScenarioClassification, type ScenarioSet, type ScientificScenario, type SuhailLesson } from "@/lib/nasa/scenarios/types";
import { useSettings } from "../settings";
import { SuhailSays } from "../Suhail";
import { Button, Panel, ScreenTitle, StickyAction } from "../ui";

const TXT = {
  title: t("دروس سهيل العلمية", "SUHAIL's Science Lessons"),
  kicker: "NASA SCIENCE LESSONS",
  welcome: t(
    "أهلًا يا قائد! جهّزت لك ثلاثة دروس من بيانات ناسا الحقيقية. نتعلّم معًا كيف يفكّر العلماء.",
    "Welcome, Commander! I prepared three lessons from real NASA data. Let's learn how scientists think, together.",
  ),
  allDone: t("أنهيت الدروس الثلاثة! يمكنك إعادتها، أو استكشاف أرشيف العلوم.", "You finished all three lessons! Replay them, or explore the science archive."),
  lesson: t("الدرس", "Lesson"),
  done: t("✓ تمت", "✓ Done"),
  start: t("ابدأ الدرس", "Start lesson"),
  replay: t("أعد الدرس", "Replay lesson"),
  archive: t("أرشيف العلوم", "Science archive"),
  archiveHint: t("كل السيناريوهات العلمية (27) مرتبة حسب النوع.", "All the science scenarios (27), grouped by type."),
  back: t("رجوع", "Back"),
  backLessons: t("رجوع إلى الدروس", "Back to the lessons"),
  backGame: t("رجوع إلى اللعبة", "Back to the game"),
  next: t("التالي", "Next"),
  nextLesson: t("الدرس التالي", "Next lesson"),
  explain: t("ماذا يحدث؟", "What's happening?"),
  source: t("مصدر ناسا", "NASA source"),
  observed: t("تاريخ الرصد", "Observation date"),
  dataset: t("قاعدة البيانات", "Dataset"),
  records: t("سجلات ناسا", "NASA records"),
  more: (n: number) => t(`و${n} سجلات أخرى`, `and ${n} more records`),
  where: t("أين قيس؟", "Where was it measured?"),
  value: t("القيمة المسجلة", "Recorded value"),
  noValue: t("لا توجد قيمة مقاسة في هذا السجل.", "No measured value in this record."),
  limits: t("حدود علمية مهمة", "Important scientific limits"),
  challenge: t("التحدي", "Challenge"),
  yourChoice: t("اختيارك", "Your choice"),
  tryOther: t("جرّب خيارًا آخر لترى ماذا يقول سهيل.", "Try another choice to see what SUHAIL says."),
  objective: t("ماذا تعلّمنا؟", "What did we learn?"),
  noResources: t("هذا الدرس لا يغيّر موارد قاعدتك ولا قراراتك.", "This lesson does not change your base's resources or decisions."),
  whatIf: t("ربط مع مختبر «ماذا لو؟»", "Connect to the What If Lab"),
  inMission: t("في مهمتك، قرارك في", "In your mission, for"),
  youChose: t("اخترت", "you chose"),
  openLab: t("افتح مختبر «ماذا لو؟»", "Open the What If Lab"),
  finishFirst: t("أكمل المهمة أولًا، ثم جرّب قرارًا مختلفًا في مختبر «ماذا لو؟».", "Finish the mission first, then try a different decision in the What If Lab."),
  gameLabel: t("المهمة 03 في اللعبة", "Mission 03 in the game"),
  lessonLabel: t("هذا الدرس", "This lesson"),
  loading: t("سهيل يجهّز الدروس…", "SUHAIL is getting the lessons ready…"),
  error: t("تعذّر تحميل الدروس. حاول مرة أخرى.", "The lessons could not be loaded. Please try again."),
  retry: t("إعادة المحاولة", "Try again"),
  stepOf: (i: number, n: number) => t(`الخطوة ${i} من ${n}`, `Step ${i} of ${n}`),
};

const TONE_STYLE: Record<string, string> = {
  historical: "border-mint/60 bg-mint/10 text-mint",
  model: "border-solar/60 bg-solar/10 text-solar",
  reference: "border-moon/60 bg-moon/10 text-moon",
  simulated: "border-violet/60 bg-violet/10 text-violet",
};

export function ClassificationBadge({ c }: { c: ScenarioClassification }) {
  const { tx } = useSettings();
  const tb = (x: T) => tx(bidiT(x));
  const l = CLASSIFICATION_LABEL[c];
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${TONE_STYLE[l.tone]}`} data-classification={c}>
      {l.tone === "simulated" ? "🎮" : "🛰"} {tb(l.label)}
    </span>
  );
}

/** Loads the offline scenario file (code-split; no NASA request). Tests can pass `set` directly. */
function useScenarioSet(initial?: ScenarioSet) {
  const [set, setSet] = useState<ScenarioSet | null>(initial ?? null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (set) return;
    let alive = true;
    import("../../../public/data/scenarios/scenarios.json")
      .then((m) => alive && setSet((m.default ?? m) as unknown as ScenarioSet))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [set, attempt]);
  return { set, failed, retry: () => (setFailed(false), setAttempt((a) => a + 1)) };
}

export function ScienceLessons({
  onBack,
  choices,
  missionComplete,
  onOpenLab,
  initialSet,
}: {
  onBack: () => void;
  /** the current session's decisions, only READ for the qualitative What If connection */
  choices: Choices;
  missionComplete: boolean;
  onOpenLab?: () => void;
  initialSet?: ScenarioSet;
}) {
  const { tx } = useSettings();
  const tb = (x: T) => tx(bidiT(x));
  const { set, failed, retry } = useScenarioSet(initialSet);
  const [view, setView] = useState<{ kind: "home" } | { kind: "lesson"; id: string } | { kind: "archive" }>({ kind: "home" });
  const [progress, setProgress] = useState<LessonProgress>(emptyLessonProgress());

  useEffect(() => {
    if (!set) return;
    try {
      setProgress(parseLessonProgress(localStorage.getItem(LESSONS_KEY), set.lessons));
    } catch {}
  }, [set]);
  useEffect(() => {
    window.scrollTo?.({ top: 0 });
  }, [view]);

  const save = (p: LessonProgress) => {
    setProgress(p);
    try {
      localStorage.setItem(LESSONS_KEY, serializeLessonProgress(p));
    } catch {}
  };

  if (failed)
    return (
      <main className="mx-auto max-w-3xl px-4 py-6" data-screen="science-lessons">
        <ScreenTitle kicker={TXT.kicker} title={tx(TXT.title)} />
        <SuhailSays mood="concerned" text={TXT.error} />
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={retry}>{tx(TXT.retry)}</Button>
          <Button variant="ghost" onClick={onBack}>
            {tx(TXT.backGame)}
          </Button>
        </div>
      </main>
    );
  if (!set)
    return (
      <main className="mx-auto max-w-3xl px-4 py-6" data-screen="science-lessons" aria-busy="true">
        <ScreenTitle kicker={TXT.kicker} title={tx(TXT.title)} />
        <SuhailSays mood="thinking" text={TXT.loading} />
      </main>
    );

  if (view.kind === "lesson") {
    const lesson = set.lessons.find((l) => l.id === view.id);
    if (lesson)
      return (
        <LessonView
          key={lesson.id}
          set={set}
          lesson={lesson}
          index={set.lessons.indexOf(lesson)}
          progress={progress}
          onChoose={(cid) => save(chooseOption(progress, lesson, cid))}
          choices={choices}
          missionComplete={missionComplete}
          onOpenLab={onOpenLab}
          onHome={() => setView({ kind: "home" })}
          onNext={() => {
            const i = set.lessons.indexOf(lesson);
            const n = set.lessons[i + 1];
            setView(n ? { kind: "lesson", id: n.id } : { kind: "home" });
          }}
        />
      );
  }
  if (view.kind === "archive") return <Archive set={set} onBack={() => setView({ kind: "home" })} />;

  const nextId = nextLessonId(progress, set.lessons);
  return (
    <main className="mx-auto max-w-4xl px-4 py-6" data-screen="science-lessons">
      <ScreenTitle kicker={TXT.kicker} title={tx(TXT.title)} />
      <SuhailSays mood={nextId ? "happy" : "encouraging"} text={nextId ? TXT.welcome : TXT.allDone} />
      <p className="mt-4 text-moon" data-lessons-done>
        {lessonsDone(progress, set.lessons)} / {set.lessons.length} {tx(t("دروس مكتملة", "lessons done"))}
      </p>
      <ol className="mt-4 grid gap-4 md:grid-cols-3" aria-label={tx(TXT.title)}>
        {set.lessons.map((l, i) => {
          const done = isLessonDone(progress, l.id);
          const first = lessonScenarios(set, l)[0];
          return (
            <li key={l.id}>
              <Panel className="flex h-full flex-col gap-3" style={l.id === nextId ? { borderColor: "#ffad4d99" } : undefined} data-lesson-card={l.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold tracking-widest text-holo">
                    {tx(TXT.lesson)} {i + 1}
                  </span>
                  {done && <span className="rounded-full bg-mint/15 px-2 py-0.5 text-sm font-bold text-mint">{tx(TXT.done)}</span>}
                </div>
                <h2 className="font-display text-xl font-bold leading-snug">{tb(l.title)}</h2>
                {first && <ClassificationBadge c={l.classification} />}
                {first && (
                  <p className="text-sm text-moon">
                    {tx(TXT.observed)}: <span dir="ltr">{first.observationDate}</span>
                  </p>
                )}
                <div className="mt-auto pt-2">
                  <Button variant={l.id === nextId ? "solar" : "ghost"} className="w-full" onClick={() => setView({ kind: "lesson", id: l.id })}>
                    {done ? `↺ ${tx(TXT.replay)}` : `▶ ${tx(TXT.start)}`}
                  </Button>
                </div>
              </Panel>
            </li>
          );
        })}
      </ol>
      <Panel className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">🗂 {tx(TXT.archive)}</h2>
          <p className="text-moon">{tx(TXT.archiveHint)}</p>
        </div>
        <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setView({ kind: "archive" })}>
          {tx(TXT.archive)}
        </Button>
      </Panel>
      <StickyAction>
        <Button variant="ghost" className="w-full sm:w-auto" onClick={onBack}>
          ← {tx(TXT.backGame)}
        </Button>
      </StickyAction>
    </main>
  );
}

/* ---------------- one guided lesson ---------------- */

const STEPS = ["intro", "explain", "challenge"] as const;

function LessonView({
  set,
  lesson,
  index,
  progress,
  onChoose,
  choices,
  missionComplete,
  onOpenLab,
  onHome,
  onNext,
}: {
  set: ScenarioSet;
  lesson: SuhailLesson;
  index: number;
  progress: LessonProgress;
  onChoose: (choiceId: string) => void;
  choices: Choices;
  missionComplete: boolean;
  onOpenLab?: () => void;
  onHome: () => void;
  onNext: () => void;
}) {
  const { tx } = useSettings();
  const tb = (x: T) => tx(bidiT(x));
  const [step, setStep] = useState(0);
  // the choice explored in THIS visit (the saved one only marks the lesson as done)
  const [picked, setPicked] = useState<string | null>(null);
  const scenarios = useMemo(() => lessonScenarios(set, lesson), [set, lesson]);
  const chosen = lesson.choices.find((c) => c.id === picked);
  const last = index === set.lessons.length - 1;
  const conn = scenarios[0] ? whatIfConnection(scenarios[0], choices, missionComplete) : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6" data-screen="science-lesson" data-lesson={lesson.id}>
      <ScreenTitle kicker={`${tx(TXT.lesson)} ${index + 1} · ${tx(TXT.stepOf(step + 1, STEPS.length))}`} title={tb(lesson.title)} />
      <div className="flex flex-col gap-4">
        {/* 1 — SUHAIL's introduction */}
        <SuhailSays mood={lesson.expression} text={bidiT(lesson.suhailIntro)} />

        {/* 2 — child-friendly explanation + the NASA source */}
        {step >= 1 && (
          <>
            <Panel className="anim-rise">
              <h2 className="mb-2 font-display text-lg font-bold text-holo">💡 {tx(TXT.explain)}</h2>
              <p className="text-lg leading-relaxed">{tb(lesson.childExplanation)}</p>
            </Panel>
            <SourcePanel lesson={lesson} scenarios={scenarios} />
          </>
        )}

        {/* 3 — the challenge, the choices and SUHAIL's feedback */}
        {step >= 2 && (
          <Panel className="anim-rise" data-challenge>
            <h2 className="mb-1 font-display text-lg font-bold text-solar">🎯 {tx(TXT.challenge)}</h2>
            <p className="mb-4 text-lg font-bold">{tb(lesson.challenge)}</p>
            <div className="grid gap-3" role="group" aria-label={tb(lesson.challenge)}>
              {lesson.choices.map((c) => (
                <button
                  key={c.id}
                  data-choice={c.id}
                  aria-pressed={picked === c.id}
                  onClick={() => {
                    setPicked(c.id);
                    onChoose(c.id);
                  }}
                  className={`min-h-14 w-full rounded-2xl border-2 px-4 py-3 text-start text-lg transition ${
                    picked === c.id ? "border-solar bg-solar/15" : "border-holo/30 hover:border-holo hover:bg-holo/10"
                  }`}
                >
                  {tb(c.label)}
                </button>
              ))}
            </div>
            {chosen && (
              <div className="mt-4 flex flex-col gap-3" data-feedback={chosen.id}>
                <SuhailSays mood="explaining" text={bidiT(chosen.educationalConsequence)} />
                <p className="text-moon">💭 {tx(TXT.tryOther)}</p>
              </div>
            )}
          </Panel>
        )}

        {chosen && (
          <>
            <Panel className="anim-rise" style={{ borderColor: "#43d9a388" }}>
              <h2 className="mb-2 font-display text-lg font-bold text-mint">⭐ {tx(TXT.objective)}</h2>
              <p className="text-lg leading-relaxed">{tb(lesson.learningObjective)}</p>
              <p className="mt-3 text-sm text-moon" data-no-resources>
                🛡 {tx(TXT.noResources)}
              </p>
            </Panel>
            {conn && (
              <Panel className="anim-rise" style={{ borderColor: "#8c78ff88" }} data-whatif-connection>
                <h2 className="mb-2 font-display text-lg font-bold text-violet">🔀 {tx(TXT.whatIf)}</h2>
                <div className="mb-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-violet/30 p-3">
                    <p className="mb-2 text-sm font-bold text-moon">{tx(TXT.gameLabel)}</p>
                    <ClassificationBadge c={conn.gameClassification} />
                  </div>
                  <div className="rounded-xl border border-mint/30 p-3">
                    <p className="mb-2 text-sm font-bold text-moon">{tx(TXT.lessonLabel)}</p>
                    <ClassificationBadge c={lesson.classification} />
                  </div>
                </div>
                <p className="leading-relaxed">{tb(conn.comparison)}</p>
                <p className="mt-3 text-lg font-bold">❓ {tb(conn.question)}</p>
                {conn.labAvailable && conn.chosenOption ? (
                  <>
                    <p className="mt-3" data-mission-choice>
                      {tx(TXT.inMission)} «{tb(conn.decisionTitle)}» {tx(TXT.youChose)}: <b>{tb(conn.chosenOption)}</b>
                    </p>
                    {onOpenLab && (
                      <Button variant="violet" className="mt-3 w-full sm:w-auto" onClick={onOpenLab}>
                        🔀 {tx(TXT.openLab)}
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="mt-3 text-moon" data-finish-first>
                    {tx(TXT.finishFirst)}
                  </p>
                )}
              </Panel>
            )}
          </>
        )}
      </div>

      <StickyAction>
        <Button variant="ghost" onClick={onHome} className="flex-1 sm:flex-none">
          ← {tx(TXT.backLessons)}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button variant="solar" onClick={() => setStep((s) => s + 1)} className="flex-1 sm:flex-none" autoFocus>
            {tx(TXT.next)} ▶
          </Button>
        ) : (
          chosen && (
            <Button variant="solar" onClick={onNext} className="flex-1 sm:flex-none">
              {last ? tx(TXT.backLessons) : `${tx(TXT.nextLesson)} ▶`}
            </Button>
          )
        )}
      </StickyAction>
      <span className="sr-only" aria-live="polite">
        {isLessonDone(progress, lesson.id) ? tx(TXT.done) : ""}
      </span>
    </main>
  );
}

/** Where the lesson's facts come from: dataset, date, records, place, value and limits. */
function SourcePanel({ lesson, scenarios }: { lesson: SuhailLesson; scenarios: ScientificScenario[] }) {
  const { tx } = useSettings();
  const main = scenarios.filter((s) => s.category !== "SEP" || scenarios.length <= 1);
  const shown = (main.length ? main : scenarios).slice(0, 2);
  const shownRecordIds = new Set(shown.flatMap((s) => s.sourceRecords.map((r) => r.id)));
  const extra = lesson.sourceRecordIds.filter((id) => !shownRecordIds.has(id)).length;
  return (
    <Panel className="anim-rise" style={{ borderColor: "#50e3f088" }} data-source-panel>
      <h2 className="mb-3 font-display text-lg font-bold text-holo">🛰 {tx(TXT.source)}</h2>
      <div className="flex flex-col gap-4">
        {shown.map((s) => (
          <ScenarioFacts key={s.id} s={s} />
        ))}
        {extra > 0 && (
          <p className="text-moon" data-extra-records={extra}>
            + {tx(TXT.more(extra))}
          </p>
        )}
      </div>
    </Panel>
  );
}

function ScenarioFacts({ s, open = false }: { s: ScientificScenario; open?: boolean }) {
  const { tx } = useSettings();
  const tb = (x: T) => tx(bidiT(x));
  const recs = s.sourceRecords.slice(0, 3);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-holo/20 p-3" data-scenario={s.id}>
      <div className="flex flex-wrap items-center gap-2">
        <ClassificationBadge c={s.classification} />
      </div>
      <dl className="grid gap-x-4 gap-y-1 text-base sm:grid-cols-[auto_1fr]">
        <dt className="font-bold text-moon">{tx(TXT.dataset)}</dt>
        <dd data-dataset>{tx(DATASET_LABEL[s.source.dataset])}</dd>
        <dt className="font-bold text-moon">{tx(TXT.observed)}</dt>
        <dd dir="ltr" className="text-start" data-observation-date>
          {s.observationWindow ? `${s.observationWindow.start} → ${s.observationWindow.end}` : s.observationDate}
        </dd>
        <dt className="font-bold text-moon">{tx(TXT.where)}</dt>
        <dd>{tb(s.contextDescription)}</dd>
        <dt className="font-bold text-moon">{tx(TXT.value)}</dt>
        <dd>
          {s.measurements.length ? (
            <ul>
              {s.measurements.map((m) => (
                <li key={m.name} dir="ltr" className="text-start" data-measurement={m.name}>
                  {m.name}: <b>{m.value}</b> {m.unit}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-moon">{tx(TXT.noValue)}</span>
          )}
        </dd>
        <dt className="font-bold text-moon">{tx(TXT.records)}</dt>
        <dd>
          <ul className="break-all text-sm" dir="ltr">
            {recs.map((r) => (
              <li key={r.id} className="text-start" data-record-id={r.id}>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-holo underline">
                    {r.id}
                  </a>
                ) : (
                  r.id
                )}
              </li>
            ))}
          </ul>
          {s.sourceRecords.length > recs.length && <p className="text-sm text-moon">+ {tx(TXT.more(s.sourceRecords.length - recs.length))}</p>}
        </dd>
      </dl>
      <details open={open} className="rounded-lg bg-space/40 p-2">
        <summary className="cursor-pointer font-bold text-solar">⚠ {tx(TXT.limits)}</summary>
        <ul className="mt-2 list-disc ps-5 text-base leading-relaxed">
          {s.limitations.map((l, i) => (
            <li key={i}>{tb(l)}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

/* ---------------- optional science archive ---------------- */

function Archive({ set, onBack }: { set: ScenarioSet; onBack: () => void }) {
  const { tx } = useSettings();
  const tb = (x: T) => tx(bidiT(x));
  return (
    <main className="mx-auto max-w-4xl px-4 py-6" data-screen="science-archive">
      <ScreenTitle kicker={TXT.kicker} title={tx(TXT.archive)} />
      <SuhailSays mood="curious" text={TXT.archiveHint} />
      <div className="mt-4 flex flex-col gap-5">
        {SCENARIO_CATEGORIES.map((c) => {
          const items = set.scenarios.filter((s) => s.category === c);
          if (!items.length) return null;
          return (
            <section key={c} data-archive-category={c}>
              <h2 className="mb-2 font-display text-xl font-bold">
                {tx(CATEGORY_LABEL[c])} <span className="text-moon">({items.length})</span>
              </h2>
              <div className="flex flex-col gap-2">
                {items.map((s) => (
                  <details key={s.id} className="panel p-3" data-archive-item={s.id}>
                    <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-lg font-bold">
                      <span>{tb(s.title)}</span>
                    </summary>
                    <div className="mt-3 flex flex-col gap-3">
                      <p className="leading-relaxed">{tb(s.description)}</p>
                      <ScenarioFacts s={s} />
                    </div>
                  </details>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <StickyAction>
        <Button variant="ghost" className="w-full sm:w-auto" onClick={onBack}>
          ← {tx(TXT.backLessons)}
        </Button>
      </StickyAction>
    </main>
  );
}

/** For tests and documentation: the user-facing words used on this screen. */
export const SCIENCE_LESSONS_TEXT: Record<string, T | ((...a: number[]) => T) | string> = TXT;
