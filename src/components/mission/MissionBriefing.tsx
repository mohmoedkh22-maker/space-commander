/* eslint-disable @next/next/no-img-element -- static export, small local art */
"use client";
import { useMemo, useState } from "react";
import { createInitialState } from "@/lib/game/engine";
import type { CrewId, T } from "@/lib/game/types";
import { CREW, t, UI } from "@/lib/i18n";
import { FACILITY_ORDER, RESOURCES, RESOURCE_ORDER, resourceValue, type FacilityId } from "@/lib/mission";
import { LunarBase } from "../LunarBase";
import { useSettings } from "../settings";
import { Button, Kicker, Panel } from "../ui";
import { CrewCard } from "./CrewCard";
import { FacilityCard } from "./FacilityCard";
import { MissionHUD } from "./MissionHUD";
import { ResourceIndicator } from "./ResourceIndicator";
import { Stepper } from "./Stepper";
import { SuhailDialogue } from "./SuhailDialogue";
import { FACILITIES } from "@/lib/mission";

export const BRIEFING_STEPS: T[] = [
  t("المهمة", "Mission"),
  t("القائد", "Commander"),
  t("الطاقم", "Crew"),
  t("الموارد", "Resources"),
  t("القاعدة", "Base"),
];

const DEMO_NOTE = t(
  "قيم توضيحية: هذه أرقام البداية في اللعبة، وليست قياسات من ناسا.",
  "Illustrative values: these are the game's starting numbers, not NASA measurements.",
);

const DAYS: { day: number; label: T; color: string }[] = [
  { day: 1, label: t("الوصول", "Arrival"), color: "#50e3f0" },
  { day: 2, label: t("الشمس التي تختفي", "The Vanishing Sun"), color: "#ffad4d" },
  { day: 3, label: t("القطرة الأخيرة", "The Last Drop"), color: "#326bff" },
  { day: 4, label: t("القطرة الأخيرة", "The Last Drop"), color: "#326bff" },
  { day: 5, label: t("الإشارة الأخيرة", "The Final Signal"), color: "#ff6b6b" },
  { day: 6, label: t("الإشارة الأخيرة", "The Final Signal"), color: "#ff6b6b" },
  { day: 7, label: t("الإشارة الأخيرة", "The Final Signal"), color: "#ff6b6b" },
];

function StepFrame({ step, children, onBack, onNext, nextLabel }: { step: number; children: React.ReactNode; onBack?: () => void; onNext: () => void; nextLabel?: string }) {
  const { tx } = useSettings();
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-5xl flex-col gap-5 px-4 py-6">
      <Stepper steps={BRIEFING_STEPS} current={step} />
      {children}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
        {onBack ? (
          <Button variant="ghost" onClick={onBack}>
            {tx(UI.back)}
          </Button>
        ) : (
          <span />
        )}
        <Button variant="solar" onClick={onNext} autoFocus>
          ▶ {nextLabel ?? tx(UI.next)}
        </Button>
      </div>
    </main>
  );
}

/** Four-step mission briefing: mission → commander → crew → resources. */
export function MissionBriefing({ onDone }: { onDone: () => void }) {
  const { tx } = useSettings();
  const [step, setStep] = useState(0);
  const start = useMemo(() => createInitialState(), []);
  const back = step > 0 ? () => setStep(step - 1) : undefined;
  const next = () => (step < 3 ? setStep(step + 1) : onDone());

  if (step === 0)
    return (
      <StepFrame step={0} onNext={next}>
        <Kicker>OPERATION MOONLIGHT</Kicker>
        <h1 className="font-display text-4xl font-bold sm:text-5xl">{tx(t("مرحبًا بك في SELENE-1", "Welcome to SELENE-1"))}</h1>
        <div className="overflow-hidden rounded-[24px] border-2 border-holo/50 shadow-[0_0_48px_#4fe5ff33]">
          <img
            src="/art/base.png"
            width={224}
            height={140}
            className="block aspect-[16/7] h-auto w-full object-cover"
            alt={tx(t("قاعدة SELENE-1 على سطح القمر، والأرض في السماء", "The SELENE-1 base on the Moon's surface, with Earth in the sky"))}
          />
        </div>
        <SuhailDialogue
          mood="happy"
          text={t(
            "مرحبًا أيها القائد! أنا سهيل، مساعدك الذكي. هذه SELENE-1، قاعدة بحثية قرب القطب الجنوبي للقمر. هنا لا توجد متاجر، ولا نستطيع انتظار المساعدة من الأرض في أي لحظة.",
            "Hello, Commander! I'm SUHAIL, your smart assistant. This is SELENE-1, a research base near the Moon's south pole. There are no shops here, and we can't wait for help from Earth at any moment.",
          )}
        />
      </StepFrame>
    );

  if (step === 1)
    return (
      <StepFrame step={1} onBack={back} onNext={next}>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{tx(t("أنت قائد المهمة", "You are the Mission Commander"))}</h1>
        <SuhailDialogue
          text={t(
            "ستقود القاعدة لسبعة أيام. أنا أشرح وأسأل وأعطي تلميحات — لكن القرار دائمًا لك.",
            "You'll lead the base for seven days. I explain, ask questions and give hints — but the decision is always yours.",
          )}
        />
        <Panel>
          <h2 className="mb-3 font-display text-xl font-bold">{tx(t("سبعة أيام، ثلاث مهمات", "Seven days, three missions"))}</h2>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-7">
            {DAYS.map((d) => (
              <li key={d.day} className="flex flex-col gap-1 rounded-xl border-2 bg-space/60 p-3" style={{ borderColor: d.color + "88" }}>
                <span className="font-display text-sm font-bold" style={{ color: d.color }}>
                  {tx(UI.day)} {d.day}
                </span>
                <span className="text-sm leading-snug">{tx(d.label)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-moon">
            {tx(t("الأيام والأحداث خيالية لأغراض التعلم.", "The days and events are fictional, for learning."))}
          </p>
        </Panel>
      </StepFrame>
    );

  if (step === 2)
    return (
      <StepFrame step={2} onBack={back} onNext={next}>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{tx(t("تعرّف على طاقمك", "Meet your crew"))}</h1>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(CREW) as CrewId[]).map((id) => (
            <CrewCard key={id} id={id} />
          ))}
        </div>
        <SuhailDialogue
          question={t("إذا انخفضت البطارية، من أول شخص ستسأله؟", "If the battery gets low, who would you ask first?")}
          answer={t(
            "آدم، مهندس الطاقة! كل فرد في الطاقم خبير في نظام مختلف — استمع لتقاريرهم قبل أن تقرر.",
            "Adam, the Energy Engineer! Each crew member is an expert in a different system — listen to their reports before you decide.",
          )}
        />
      </StepFrame>
    );

  return (
    <StepFrame step={3} onBack={back} onNext={next} nextLabel={tx(t("ادخل القاعدة", "Enter the base"))}>
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{tx(t("الموارد الأربعة", "The four resources"))}</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {RESOURCE_ORDER.map((id) => {
          const { value, pct } = resourceValue(start, id);
          return (
            <div key={id} className="flex flex-col gap-2">
              <ResourceIndicator id={id} value={value} pct={pct} variant="tile" />
              <p className="text-sm leading-relaxed text-moon">{tx(RESOURCES[id].explain)}</p>
            </div>
          );
        })}
      </div>
      <p className="rounded-xl border border-dashed border-moon/40 px-3 py-2 text-sm text-moon">ⓘ {tx(DEMO_NOTE)}</p>
      <SuhailDialogue
        question={t("أي مورد تحتاجه كل الموارد الأخرى؟", "Which resource do all the others need?")}
        answer={t(
          "الطاقة! الكهرباء تشغّل دعم الحياة وتدوير الماء وأضواء المزرعة. لهذا كل قرار عن الطاقة يؤثر على الباقي.",
          "Energy! Electricity runs life support, water recycling and the greenhouse lights. That's why every energy decision affects the rest.",
        )}
      />
    </StepFrame>
  );
}

/** Explorable lunar base: tap a building or use the list (keyboard friendly) to open its card. */
export function LunarBaseScreen({ onDone, onScience }: { onDone: () => void; onScience?: () => void }) {
  const { tx } = useSettings();
  const start = useMemo(() => createInitialState(), []);
  const [sel, setSel] = useState<FacilityId | null>(null);
  const [seen, setSeen] = useState<Set<FacilityId>>(new Set());
  const pick = (id: FacilityId) => {
    setSel(id);
    setSeen((s) => new Set(s).add(id));
    // On phones the card sits below the map: bring it into view.
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      requestAnimationFrame(() => document.getElementById("facility-card")?.scrollIntoView({ block: "start" }));
    }
  };
  const ready = seen.size >= 3;
  return (
    <>
      <MissionHUD state={start} onScience={onScience} note={tx(DEMO_NOTE)} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4">
          <Stepper steps={BRIEFING_STEPS} current={4} />
        </div>
        <h1 className="mb-1 font-display text-3xl font-bold">{tx(UI.tourTitle)}</h1>
        <p className="mb-4 text-moon">{tx(UI.tourHint)}</p>
        <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
          <div className="flex flex-col gap-3">
            <Panel className="!p-2">
              <LunarBase status={{ energy: "ok", life: "ok", greenhouse: "ok", water: "ok", shelter: "dim", command: "ok" }} onSelect={pick} selected={sel} />
            </Panel>
            <nav aria-label={tx(t("مرافق القاعدة", "Base facilities"))}>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FACILITY_ORDER.map((id) => (
                  <li key={id}>
                    <button
                      onClick={() => pick(id)}
                      aria-pressed={sel === id}
                      className="flex min-h-12 w-full items-center gap-2 rounded-xl border-2 px-3 py-2 text-start text-sm aria-pressed:bg-holo/15 sm:text-base"
                      style={{ borderColor: FACILITIES[id].color + "77" }}
                    >
                      <span aria-hidden className="text-mint">{seen.has(id) ? "✓" : "○"}</span>
                      {tx(FACILITIES[id].name)}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div id="facility-card" className="flex scroll-mt-4 flex-col gap-3">
            {sel ? (
              <FacilityCard id={sel} onClose={() => setSel(null)} />
            ) : (
              <SuhailDialogue
                text={t(
                  "هذه قاعدتك! اختر أي مرفق لتعرف ماذا يفعل، ومن المسؤول عنه، وأي موارد يستخدم.",
                  "This is your base! Pick any facility to learn what it does, who runs it, and which resources it uses.",
                )}
              />
            )}
            <p className="text-sm text-moon" aria-live="polite">
              {tx(t("المرافق التي زرتها:", "Facilities visited:"))} <b dir="ltr">{seen.size}/6</b>
              {!ready && ` — ${tx(t("زر 3 على الأقل لتبدأ", "visit at least 3 to begin"))}`}
            </p>
            <Button variant="solar" size="lg" onClick={onDone} disabled={!ready} className="mt-auto">
              ▶ {tx(UI.tourDone)}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
