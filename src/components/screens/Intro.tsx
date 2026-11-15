/* eslint-disable @next/next/no-img-element -- static export, small local art */
"use client";
// PHASE 3 — CINEMATIC START MENU
// A living lunar scene behind a game-style menu. SUHAIL reacts to the item in focus and explains it in one line.
// Keyboard: ↑/↓ (or Home/End) move between items, Enter/Space activate. Touch and mouse work the same way.
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { UI, t } from "@/lib/i18n";
import type { T } from "@/lib/game/types";
import pkg from "../../../package.json";
import { useSettings } from "../settings";
import { Button, Modal, PlaceholderTag } from "../ui";
import { OrbitStarLogo } from "../Brand";
import { SETTINGS_TEXT, SettingsModal } from "../SettingsModal";
import { SuhailRobot, type SuhailExpression } from "../SuhailRobot";
import { Dust, LunarVista } from "../cinematic/Backdrops";

const MENU = {
  nav: t("القائمة الرئيسية", "Main menu"),
  story: t("القصة", "Story"),
  replay: t("إعادة المقدمة", "Replay intro"),
  guide2: t("الطاقم والقاعدة", "Crew & base"),
  guide: t("العلم والمصادر", "About the Science"),
  lessons: t("دروس سهيل العلمية", "SUHAIL's Science Lessons"),
  startMission: t("ابدأ المهمة", "START MISSION"),
  resume: t("متابعة مهمتي", "Continue my mission"),
  placeholder: t(
    "الرسومات من لوحة الهوية البصرية لفريق سهيل (Cosmic Discovery)",
    "Art from Team SUHAIL's visual identity board (Cosmic Discovery)",
  ),
  credit: t("فريق سهيل — تحدي ناسا لتطبيقات الفضاء 2026", "Team SUHAIL — NASA Space Apps Challenge 2026"),
  storyTitle: t("عملية ضوء القمر", "Operation Moonlight"),
  storyLead: t("سبعة أيام. أربعة رواد فضاء. قائد واحد.", "Seven days. Four astronauts. One commander."),
  storyBody: t(
    "أنت القائد الجديد لقاعدة SELENE-1 البحثية قرب القطب الجنوبي للقمر. الطاقة والماء والغذاء والهواء مترابطة، وكل قرار تتخذه يغيّر ما سيحدث لاحقًا.",
    "You are the new commander of SELENE-1, a research base near the Moon's south pole. Power, water, food and air are all linked — and every decision you make changes what happens next.",
  ),
  missions: [
    t("المهمة 01 — الشمس التي تختفي: أزمة الطاقة", "Mission 01 — The Vanishing Sun: a power crisis"),
    t("المهمة 02 — القطرة الأخيرة: توازن المياه", "Mission 02 — The Last Drop: balancing water"),
    t("المهمة 03 — الإشارة الأخيرة: حالة طوارئ", "Mission 03 — The Final Signal: an emergency"),
  ],
  storyEnd: t(
    "في النهاية، ادخل مختبر «ماذا لو؟» وجرّب قرارًا مختلفًا لترى كيف كانت ستتغير القصة.",
    "At the end, enter the What If Lab and test a different decision to see how the story could have changed.",
  ),
  close: t("إغلاق", "Close"),
  welcome: t("أهلًا أيها القائد! اختر من القائمة، وأنا معك.", "Welcome, Commander! Pick from the menu — I'm right here with you."),
  welcomeBack: (day: number) => t(`أهلًا بعودتك يا قائد! قاعدتك بانتظارك في اليوم ${day}.`, `Welcome back, Commander! Your base is waiting for you on Day ${day}.`),
  newOver: (day: number) =>
    t(`مهمة جديدة ستبدأ من اليوم الأول، وتحلّ محل مهمتك المحفوظة (اليوم ${day}). هل أنت متأكد؟`, `A new mission starts from Day 1 and replaces your saved mission (Day ${day}). Are you sure?`),
  newYes: t("نعم، مهمة جديدة", "Yes, a new mission"),
  result: t("نتيجة مهمتي وتقرير القائد", "My mission result & report"),
  resultHint: t("مهمتك اكتملت! شاهد النتيجة، جرّب مختبر «ماذا لو؟»، أو ابدأ مهمة جديدة.", "Your mission is complete! See the result, try the What If Lab, or start a new mission."),
  newNo: t("رجوع", "Back"),
};

interface Item {
  id: "start" | "resume" | "story" | "guide" | "science" | "lessons" | "replay" | "settings";
  icon: string;
  label: T;
  hint: T;
  face: SuhailExpression;
  primary?: boolean;
  action: () => void;
}

export function Splash({
  onStart,
  onScience,
  onReplayIntro,
  onGuide,
  onLessons,
  resumeDay,
  onResume,
  resumeFinished = false,
}: {
  onStart: () => void;
  onScience: () => void;
  onReplayIntro?: () => void;
  onGuide?: () => void;
  /** WP06.5: SUHAIL's NASA science lessons */
  onLessons?: () => void;
  resumeDay?: number;
  onResume?: () => void;
  /** the saved mission is already finished: offer its result instead of "continue" */
  resumeFinished?: boolean;
}) {
  const { tx, lang, set, sound, beep } = useSettings();
  const [story, setStory] = useState(false);
  const [settings, setSettings] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [focus, setFocus] = useState<Item["id"] | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // the automatic focus on load should not replace SUHAIL's welcome; only the child's own moves do
  const moved = useRef(false);
  useEffect(() => {
    const mark = () => (moved.current = true);
    window.addEventListener("keydown", mark);
    window.addEventListener("pointerdown", mark);
    return () => {
      window.removeEventListener("keydown", mark);
      window.removeEventListener("pointerdown", mark);
    };
  }, []);
  const hasSave = resumeDay !== undefined && !!onResume;

  const start = () => {
    beep("ok");
    if (hasSave) setConfirmNew(true);
    else onStart();
  };

  const items: Item[] = [
    ...(hasSave
      ? [
          {
            id: "resume" as const,
            icon: "▶",
            label: resumeFinished ? MENU.result : t(`${MENU.resume.ar} · ${UI.day.ar} ${resumeDay}`, `${MENU.resume.en} · ${UI.day.en} ${resumeDay}`),
            hint: resumeFinished ? MENU.resultHint : MENU.welcomeBack(resumeDay!),
            face: "encouraging" as const,
            primary: true,
            action: () => {
              beep("ok");
              onResume!();
            },
          },
        ]
      : []),
    {
      id: "start",
      icon: "🚀",
      label: MENU.startMission,
      hint: t("سبعة أيام على القمر بانتظارك. قراراتك ستصنع القصة!", "Seven days on the Moon are waiting. Your decisions will write the story!"),
      face: "happy",
      primary: !hasSave,
      action: start,
    },
    {
      id: "story",
      icon: "📖",
      label: MENU.story,
      hint: t("تعرّف على عملية ضوء القمر في دقيقة واحدة.", "Learn about Operation Moonlight in one minute."),
      face: "curious",
      action: () => setStory(true),
    },
    ...(onGuide
      ? [
          {
            id: "guide" as const,
            icon: "👩‍🚀",
            label: MENU.guide2,
            hint: t("تعرّف على الطاقم والموارد الأربعة ومرافق القاعدة.", "Meet the crew, the four resources and the base's facilities."),
            face: "explaining" as const,
            action: onGuide,
          },
        ]
      : []),
    {
      id: "science",
      icon: "🛰",
      label: MENU.guide,
      hint: t("ضوء الشمس في كل يوم من أيام المهمة مأخوذ من بيانات ناسا. تعال أريك كيف!", "Each mission day's sunlight comes from NASA data. Come, I'll show you how!"),
      face: "explaining",
      action: onScience,
    },
    ...(onLessons
      ? [
          {
            id: "lessons" as const,
            icon: "🔭",
            label: MENU.lessons,
            hint: t("ثلاثة دروس من بيانات ناسا الحقيقية عن الشمس والإشعاع. هيا نتعلّم معًا!", "Three lessons from real NASA data about the Sun and radiation. Let's learn together!"),
            face: "curious" as const,
            action: onLessons,
          },
        ]
      : []),
    ...(onReplayIntro
      ? [
          {
            id: "replay" as const,
            icon: "🎬",
            label: MENU.replay,
            hint: t("نشاهد وصولنا إلى القاعدة من جديد؟", "Shall we watch our arrival at the base again?"),
            face: "happy" as const,
            action: onReplayIntro,
          },
        ]
      : []),
    {
      id: "settings",
      icon: "⚙",
      label: SETTINGS_TEXT.settings,
      hint: t("الصوت واللغة وتقليل الحركة وتكبير النص.", "Sound, language, reduced motion and bigger text."),
      face: "idle",
      action: () => setSettings(true),
    },
  ];
  const current = items.find((i) => i.id === focus);
  const bubble = current?.hint ?? (hasSave ? (resumeFinished ? MENU.resultHint : MENU.welcomeBack(resumeDay!)) : MENU.welcome);
  const face: SuhailExpression = current?.face ?? (hasSave ? "encouraging" : "happy");

  // ↑/↓ move between menu items (same in Arabic and English); Home/End jump to the first/last
  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const btns = [...(listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-menu-item]") ?? [])];
    const i = btns.indexOf(document.activeElement as HTMLButtonElement);
    const go = (n: number) => {
      e.preventDefault();
      moved.current = true;
      btns[(n + btns.length) % btns.length]?.focus();
    };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(btns.length - 1);
  };

  const pill = "grid min-h-11 min-w-11 place-items-center rounded-full border border-holo/40 bg-space/70 px-3 text-sm backdrop-blur hover:bg-holo/15 aria-pressed:border-holo aria-pressed:bg-holo/20";

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden" data-screen="start-menu">
      {/* living lunar scene */}
      <div className="absolute inset-0 -z-10" aria-hidden>
        <div className="menu-drift absolute inset-0">
          <LunarVista />
        </div>
        <Dust />
        <div className="absolute inset-0 bg-gradient-to-b from-space/50 via-space/20 to-space/75" />
        <div className="absolute inset-0 hidden bg-[linear-gradient(to_var(--menu-side),#0b1026ee_0%,#0b1026aa_38%,transparent_70%)] lg:block" style={{ ["--menu-side" as string]: lang === "ar" ? "left" : "right" }} />
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-2">
          <OrbitStarLogo size={40} />
          <span className="font-display text-sm font-bold tracking-[0.2em]" dir="ltr">
            SPACE COMMANDER
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className={pill} aria-pressed={sound} aria-label={tx(UI.sound)} onClick={() => set({ sound: !sound })}>
            {sound ? "🔊" : "🔈"}
          </button>
          <button className={pill} onClick={() => set({ lang: lang === "ar" ? "en" : "ar" })} lang={lang === "ar" ? "en" : "ar"}>
            🌐 {tx(UI.lang)}
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-4 pb-6 lg:grid-cols-[minmax(0,460px)_1fr]">
        <section className="flex flex-col gap-5">
          {/* phones: title → SUHAIL → menu, so his hint stays on screen; desktop: title → menu → SUHAIL */}
          <div className="anim-rise order-1">
            <h1 className="font-display text-5xl font-bold leading-none tracking-tight drop-shadow-[0_4px_30px_#4fe5ff66] sm:text-6xl" dir="ltr" style={{ textAlign: lang === "ar" ? "right" : "left" }}>
              SPACE
              <br />
              COMMANDER
            </h1>
            <p className="mt-2 font-display text-base font-bold tracking-[0.4em] text-holo sm:text-lg" dir="ltr" style={{ textAlign: lang === "ar" ? "right" : "left" }}>
              OPERATION MOONLIGHT
            </p>
            <p className="mt-2 text-lg text-lunar/90">{tx(UI.tagline)}</p>
          </div>

          <nav aria-label={tx(MENU.nav)} className="order-3 lg:order-2">
            <ul ref={listRef} className="flex flex-col gap-2.5" onKeyDown={onKeyDown}>
              {items.map((it, i) => (
                <li key={it.id} className="stagger" style={{ ["--i" as string]: i + 2 }}>
                  <button
                    data-menu-item={it.id}
                    onClick={it.action}
                    onFocus={() => moved.current && setFocus(it.id)}
                    onMouseEnter={() => {
                      moved.current = true;
                      setFocus(it.id);
                    }}
                    autoFocus={it.primary}
                    aria-haspopup={it.id === "story" || it.id === "settings" ? "dialog" : undefined}
                    className={`group flex w-full items-center gap-3 rounded-2xl border-2 px-4 text-start transition ${
                      it.primary
                        ? "min-h-16 border-solar bg-solar text-xl font-bold text-space shadow-[0_0_32px_#ffad4d77] hover:shadow-[0_0_44px_#ffad4daa]"
                        : "min-h-13 border-holo/25 bg-space/70 py-2.5 text-lg backdrop-blur hover:border-holo focus-visible:border-holo"
                    }`}
                  >
                    <span aria-hidden className="w-7 text-center text-xl">
                      {it.icon}
                    </span>
                    <span className="flex-1">{tx(it.label)}</span>
                    <span aria-hidden className={`text-sm transition ${it.primary ? "" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}>
                      {lang === "ar" ? "◀" : "▶"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* SUHAIL explains whatever the child is pointing at */}
          <div className="order-2 flex items-end gap-3 lg:order-3" aria-live="polite">
            <SuhailRobot expression={face} size={84} />
            <p className="panel flex-1 px-4 py-3 text-base leading-relaxed sm:text-lg" style={{ borderColor: "#50e3f066" }}>
              <b className="mb-0.5 block font-display text-xs tracking-widest text-holo">{tx(t("سهيل", "SUHAIL"))}</b>
              {tx(bubble)}
            </p>
          </div>
        </section>

        {/* the team's mission poster */}
        <figure className="anim-rise overflow-hidden rounded-[28px] border-2 border-holo/50 shadow-[0_0_60px_#4fe5ff44]" style={{ animationDelay: "0.3s" }}>
          <img
            src="/art/hero.png"
            width={489}
            height={258}
            className="block h-auto w-full"
            alt={tx(
              t(
                "قائد الفضاء — عملية ضوء القمر: القائدة الصغيرة وسهيل وقاعدة SELENE-1 على القمر",
                "SPACE COMMANDER — Operation Moonlight: the young commander, SUHAIL and the SELENE-1 base on the Moon",
              ),
            )}
          />
        </figure>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pb-4 text-sm text-moon">
        <span>
          {tx(MENU.credit)} · <span dir="ltr">V{pkg.version.split(".")[0]}</span>
        </span>
        <PlaceholderTag text={tx(MENU.placeholder)} />
      </footer>

      <Modal open={confirmNew} onClose={() => setConfirmNew(false)} title={tx(MENU.startMission)} closeLabel={tx(MENU.close)}>
        <p className="leading-relaxed">
          {hasSave &&
            (resumeFinished
              ? tx(t("مهمة جديدة ستبدأ من اليوم الأول، وتحلّ محل نتيجة مهمتك السابقة. هل أنت متأكد؟", "A new mission starts from Day 1 and replaces your previous mission's result. Are you sure?"))
              : tx(MENU.newOver(resumeDay!)))}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="solar"
            className="flex-1"
            onClick={() => {
              setConfirmNew(false);
              onStart();
            }}
          >
            🚀 {tx(MENU.newYes)}
          </Button>
          <Button variant="ghost" className="flex-1" onClick={() => setConfirmNew(false)}>
            {tx(MENU.newNo)}
          </Button>
        </div>
      </Modal>

      <Modal open={story} onClose={() => setStory(false)} title={tx(MENU.storyTitle)} closeLabel={tx(MENU.close)}>
        <p className="font-display text-lg font-bold text-holo">{tx(MENU.storyLead)}</p>
        <p className="mt-2 leading-relaxed">{tx(MENU.storyBody)}</p>
        <ul className="mt-3 flex flex-col gap-2">
          {MENU.missions.map((m, i) => (
            <li key={i} className="rounded-xl bg-space/60 px-3 py-2">
              {tx(m)}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-moon">🧪 {tx(MENU.storyEnd)}</p>
        <Button
          className="mt-4 w-full"
          onClick={() => {
            setStory(false);
            start();
          }}
        >
          🚀 {tx(MENU.startMission)}
        </Button>
      </Modal>
      <SettingsModal open={settings} onClose={() => setSettings(false)} />
    </div>
  );
}
