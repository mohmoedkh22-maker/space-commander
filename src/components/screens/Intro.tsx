/* eslint-disable @next/next/no-img-element -- static export, small local art */
"use client";
import { useState } from "react";
import { UI, t } from "@/lib/i18n";
import pkg from "../../../package.json";
import { useSettings } from "../settings";
import { Button, Modal, PlaceholderTag } from "../ui";
import { LunarHorizon, OrbitStarLogo } from "../Brand";
import { SETTINGS_TEXT, SettingsModal } from "../SettingsModal";

const MENU = {
  nav: t("القائمة الرئيسية", "Main menu"),
  story: t("القصة", "Story"),
  replay: t("إعادة المقدمة", "Replay intro"),
  guide2: t("الطاقم والقاعدة", "Crew & base"),
  guide: t("الدليل العلمي", "Science Guide"),
  startMission: t("ابدأ المهمة", "START MISSION"),
  greet: t("مرحبًا أيها القائد! القاعدة SELENE-1 بانتظارك.", "Hello, Commander! SELENE-1 is waiting for you."),
  placeholder: t(
    "الرسومات من لوحة الهوية البصرية لفريق سهيل (Cosmic Discovery)",
    "Art from Team SUHAIL's visual identity board (Cosmic Discovery)",
  ),
  credit: t(
    "فريق سهيل — تحدي ناسا لتطبيقات الفضاء 2026",
    "Team SUHAIL — NASA Space Apps Challenge 2026",
  ),
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
};

export function Splash({
  onStart,
  onScience,
  onReplayIntro,
  onGuide,
  resumeDay,
  onResume,
}: {
  onStart: () => void;
  onScience: () => void;
  onReplayIntro?: () => void;
  onGuide?: () => void;
  resumeDay?: number;
  onResume?: () => void;
}) {
  const { tx, lang, set, beep } = useSettings();
  const [story, setStory] = useState(false);
  const [settings, setSettings] = useState(false);
  const navBtn =
    "min-h-12 rounded-2xl border border-holo/30 bg-space/60 px-4 py-2 text-base backdrop-blur hover:border-holo hover:bg-holo/10";

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <LunarHorizon />
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-space to-transparent" />
      </div>

      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-2">
          <OrbitStarLogo size={40} />
          <span className="font-display text-sm font-bold tracking-[0.2em]">SPACE COMMANDER</span>
        </div>
        <nav aria-label={tx(MENU.nav)} className="flex flex-wrap gap-2">
          <button className={navBtn} onClick={() => setStory(true)} aria-haspopup="dialog">
            📖 {tx(MENU.story)}
          </button>
          {onReplayIntro && (
            <button className={navBtn} onClick={onReplayIntro}>
              🎬 {tx(MENU.replay)}
            </button>
          )}
          {onGuide && (
            <button className={navBtn} onClick={onGuide}>
              👩‍🚀 {tx(MENU.guide2)}
            </button>
          )}
          <button className={navBtn} onClick={onScience}>
            🛰 {tx(MENU.guide)}
          </button>
          <button className={navBtn} onClick={() => setSettings(true)} aria-haspopup="dialog">
            ⚙ {tx(SETTINGS_TEXT.settings)}
          </button>
          <button className={navBtn} onClick={() => set({ lang: lang === "ar" ? "en" : "ar" })} lang={lang === "ar" ? "en" : "ar"}>
            🌐 {tx(UI.lang)}
          </button>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-4 pb-6 text-center">
        <div className="anim-rise flex w-full flex-col items-center">
          <h1 className="sr-only">
            {tx(UI.title)} — {tx(UI.op)}
          </h1>
          <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border-2 border-holo/50 shadow-[0_0_60px_#4fe5ff44]">
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
          </div>
          <p className="mt-4 text-lg text-lunar/90 sm:text-xl">{tx(UI.tagline)}</p>
        </div>

        <Button
          variant="solar"
          size="lg"
          onClick={() => {
            beep("ok");
            onStart();
          }}
          className="anim-rise min-w-[min(100%,320px)]"
          autoFocus
        >
          🚀 {tx(MENU.startMission)}
        </Button>
        {resumeDay !== undefined && onResume && (
          <Button variant="ghost" onClick={onResume} className="anim-rise min-w-[min(100%,320px)]">
            ▶ {tx(t("متابعة مهمتي", "Continue my mission"))} · {tx(UI.day)} {resumeDay}
          </Button>
        )}

      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pb-4 text-sm text-moon">
        <span>
          {tx(MENU.credit)} · <span dir="ltr">V{pkg.version.split(".")[0]}</span>
        </span>
        <PlaceholderTag text={tx(MENU.placeholder)} />
      </footer>

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
            onStart();
          }}
        >
          🚀 {tx(MENU.startMission)}
        </Button>
      </Modal>
      <SettingsModal open={settings} onClose={() => setSettings(false)} />
    </div>
  );
}
