"use client";
import { useState } from "react";
import { DECISIONS } from "@/lib/game/decisions";
import { isOptionLocked } from "@/lib/game/engine";
import type { DecisionRecord, EndingId, GameState, T } from "@/lib/game/types";
import { ENDINGS, UI, t } from "@/lib/i18n";
import { LunarBase, facilityStatus } from "../LunarBase";
import { useSettings } from "../settings";
import { SuhailSays } from "../Suhail";
import { Button, Delta, Panel, ScreenTitle, StickyAction } from "../ui";
import { BaseFrame, CrewReports } from "../experience/Journey";
import { conceptsExplored } from "@/lib/game/journey";
import { START } from "@/lib/game/config";
import type { LabResult } from "./WhatIfLab";
import { missionResult } from "@/lib/game/consequences";
import { WhyPanel } from "../mission/WhyPanel";

export function OutcomeScreen({ ending, state, onLab }: { ending: EndingId; state: GameState; onLab: () => void }) {
  const { tx } = useSettings();
  const e = ENDINGS[ending];
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <ScreenTitle kicker={tx(UI.outcome)} title={tx(e.title)} />
      <ol className="mb-4 flex flex-wrap gap-2" aria-label={tx(t("النتائج الثلاث الممكنة", "The three possible outcomes"))}>
        {(["A", "B", "C"] as EndingId[]).map((id) => {
          const x = ENDINGS[id];
          const me = id === ending;
          return (
            <li
              key={id}
              aria-current={me ? "true" : undefined}
              className={`rounded-2xl border-2 px-4 py-2 font-display font-bold tracking-wider ${me ? "anim-rise text-lg" : "text-sm opacity-45"}`}
              style={{ borderColor: me ? x.color : x.color + "55", color: x.color }}
            >
              {id === "A" ? "🏆" : id === "B" ? "🛡" : "🔒"} {tx(x.badge)} {me && "◀"}
            </li>
          );
        })}
      </ol>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <BaseFrame state={state}>
            <LunarBase status={facilityStatus(state)} storm={state.flags.storm} />
          </BaseFrame>
          <CrewReports state={state} title={t("التقارير الأخيرة من الطاقم", "Final crew reports")} />
        </div>
        <div className="flex flex-col gap-3">
          <SuhailSays mood={ending === "A" ? "happy" : "thinking"} text={e.suhail} />
          <WhyPanel open reasons={missionResult(state).reasons} />
          <SuhailSays
            compact
            mood="curious"
            text={t("انتظر… هل تعرف السؤال الذي يجعل العلماء يكتشفون أشياء جديدة؟ ماذا لو؟", "Wait… do you know the question that helps scientists discover new things? What if?")}
          />
          <StickyAction>
            <Button variant="violet" size="lg" onClick={onLab} autoFocus className="w-full lg:w-auto">
              🧪 {tx(UI.openLab)}
            </Button>
          </StickyAction>
        </div>
      </div>
    </main>
  );
}

function butterflyNotes(records: DecisionRecord[]): T[] {
  const notes: T[] = [];
  const d2 = records.find((r) => r.decisionId === "d2-water");
  const d3 = records.find((r) => r.decisionId === "d3-emergency");
  if (d2 && isOptionLocked(d2.before, "d2-water", "boost")) {
    notes.push(t("قرار الطاقة في اليوم 2 جعل تشغيل المدوّر الإضافي غير متاح في اليوم 3.", "Your Day 2 energy choice made the recycler boost unavailable on Day 3."));
  } else if (d2) {
    notes.push(t("احتياطي الطاقة الذي حفظته في اليوم 2 أبقى كل خيارات الماء متاحة في اليوم 3.", "The power you saved on Day 2 kept every water option open on Day 3."));
  }
  if (d3 && isOptionLocked(d3.before, "d3-emergency", "full-ops")) {
    notes.push(t("مواردك في اليوم 5 لم تكفِ لمواصلة كل أهداف المهمة أثناء الطوارئ.", "Your Day 5 resources weren't enough to continue all mission goals during the emergency."));
  } else if (d3) {
    notes.push(t("قراراتك السابقة تركت موارد كافية لتختار مواصلة الأهداف أثناء الطوارئ.", "Your earlier choices left enough resources to keep mission goals going in the emergency."));
  }
  return notes;
}

export function ReportScreen({
  ending,
  state,
  records,
  lab,
  onScience,
  onLessons,
  onRestart,
}: {
  ending: EndingId;
  state: GameState;
  records: DecisionRecord[];
  lab: LabResult | null;
  onScience: () => void;
  /** WP06.5: SUHAIL's NASA science lessons (optional) */
  onLessons?: () => void;
  onRestart: () => void;
}) {
  const { tx } = useSettings();
  const [quiz, setQuiz] = useState<number | null>(null);
  const e = ENDINGS[ending];
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <ScreenTitle kicker="COMMANDER'S JOURNEY" title={tx(UI.report)} />
      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <h2 className="mb-1 font-display text-sm font-bold tracking-wider text-moon">🏁 {tx(t("النتيجة النهائية للمهمة", "Final mission outcome"))}</h2>
          <p className="font-display text-lg font-bold" style={{ color: e.color }}>
            {tx(e.badge)}
          </p>
          <p className="mt-1 text-mint">✓ {tx(UI.crewSafe)}</p>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-lunar/90">
            {missionResult(state)
              .reasons.slice(0, -1)
              .map((r, i) => (
                <li key={i}>• {tx(r)}</li>
              ))}
          </ul>
        </Panel>
        <Panel>
          <h2 className="mb-2 font-display font-bold">📊 {tx(t("ماذا حدث لمواردك؟", "What happened to your resources?"))}</h2>
          <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {(
              [
                ["⚡", UI.energy, "energy", " kWh"],
                ["💧", UI.water, "water", " L"],
                ["🫧", UI.oxygen, "oxygen", "%"],
                ["🌱", UI.food, "food", "%"],
              ] as const
            ).map(([icon, label, k, unit]) => (
              <li key={k} className="flex items-center justify-between gap-2 rounded-xl bg-space/60 px-3 py-2">
                <span>
                  {icon} {tx(label)}
                </span>
                <span dir="ltr" className="whitespace-nowrap">
                  {Math.round(START.resources[k])} → <b>{Math.round(state.resources[k])}</b>
                  {unit} <Delta value={state.resources[k] - START.resources[k]} />
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="md:col-span-2">
          <h2 className="mb-2 font-display font-bold">🧭 {tx(UI.keyDecisions)}</h2>
          <ol className="grid gap-3 md:grid-cols-3">
            {records.map((r) => {
              const d = DECISIONS[r.decisionId];
              const o = d.options.find((x) => x.id === r.optionId)!;
              return (
                <li key={r.decisionId} className="rounded-xl border border-holo/25 bg-space/50 p-3">
                  <span className="block text-xs font-bold text-holo">
                    {tx(UI.day)} {r.day} · {tx(d.title)}
                  </span>
                  <b className="block">{tx(o.label)}</b>
                  {o.consequences[0] && <span className="mt-1 block text-sm text-lunar/90">→ {tx(o.consequences[0])}</span>}
                </li>
              );
            })}
          </ol>
        </Panel>
        <Panel style={{ borderColor: "#8c78ff88" }}>
          <h2 className="mb-2 font-display font-bold text-violet">🦋 {tx(t("تأثير الفراشة", "Butterfly effect"))}</h2>
          <ul className="flex flex-col gap-2">
            {butterflyNotes(records).map((n, i) => (
              <li key={i}>• {tx(n)}</li>
            ))}
          </ul>
          {lab && (
            <p className="mt-3 text-sm">
              🧪 {tx(UI.labTitle)}: {tx(lab.correct ? UI.predRight : UI.predWrong)}
            </p>
          )}
        </Panel>
        <Panel>
          <h2 className="mb-2 font-display font-bold">🔬 {tx(t("المفاهيم العلمية التي استكشفتها", "Scientific concepts you explored"))}</h2>
          <ul className="flex flex-col gap-3">
            {conceptsExplored(records.map((r) => r.decisionId)).map((c) => (
              <li key={c.decisionId}>
                <b className="block">✓ {tx(c.title)}</b>
                <span className="text-sm text-lunar/90">{tx(c.science)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-moon">{tx(UI.learned)}: {UI.concepts.map((c) => tx(c)).join(" · ")}</p>
        </Panel>
      </div>

      <Panel className="mt-4">
        <h2 className="mb-2 font-display font-bold">{tx(UI.quizTitle)}</h2>
        <p className="mb-3">{tx(UI.quizQ)}</p>
        <div className="flex flex-wrap gap-2">
          {UI.quizOpts.map((o, i) => (
            <button key={i} onClick={() => setQuiz(i)} aria-pressed={quiz === i} className="rounded-xl border border-holo/30 px-4 py-2 aria-pressed:border-holo aria-pressed:bg-holo/15">
              {tx(o)}
            </button>
          ))}
        </div>
        {quiz !== null && (
          <div className="mt-3">
            <SuhailSays compact mood={quiz === 0 ? "happy" : "thinking"} text={quiz === 0 ? UI.quizRight : UI.quizWrong} />
          </div>
        )}
        <p className="mt-4 text-moon">💭 {tx(UI.newQuestion)}</p>
      </Panel>

      <p className="my-8 text-center font-display text-xl font-bold tracking-wide text-holo sm:text-2xl">{tx(UI.finalLine)}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="ghost" onClick={onScience}>
          🛰 {tx(UI.science)}
        </Button>
        {onLessons && (
          <Button variant="ghost" onClick={onLessons}>
            🔭 {tx(t("دروس سهيل العلمية", "SUHAIL's Science Lessons"))}
          </Button>
        )}
        <Button onClick={onRestart}>🔁 {tx(UI.playAgain)}</Button>
      </div>
    </main>
  );
}
