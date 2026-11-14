"use client";
import { useMemo, useState } from "react";
import { DECISIONS } from "@/lib/game/decisions";
import { lockReason } from "@/lib/game/engine";
import type { Choices, DayLog, DecisionId, DecisionRecord } from "@/lib/game/types";
import { judgePrediction, runWhatIf, type Prediction, type WhatIfComparison } from "@/lib/game/whatif";
import { ENDINGS, UI, t } from "@/lib/i18n";
import { useSettings } from "../settings";
import { SuhailSays } from "../Suhail";
import { Button, Delta, Panel, ScreenTitle } from "../ui";

export interface LabResult {
  cmp: WhatIfComparison;
  prediction: Prediction;
  correct: boolean;
}

function LineChart({ a, b, field, max, label }: { a: DayLog[]; b: DayLog[]; field: keyof DayLog; max: number; label: string }) {
  const W = 560,
    H = 200,
    pad = 32;
  const x = (i: number) => pad + (i * (W - pad * 2)) / 6;
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const path = (logs: DayLog[]) => logs.map((l, i) => `${i ? "L" : "M"}${x(i)},${y(l[field] as number)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label} style={{ direction: "ltr" }}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={pad} x2={W - pad} y1={y(max * f)} y2={y(max * f)} stroke="#aab6ca33" />
          <text x={4} y={y(max * f) + 4} fontSize="11" fill="#aab6ca">
            {Math.round(max * f)}
          </text>
        </g>
      ))}
      {a.map((_, i) => (
        <text key={i} x={x(i)} y={H - 8} fontSize="11" fill="#aab6ca" textAnchor="middle">
          D{i + 1}
        </text>
      ))}
      <path d={path(a)} fill="none" stroke="#50e3f0" strokeWidth="3" />
      <path d={path(b)} fill="none" stroke="#8c78ff" strokeWidth="3" strokeDasharray="7 5" />
      {a.map((l, i) => (
        <circle key={`a${i}`} cx={x(i)} cy={y(l[field] as number)} r="4" fill="#50e3f0" />
      ))}
      {b.map((l, i) => (
        <rect key={`b${i}`} x={x(i) - 4} y={y(l[field] as number) - 4} width="8" height="8" fill="#8c78ff" />
      ))}
    </svg>
  );
}

export function WhatIfLab({ choices, records, onDone }: { choices: Choices; records: DecisionRecord[]; onDone: (r: LabResult | null) => void }) {
  const { tx, beep } = useSettings();
  const [decision, setDecision] = useState<DecisionId | null>(null);
  const [alt, setAlt] = useState<string | null>(null);
  const [pred, setPred] = useState<Prediction | null>(null);
  const [result, setResult] = useState<LabResult | null>(null);

  const rec = records.find((r) => r.decisionId === decision);
  const d = decision ? DECISIONS[decision] : null;

  const run = () => {
    if (!decision || !alt || !pred) return;
    const cmp = runWhatIf(choices, decision, alt);
    const correct = judgePrediction(cmp.diff.energy, pred, 1);
    beep(correct ? "ok" : "soft");
    setResult({ cmp, prediction: pred, correct });
  };

  const reset = () => {
    setDecision(null);
    setAlt(null);
    setPred(null);
    setResult(null);
  };

  const explanation = useMemo(() => {
    if (!result) return null;
    const { diff } = result.cmp;
    const e = Math.round(diff.energy);
    const c = Math.round(diff.food);
    return t(
      `في المسار البديل: الطاقة ${e >= 0 ? "أكثر" : "أقل"} بـ ${Math.abs(e)} ك.و.س، والمحاصيل ${c >= 0 ? "أكثر" : "أقل"} بـ ${Math.abs(c)}%. إذن ما القرار الأفضل؟ الإجابة تعتمد على ما نحتاجه، والموارد المتاحة، والوقت المتبقي. هذه هي طريقة التفكير العلمي والهندسي.`,
      `In the alternative timeline: energy is ${e >= 0 ? "higher" : "lower"} by ${Math.abs(e)} kWh, and crops are ${c >= 0 ? "higher" : "lower"} by ${Math.abs(c)}%. So which decision is best? It depends on what we need, what we have, and how much time is left. That's how scientists and engineers think.`,
    );
  }, [result]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6" style={{ ["--tw-shadow-color" as string]: "#8c78ff" }}>
      <ScreenTitle kicker="WELCOME TO THE" title={tx(UI.labTitle)} />
      {!result && <SuhailSays mood="curious" text={UI.labIntro} />}

      {!result ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Panel style={{ borderColor: "#50e3f088" }}>
            <h2 className="mb-3 font-display font-bold text-holo">{tx(UI.pickDecision)}</h2>
            <ol className="relative flex flex-col gap-3 border-s-2 border-holo/40 ps-4">
              {records.map((r) => {
                const dd = DECISIONS[r.decisionId];
                const o = dd.options.find((x) => x.id === r.optionId)!;
                return (
                  <li key={r.decisionId}>
                    <button
                      className="w-full rounded-xl border border-holo/30 p-3 text-start aria-pressed:border-holo aria-pressed:bg-holo/10"
                      aria-pressed={decision === r.decisionId}
                      onClick={() => {
                        setDecision(r.decisionId);
                        setAlt(null);
                      }}
                    >
                      <span className="block font-display text-xs font-bold text-holo">
                        {tx(UI.day)} {r.day} · {tx(dd.title)}
                      </span>
                      <span>
                        {tx(UI.yourChoice)}: <b>{tx(o.label)}</b>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </Panel>

          <Panel style={{ borderColor: "#8c78ff88" }} className={!d ? "opacity-50" : ""}>
            <h2 className="mb-3 font-display font-bold text-violet">{tx(UI.pickAlt)}</h2>
            {d && rec && (
              <div className="flex flex-col gap-2">
                {d.options
                  .filter((o) => o.id !== rec.optionId)
                  .map((o) => {
                    const lock = lockReason(rec.before, d.id, o.id);
                    return (
                      <button
                        key={o.id}
                        disabled={!!lock}
                        aria-pressed={alt === o.id}
                        onClick={() => setAlt(o.id)}
                        className="rounded-xl border border-violet/40 p-3 text-start disabled:opacity-50 aria-pressed:border-violet aria-pressed:bg-violet/15"
                      >
                        <b>{tx(o.label)}</b>
                        {lock && <span className="block text-sm text-coral">🔒 {tx(lock)}</span>}
                      </button>
                    );
                  })}
              </div>
            )}
          </Panel>

          <Panel className={!alt ? "opacity-50" : ""}>
            <h2 className="mb-3 font-display font-bold">{tx(UI.predict)}</h2>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label={tx(UI.predict)}>
              {(["more", "same", "less"] as Prediction[]).map((p) => (
                <button
                  key={p}
                  role="radio"
                  aria-checked={pred === p}
                  disabled={!alt}
                  onClick={() => setPred(p)}
                  className="rounded-xl border border-holo/30 p-3 text-start disabled:opacity-50 aria-checked:border-solar aria-checked:bg-solar/15"
                >
                  {p === "more" ? "⬆ " : p === "less" ? "⬇ " : "↔ "}
                  {tx(UI[p])}
                </button>
              ))}
            </div>
            <Button variant="violet" className="mt-4 w-full" disabled={!pred || !alt} onClick={run}>
              🧪 {tx(UI.runExperiment)}
            </Button>
          </Panel>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <SuhailSays mood={result.correct ? "happy" : "curious"} text={result.correct ? UI.predRight : UI.predWrong} />
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Panel>
              <h2 className="mb-2 font-display font-bold">⚡ {tx(UI.energy)} (kWh)</h2>
              <LineChart a={result.cmp.original.days} b={result.cmp.alternative.days} field="energy" max={300} label={tx(UI.energy)} />
              <h2 className="mb-2 mt-4 font-display font-bold">🌱 {tx(UI.food)} (%)</h2>
              <LineChart a={result.cmp.original.days} b={result.cmp.alternative.days} field="food" max={100} label={tx(UI.food)} />
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="inline-block size-3 rounded-full bg-holo" /> {tx(UI.original)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-block size-3 bg-violet" /> {tx(UI.alternative)} (- - -)
                </span>
              </div>
            </Panel>
            <div className="flex flex-col gap-4">
              <Panel>
                <table className="w-full text-start">
                  <thead>
                    <tr className="text-sm text-moon">
                      <th className="text-start font-normal"></th>
                      <th className="text-start font-normal text-holo">{tx(UI.original)}</th>
                      <th className="text-start font-normal text-violet">{tx(UI.alternative)}</th>
                      <th className="text-start font-normal">Δ</th>
                    </tr>
                  </thead>
                  <tbody dir="auto">
                    {(
                      [
                        [UI.energy, "energy", " kWh"],
                        [UI.water, "water", " L"],
                        [UI.oxygen, "oxygen", "%"],
                        [UI.food, "food", "%"],
                      ] as const
                    ).map(([label, key, unit]) => (
                      <tr key={key} className="border-t border-holo/10">
                        <td className="py-2">{tx(label)}</td>
                        <td dir="ltr" className="text-start">{Math.round(result.cmp.original.final.resources[key])}</td>
                        <td dir="ltr" className="text-start">{Math.round(result.cmp.alternative.final.resources[key])}</td>
                        <td>
                          <Delta value={result.cmp.diff[key]} unit={unit} />
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-holo/10">
                      <td className="py-2">{tx(UI.ending)}</td>
                      <td className="text-sm">{tx(ENDINGS[result.cmp.original.ending].badge)}</td>
                      <td className="text-sm">{tx(ENDINGS[result.cmp.alternative.ending].badge)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </Panel>
              {result.cmp.forcedChanges.length > 0 && (
                <Panel style={{ borderColor: "#ffad4d88" }}>
                  <p className="mb-2 text-sm">{tx(UI.forced)}</p>
                  {result.cmp.forcedChanges.map((f) => {
                    const dd = DECISIONS[f.decisionId];
                    return (
                      <p key={f.decisionId} className="text-sm">
                        • {tx(dd.title)}: {tx(dd.options.find((o) => o.id === f.requestedOptionId)!.label)} →{" "}
                        <b>{tx(dd.options.find((o) => o.id === f.optionId)!.label)}</b>
                      </p>
                    );
                  })}
                </Panel>
              )}
              {explanation && <SuhailSays compact mood="thinking" text={explanation} />}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={reset}>
              🔁 {tx(UI.tryAnother)}
            </Button>
            <Button onClick={() => onDone(result)}>{tx(UI.report)} →</Button>
          </div>
        </div>
      )}
      {!result && (
        <div className="mt-4 flex justify-end">
          <button className="text-sm text-moon underline" onClick={() => onDone(null)}>
            {tx(UI.report)} →
          </button>
        </div>
      )}
    </main>
  );
}
