"use client";
import { useState } from "react";
import { CREW, UI, t } from "@/lib/i18n";
import type { CrewId } from "@/lib/game/types";
import { FACILITIES, LunarBase, type FacilityId } from "../LunarBase";
import { useSettings } from "../settings";
import { SuhailBot, SuhailSays } from "../Suhail";
import { Button, Kicker, Modal, Panel, PlaceholderTag } from "../ui";
import { LunarHorizon, OrbitStarLogo } from "../Brand";
import { SETTINGS_TEXT, SettingsModal } from "../SettingsModal";

const MENU = {
  nav: t("القائمة الرئيسية", "Main menu"),
  story: t("القصة", "Story"),
  guide: t("الدليل العلمي", "Science Guide"),
  startMission: t("ابدأ المهمة", "START MISSION"),
  greet: t("مرحبًا أيها القائد! القاعدة SELENE-1 بانتظارك.", "Hello, Commander! SELENE-1 is waiting for you."),
  placeholder: t(
    "رسومات مؤقتة — الشعار والشخصيات النهائية من فريق التصميم",
    "Temporary artwork — final logo & characters by the design team",
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

export function Splash({ onStart, onScience }: { onStart: () => void; onScience: () => void }) {
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
        <div className="anim-rise flex flex-col items-center">
          <OrbitStarLogo size={128} />
          <h1 className="mt-2 font-display text-5xl font-bold tracking-tight drop-shadow-[0_4px_24px_#326bff88] sm:text-7xl lg:text-8xl">
            {tx(UI.title)}
          </h1>
          <Kicker className="mt-3 !tracking-[0.4em] text-base sm:text-lg">{tx(UI.op)}</Kicker>
          <p className="mt-3 text-lg text-lunar/90 sm:text-xl">{tx(UI.tagline)}</p>
        </div>

        <Button
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

        <div className="anim-rise flex max-w-md items-end gap-3 self-center text-start">
          <SuhailBot mood="happy" size={84} />
          <p className="panel px-4 py-3 text-base sm:text-lg" style={{ borderColor: "#50e3f055" }}>
            <span className="mb-0.5 block font-display text-xs font-bold tracking-widest text-holo">SUHAIL · سهيل</span>
            {tx(MENU.greet)}
          </p>
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pb-4 text-sm text-moon">
        <span>{tx(MENU.credit)}</span>
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

const BRIEF = [
  t(
    "مرحبًا أيها القائد! وصلت أخيرًا إلى القاعدة SELENE-1 قرب القطب الجنوبي للقمر. أنا سهيل، مساعدك الذكي خلال هذه المهمة.",
    "Welcome, Commander! You've finally reached SELENE-1, a base near the Moon's south pole. I'm SUHAIL, your smart assistant for this mission.",
  ),
  t(
    "يعيش هنا أربعة رواد فضاء. لا توجد متاجر، ولا يمكننا انتظار المساعدة من الأرض في أي لحظة.",
    "Four astronauts live here. There are no shops, and we can't expect help from Earth at any moment.",
  ),
  t(
    "لدينا الطاقة والماء والغذاء والهواء — لكنها محدودة، والأهم أنها تعتمد على بعضها. قراراتك ستحدد كيف نستخدمها خلال سبعة أيام. هل أنت مستعد؟",
    "We have power, water, food and air — but they're limited, and they depend on each other. Your decisions will decide how we use them for seven days. Ready?",
  ),
];

export function Briefing({ onDone }: { onDone: () => void }) {
  const { tx } = useSettings();
  const [i, setI] = useState(0);
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-4 py-10">
      <p className="font-display text-sm font-bold tracking-[0.25em] text-holo">SELENE-1 — LUNAR RESEARCH OUTPOST</p>
      <SuhailSays key={i} text={BRIEF[i]} mood={i === 0 ? "happy" : "normal"} />
      {i === 1 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(CREW) as CrewId[]).map((id) => (
            <Panel key={id} className="!p-3 text-center anim-rise">
              <div className="mx-auto mb-2 grid size-12 place-items-center rounded-full font-display text-lg font-bold text-space" style={{ background: CREW[id].color }} aria-hidden>
                {CREW[id].initial}
              </div>
              <b>{tx(CREW[id].name)}</b>
              <p className="text-sm text-moon">{tx(CREW[id].role)}</p>
            </Panel>
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={() => (i < BRIEF.length - 1 ? setI(i + 1) : onDone())}>
          {i < BRIEF.length - 1 ? tx(UI.next) : tx(UI.start)}
        </Button>
      </div>
    </main>
  );
}

export function Tour({ onDone }: { onDone: () => void }) {
  const { tx } = useSettings();
  const [sel, setSel] = useState<FacilityId | null>(null);
  const [seen, setSeen] = useState<Set<FacilityId>>(new Set());
  const pick = (id: FacilityId) => {
    setSel(id);
    setSeen((s) => new Set(s).add(id));
  };
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-1 font-display text-3xl font-bold">{tx(UI.tourTitle)}</h1>
      <p className="mb-4 text-moon">{tx(UI.tourHint)}</p>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel className="!p-2">
          <LunarBase
            status={{ energy: "ok", life: "ok", greenhouse: "ok", water: "ok", shelter: "dim", command: "ok" }}
            onSelect={pick}
            selected={sel}
          />
        </Panel>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label={tx(UI.tourTitle)}>
            {(Object.keys(FACILITIES) as FacilityId[]).map((id) => (
              <button
                key={id}
                onClick={() => pick(id)}
                aria-pressed={sel === id}
                className="rounded-xl border px-3 py-2 text-sm aria-pressed:bg-holo/15"
                style={{ borderColor: FACILITIES[id].color + "88" }}
              >
                {seen.has(id) ? "✓ " : ""}
                {tx(FACILITIES[id].name)}
              </button>
            ))}
          </div>
          {sel ? (
            <Panel className="anim-rise" key={sel} style={{ borderColor: FACILITIES[sel].color + "88" }}>
              <div className="flex items-start gap-3">
                <SuhailBot mood="curious" size={56} />
                <div>
                  <h2 className="font-display text-xl font-bold" style={{ color: FACILITIES[sel].color }}>
                    {tx(FACILITIES[sel].name)}
                  </h2>
                  <p className="mt-1 leading-relaxed">{tx(FACILITIES[sel].info)}</p>
                </div>
              </div>
            </Panel>
          ) : (
            <SuhailSays compact text={t("قبل أن نبدأ، دعني أريك المكان الذي ستكون مسؤولًا عنه.", "Before we start, let me show you the place you're responsible for.")} />
          )}
          <Button onClick={onDone} disabled={seen.size < 3} className="mt-auto">
            {tx(UI.tourDone)} {seen.size < 3 && `(${seen.size}/3)`}
          </Button>
        </div>
      </div>
    </main>
  );
}
