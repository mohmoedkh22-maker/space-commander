"use client";
import { useState } from "react";
import { DECISIONS } from "@/lib/game/decisions";
import { isOptionLocked } from "@/lib/game/engine";
import type { DecisionRecord, EndingId, GameState, T } from "@/lib/game/types";
import { ENDINGS, UI, t } from "@/lib/i18n";
import { LunarBase, facilityStatus } from "../LunarBase";
import { useSettings } from "../settings";
import { SuhailSays } from "../Suhail";
import { Button, CrewSays, Panel, ScreenTitle } from "../ui";
import type { LabResult } from "./WhatIfLab";

export function OutcomeScreen({ ending, state, onLab }: { ending: EndingId; state: GameState; onLab: () => void }) {
  const { tx } = useSettings();
  const e = ENDINGS[ending];
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <ScreenTitle kicker={tx(UI.outcome)} title={tx(e.title)} />
      <div className="mb-4 inline-block rounded-2xl border-2 px-5 py-2 font-display text-xl font-bold tracking-wider anim-rise" style={{ borderColor: e.color, color: e.color }}>
        {ending === "A" ? "🏆" : ending === "B" ? "🛡" : "🔒"} {tx(e.badge)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="!p-2">
          <LunarBase status={facilityStatus(state)} />
        </Panel>
        <div className="flex flex-col gap-3">
          <CrewSays who="adam" text={ending === "A" ? t("حالة الطاقة مستقرة ضمن حدود الخطة.", "Power is stable within plan limits.") : t("حافظنا على الأنظمة الأساسية بتقليل الأحمال.", "We kept essential systems running by cutting loads.")} />
          <CrewSays who="layan" text={t("أنظمة دعم الحياة تعمل والطاقم آمن.", "Life support is running and the crew is safe.")} />
          <CrewSays who="rashed" text={t("اكتملت إجراءات السلامة.", "Safety procedures complete.")} />
          <SuhailSays mood={ending === "A" ? "happy" : "thinking"} text={e.suhail} />
          <SuhailSays
            compact
            mood="curious"
            text={t("انتظر… هل تعرف السؤال الذي يجعل العلماء يكتشفون أشياء جديدة؟ ماذا لو؟", "Wait… do you know the question that helps scientists discover new things? What if?")}
          />
          <Button variant="violet" onClick={onLab} autoFocus>
            🧪 {tx(UI.openLab)}
          </Button>
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
  onRestart,
}: {
  ending: EndingId;
  state: GameState;
  records: DecisionRecord[];
  lab: LabResult | null;
  onScience: () => void;
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
          <p className="font-display text-lg font-bold" style={{ color: e.color }}>
            {tx(e.badge)}
          </p>
          <p className="mt-1 text-mint">✓ {tx(UI.crewSafe)}</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm" dir="auto">
            <li>⚡ {tx(UI.energy)}: <b dir="ltr">{Math.round(state.batteryKWh)} kWh</b></li>
            <li>💧 {tx(UI.water)}: <b dir="ltr">{Math.round(state.waterL)} L</b></li>
            <li>🫧 {tx(UI.oxygen)}: <b dir="ltr">{Math.round(state.oxygenPct)}%</b></li>
            <li>🌱 {tx(UI.food)}: <b dir="ltr">{Math.round(state.cropPct)}%</b></li>
          </ul>
        </Panel>
        <Panel>
          <h2 className="mb-2 font-display font-bold">{tx(UI.keyDecisions)}</h2>
          <ol className="flex flex-col gap-1">
            {records.map((r) => {
              const d = DECISIONS[r.decisionId];
              return (
                <li key={r.decisionId}>
                  <span className="text-holo">{tx(UI.day)} {r.day}</span> — {tx(d.title)}: <b>{tx(d.options.find((o) => o.id === r.optionId)!.label)}</b>
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
          <h2 className="mb-2 font-display font-bold">{tx(UI.learned)}</h2>
          <ul className="flex flex-col gap-1">
            {UI.concepts.map((c, i) => (
              <li key={i}>✓ {tx(c)}</li>
            ))}
          </ul>
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
        <Button onClick={onRestart}>🔁 {tx(UI.playAgain)}</Button>
      </div>
    </main>
  );
}
