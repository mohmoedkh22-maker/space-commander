"use client";
// V0.6 — WHAT IF LAB: pick a past decision → choose an alternative → predict → replay → compare and explain.
import { useState } from "react";
import { DECISIONS, DECISION_ORDER } from "@/lib/game/decisions";
import { lockReason } from "@/lib/game/engine";
import type { Choices, DayLog, DecisionId, DecisionRecord, EndingId, T } from "@/lib/game/types";
import {
  CONDITION_LABEL,
  ENDING_NAME,
  FACILITY_LABEL,
  LATER_DECISION_POLICY,
  checkPrediction,
  tryRunWhatIf,
  type MetricKey,
  type Prediction,
  type PredictionInput,
  type PredictTarget,
  type WhatIfComparison,
} from "@/lib/game/whatif";
import { UI, t } from "@/lib/i18n";
import { useSettings } from "../settings";
import { SuhailSays } from "../Suhail";
import { Button, Delta, Panel, ScreenTitle } from "../ui";

export interface LabResult {
  cmp: WhatIfComparison;
  prediction: PredictionInput;
  correct: boolean;
}

const CYAN = "#50e3f0";
const PURPLE = "#8c78ff";

const METRIC_INFO: Record<MetricKey, { icon: string; label: T; unit: string; max: number }> = {
  energy: { icon: "⚡", label: t("الطاقة في البطارية", "Battery energy"), unit: " kWh", max: 300 },
  water: { icon: "💧", label: t("الماء", "Water"), unit: " L", max: 600 },
  oxygen: { icon: "🫁", label: t("الأكسجين", "Oxygen"), unit: "%", max: 100 },
  food: { icon: "🌱", label: t("الغذاء (المحاصيل)", "Food (crops)"), unit: "%", max: 100 },
};
const TARGETS: { id: PredictTarget; icon: string; label: T }[] = [
  ...(Object.keys(METRIC_INFO) as MetricKey[]).map((m) => ({ id: m, icon: METRIC_INFO[m].icon, label: METRIC_INFO[m].label })),
  { id: "outcome", icon: "🏁", label: t("نتيجة المهمة", "Mission outcome") },
];
const DIRECTION_TEXT: Record<"resource" | "outcome", Record<Prediction, T>> = {
  resource: { more: t("سيكون أكثر", "It will be higher"), same: t("تقريبًا نفسه", "About the same"), less: t("سيكون أقل", "It will be lower") },
  outcome: { more: t("نتيجة أفضل", "A better outcome"), same: t("النتيجة نفسها", "The same outcome"), less: t("نتيجة أسوأ", "A worse outcome") },
};
const ENDING_COLOR: Record<EndingId, string> = { A: "#5be3a0", B: "#ffad4d", C: "#ff7a6b" };

const L = {
  step1: t("1. اختر قرارًا من مهمتك", "1. Pick a decision from your mission"),
  step2: t("2. اختر خيارًا مختلفًا", "2. Choose a different option"),
  yours: t("خيارك الأصلي", "Your original choice"),
  askPredict: t(
    "قبل أن نشغّل التجربة: ماذا تتوقع أن يحدث؟ العلماء يكتبون توقعهم أولًا، ثم يختبرونه.",
    "Before we run the experiment: what do you think will happen? Scientists write down their prediction first, then test it.",
  ),
  predictWhat: t("ماذا تريد أن تتوقع؟", "What do you want to predict?"),
  predictHow: t("في المسار البديل، في نهاية المهمة…", "In the alternative timeline, at the end of the mission…"),
  note: t("اشرح توقعك بكلماتك (اختياري)", "Explain your prediction in your own words (optional)"),
  notePh: t("مثلًا: أظن أن البطارية ستبقى أعلى لأن…", "e.g. I think the battery will stay higher because…"),
  yourPred: t("توقعك", "Your prediction"),
  whatChanged: t("ما الذي تغيّر؟", "What changed?"),
  afterward: t("ماذا حدث بعد ذلك؟", "What happened afterward?"),
  why: t("لماذا حدث ذلك؟", "Why did it happen?"),
  split: t("هنا افترق المساران", "The paths split here"),
  same: t("نفس القرار", "Same decision"),
  facilities: t("حالة المرافق في النهاية", "Facilities at the end"),
  outcome: t("نتيجة المهمة", "Mission outcome"),
  start: t("البداية", "Start"),
  end: t("النهاية", "End"),
  replaced: t("تغيّر بسبب القفل", "changed: was locked"),
  back: t("رجوع", "Back"),
};

export function WhatIfLab({ choices, records, onDone }: { choices: Choices; records: DecisionRecord[]; onDone: (r: LabResult | null) => void }) {
  const { tx, beep } = useSettings();
  const [decision, setDecision] = useState<DecisionId | null>(null);
  const [alt, setAlt] = useState<string | null>(null);
  const [stage, setStage] = useState<"choose" | "predict" | "result">("choose");
  const [target, setTarget] = useState<PredictTarget>("energy");
  const [direction, setDirection] = useState<Prediction | null>(null);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<LabResult | null>(null);
  const [error, setError] = useState<T | null>(null);

  const rec = records.find((r) => r.decisionId === decision);
  const d = decision ? DECISIONS[decision] : null;

  const run = () => {
    if (!decision || !alt || !direction) return;
    const res = tryRunWhatIf(choices, decision, alt);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    const prediction: PredictionInput = { target, direction, note: note.trim() || undefined };
    const correct = checkPrediction(res.comparison, prediction);
    beep(correct ? "ok" : "soft");
    setResult({ cmp: res.comparison, prediction, correct });
    setStage("result");
    window.scrollTo?.({ top: 0 });
  };

  const reset = () => {
    setDecision(null);
    setAlt(null);
    setDirection(null);
    setNote("");
    setResult(null);
    setError(null);
    setStage("choose");
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <ScreenTitle kicker="WELCOME TO THE" title={tx(UI.labTitle)} />
      <Legend />

      {stage === "choose" && (
        <div className="mt-4 flex flex-col gap-4">
          <SuhailSays mood="curious" text={UI.labIntro} />
          <Panel style={{ borderColor: `${CYAN}88` }}>
            <h2 className="mb-3 font-display font-bold text-holo">{tx(L.step1)}</h2>
            <ol className="grid gap-3 sm:grid-cols-3">
              {records.map((r) => {
                const dd = DECISIONS[r.decisionId];
                const o = dd.options.find((x) => x.id === r.optionId)!;
                const on = decision === r.decisionId;
                return (
                  <li key={r.decisionId}>
                    <button
                      className={`h-full w-full rounded-2xl border-2 p-3 text-start transition ${on ? "border-holo bg-holo/15" : "border-holo/30 hover:border-holo/70"}`}
                      aria-pressed={on}
                      onClick={() => {
                        setDecision(r.decisionId);
                        setAlt(null);
                        setError(null);
                      }}
                    >
                      <span className="block font-display text-xs font-bold text-holo">
                        {tx(UI.day)} {r.day} · {tx(dd.title)}
                      </span>
                      <span className="mt-1 block">
                        <span className="me-1 inline-block size-2.5 rounded-full bg-holo" aria-hidden /> <b>{tx(o.label)}</b>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </Panel>

          {d && rec && (
            <Panel style={{ borderColor: `${PURPLE}88` }}>
              <h2 className="mb-3 font-display font-bold text-violet">{tx(L.step2)}</h2>
              <div className="grid gap-3 md:grid-cols-3">
                {d.options.map((o) => {
                  const original = o.id === rec.optionId;
                  const lock = original ? null : lockReason(rec.before, d.id, o.id);
                  const on = alt === o.id;
                  return (
                    <button
                      key={o.id}
                      disabled={original || !!lock}
                      aria-pressed={on}
                      onClick={() => setAlt(o.id)}
                      className={`rounded-2xl border-2 p-3 text-start transition disabled:cursor-not-allowed ${
                        original ? "border-holo/60 bg-holo/10" : on ? "border-violet bg-violet/20" : lock ? "border-violet/20 opacity-60" : "border-violet/40 hover:border-violet"
                      }`}
                    >
                      <span className={`block text-xs font-bold ${original ? "text-holo" : "text-violet"}`}>{original ? `● ${tx(L.yours)}` : `■ ${tx(t("ماذا لو…؟", "What if…?"))}`}</span>
                      <b className="block">{tx(o.label)}</b>
                      <span className="mt-1 block text-sm text-moon">{tx(o.description)}</span>
                      {lock && <span className="mt-1 block text-sm text-coral">🔒 {tx(lock)}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="violet" disabled={!alt} onClick={() => setStage("predict")}>
                  {tx(t("التالي: توقّع", "Next: predict"))} →
                </Button>
              </div>
            </Panel>
          )}
          <div className="flex justify-end">
            <button className="min-h-11 text-sm text-moon underline" onClick={() => onDone(null)}>
              {tx(UI.report)} →
            </button>
          </div>
        </div>
      )}

      {stage === "predict" && d && rec && alt && (
        <div className="mt-4 flex flex-col gap-4">
          <SuhailSays mood="thinking" text={L.askPredict} />
          <Panel>
            <p className="mb-3 text-sm">
              <span className="text-holo">● {tx(d.options.find((o) => o.id === rec.optionId)!.label)}</span>
              <span className="mx-2">→</span>
              <span className="font-bold text-violet">■ {tx(d.options.find((o) => o.id === alt)!.label)}</span>
            </p>
            <h2 className="mb-2 font-display font-bold">{tx(L.predictWhat)}</h2>
            <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label={tx(L.predictWhat)}>
              {TARGETS.map((x) => (
                <button
                  key={x.id}
                  role="radio"
                  aria-checked={target === x.id}
                  onClick={() => setTarget(x.id)}
                  className={`min-h-11 rounded-full border px-4 ${target === x.id ? "border-solar bg-solar/20 font-bold" : "border-holo/30 hover:border-holo"}`}
                >
                  {x.icon} {tx(x.label)}
                </button>
              ))}
            </div>
            <h2 className="mb-2 font-display font-bold">{tx(L.predictHow)}</h2>
            <div className="mb-4 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={tx(L.predictHow)}>
              {(["more", "same", "less"] as Prediction[]).map((p) => (
                <button
                  key={p}
                  role="radio"
                  aria-checked={direction === p}
                  onClick={() => setDirection(p)}
                  className={`min-h-12 rounded-2xl border-2 p-3 text-lg ${direction === p ? "border-solar bg-solar/15 font-bold" : "border-holo/30 hover:border-holo"}`}
                >
                  {p === "more" ? "⬆" : p === "less" ? "⬇" : "↔"} {tx(DIRECTION_TEXT[target === "outcome" ? "outcome" : "resource"][p])}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="mb-1 block text-sm text-moon">{tx(L.note)}</span>
              <textarea
                value={note}
                maxLength={160}
                rows={2}
                onChange={(e) => setNote(e.target.value)}
                placeholder={tx(L.notePh)}
                className="w-full rounded-xl border border-holo/30 bg-space/70 p-3"
              />
            </label>
            {error && (
              <p className="mt-2 text-coral" role="alert">
                {tx(error)}
              </p>
            )}
            <div className="mt-4 flex flex-wrap justify-between gap-3">
              <Button variant="ghost" onClick={() => setStage("choose")}>
                ← {tx(L.back)}
              </Button>
              <Button variant="violet" disabled={!direction} onClick={run}>
                🧪 {tx(UI.runExperiment)}
              </Button>
            </div>
          </Panel>
        </div>
      )}

      {stage === "result" && result && <Results result={result} onReset={reset} onDone={() => onDone(result)} />}
    </main>
  );
}

function Legend() {
  const { tx } = useSettings();
  return (
    <div className="mt-2 flex flex-wrap gap-4 text-sm" aria-hidden>
      <span className="flex items-center gap-2">
        <span className="inline-block h-1 w-6 rounded bg-holo" /> ● {tx(UI.original)}
      </span>
      <span className="flex items-center gap-2">
        <span className="inline-block h-1 w-6 rounded border-t-4 border-dashed border-violet" /> ■ {tx(UI.alternative)}
      </span>
    </div>
  );
}

function Results({ result, onReset, onDone }: { result: LabResult; onReset: () => void; onDone: () => void }) {
  const { tx } = useSettings();
  const c = result.cmp;
  const p = result.prediction;
  const targetLabel = TARGETS.find((x) => x.id === p.target)!;
  return (
    <div className="mt-4 flex flex-col gap-4">
      <SuhailSays mood={result.correct ? "happy" : "curious"} text={result.correct ? UI.predRight : UI.predWrong} />
      <p className="rounded-xl bg-space/70 px-4 py-2 text-sm">
        {tx(L.yourPred)}: {targetLabel.icon} {tx(targetLabel.label)} — <b>{tx(DIRECTION_TEXT[p.target === "outcome" ? "outcome" : "resource"][p.direction])}</b>{" "}
        {result.correct ? "✅" : "🔍"}
        {p.note && <span className="mt-1 block text-moon">“{p.note}”</span>}
      </p>

      <BranchTimeline c={c} />

      <section aria-label={tx(t("مقارنة الموارد", "Resource comparison"))} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(METRIC_INFO) as MetricKey[]).map((m) => (
          <MetricCard key={m} metric={m} c={c} />
        ))}
      </section>

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <Panel>
          <h2 className="mb-2 font-display font-bold">🏗 {tx(L.facilities)}</h2>
          <ul className="flex flex-col gap-2">
            {c.facilities.map((f) => (
              <li key={f.facility} className={`grid grid-cols-1 gap-1 rounded-xl p-2 sm:grid-cols-[1fr_1fr_1fr] sm:items-center ${f.changed ? "bg-violet/10 ring-1 ring-violet/60" : ""}`}>
                <span className="font-bold">
                  {tx(FACILITY_LABEL(f.facility))} {f.changed && <span className="text-xs text-violet">✦</span>}
                </span>
                <span className="text-sm" style={{ color: CYAN }}>
                  ● {tx(CONDITION_LABEL(f.original))}
                </span>
                <span className="text-sm" style={{ color: PURPLE }}>
                  ■ {tx(CONDITION_LABEL(f.alternative))}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h2 className="mb-3 font-display font-bold">🏁 {tx(L.outcome)}</h2>
          <div className="flex flex-col gap-2">
            <EndingBadge who="original" ending={c.original.ending} />
            <EndingBadge who="alternative" ending={c.alternative.ending} />
          </div>
          <p className="mt-2 text-sm text-moon">
            {c.original.ending === c.alternative.ending ? tx(t("النتيجة نفسها في المسارين.", "Same outcome in both timelines.")) : tx(t("النتيجة تغيّرت!", "The outcome changed!"))}
          </p>
        </Panel>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ExplainBlock icon="🔀" title={L.whatChanged} items={[c.explanation.whatChanged]} />
        <ExplainBlock icon="⏩" title={L.afterward} items={c.explanation.afterward} />
        <ExplainBlock icon="🔬" title={L.why} items={c.explanation.why} />
      </div>
      {c.later.some((l) => l.status === "replaced") && <p className="rounded-xl border border-solar/40 p-3 text-sm">ℹ️ {tx(LATER_DECISION_POLICY)}</p>}

      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" onClick={onReset}>
          🔁 {tx(UI.tryAnother)}
        </Button>
        <Button onClick={onDone}>{tx(UI.report)} →</Button>
      </div>
    </div>
  );
}

function EndingBadge({ who, ending }: { who: "original" | "alternative"; ending: EndingId }) {
  const { tx } = useSettings();
  const color = who === "original" ? CYAN : PURPLE;
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border-2 px-3 py-2" style={{ borderColor: color }}>
      <span className="text-sm" style={{ color }}>
        {who === "original" ? "●" : "■"} {tx(who === "original" ? UI.original : UI.alternative)}
      </span>
      <b style={{ color: ENDING_COLOR[ending] }}>{tx(ENDING_NAME[ending])}</b>
    </div>
  );
}

function ExplainBlock({ icon, title, items }: { icon: string; title: T; items: T[] }) {
  const { tx } = useSettings();
  return (
    <Panel>
      <h2 className="mb-2 font-display font-bold">
        {icon} {tx(title)}
      </h2>
      <ul className="flex flex-col gap-2 text-sm leading-relaxed">
        {items.map((x, i) => (
          <li key={i}>{tx(x)}</li>
        ))}
      </ul>
    </Panel>
  );
}

function MetricCard({ metric, c }: { metric: MetricKey; c: WhatIfComparison }) {
  const { tx } = useSettings();
  const info = METRIC_INFO[metric];
  const o = c.original.final.resources[metric];
  const a = c.alternative.final.resources[metric];
  const pct = (v: number) => `${Math.max(2, Math.min(100, (v / info.max) * 100))}%`;
  const label = `${tx(info.label)}: ${tx(UI.original)} ${Math.round(o)}${info.unit}, ${tx(UI.alternative)} ${Math.round(a)}${info.unit}`;
  return (
    <Panel className="!p-4" aria-label={label}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-display font-bold">
          {info.icon} {tx(info.label)}
        </h3>
        <Delta value={a - o} unit={info.unit} />
      </div>
      <div className="flex flex-col gap-1.5" dir="ltr">
        <Bar color={CYAN} width={pct(o)} value={`${Math.round(o)}${info.unit}`} sym="●" />
        <Bar color={PURPLE} width={pct(a)} value={`${Math.round(a)}${info.unit}`} sym="■" dashed />
      </div>
      <Spark a={c.original.days} b={c.alternative.days} field={metric} max={info.max} splitDay={c.divergence.day} />
    </Panel>
  );
}

function Bar({ color, width, value, sym, dashed }: { color: string; width: string; value: string; sym: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 text-xs" style={{ color }} aria-hidden>
        {sym}
      </span>
      <div className="h-3 flex-1 rounded bg-space/70">
        <div
          className="h-3 rounded"
          style={{ width, background: dashed ? `repeating-linear-gradient(90deg, ${color} 0 8px, ${color}99 8px 12px)` : color }}
        />
      </div>
      <span className="w-20 text-end text-sm font-bold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function Spark({ a, b, field, max, splitDay }: { a: DayLog[]; b: DayLog[]; field: MetricKey; max: number; splitDay: number }) {
  const W = 200,
    H = 50,
    p = 4;
  const x = (i: number) => p + (i * (W - 2 * p)) / 6;
  const y = (v: number) => H - p - (Math.min(v, max) / max) * (H - 2 * p);
  const path = (ls: DayLog[]) => ls.map((l, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(l[field]).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-12 w-full" aria-hidden style={{ direction: "ltr" }}>
      <line x1={x(splitDay - 1)} x2={x(splitDay - 1)} y1={0} y2={H} stroke="#ffad4d" strokeDasharray="3 3" />
      <path d={path(a)} fill="none" stroke={CYAN} strokeWidth="2.5" />
      <path d={path(b)} fill="none" stroke={PURPLE} strokeWidth="2.5" strokeDasharray="5 4" />
    </svg>
  );
}

/** Simple branching timeline: shared trunk until the split, then two rows (cyan original, purple alternative). */
function BranchTimeline({ c }: { c: WhatIfComparison }) {
  const { tx } = useSettings();
  const splitIdx = DECISION_ORDER.indexOf(c.decisionId);
  const label = (id: DecisionId, opt: string | undefined) => (opt ? DECISIONS[id].options.find((o) => o.id === opt)?.label : undefined);
  const replaced = new Set(c.later.filter((l) => l.status === "replaced").map((l) => l.decisionId));
  return (
    <Panel aria-label={tx(t("الخط الزمني المتفرّع", "Branching timeline"))}>
      <h2 className="mb-3 font-display font-bold">🌿 {tx(t("الخط الزمني: أين افترق المساران؟", "Timeline: where did the paths split?"))}</h2>
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {DECISION_ORDER.map((id, i) => {
          const dd = DECISIONS[id];
          const shared = i < splitIdx;
          const isSplit = i === splitIdx;
          const ol = label(id, c.original.choices[id]);
          const al = label(id, c.alternative.choices[id]);
          return (
            <li key={id} className={`rounded-2xl border-2 p-3 ${isSplit ? "border-solar bg-solar/10" : "border-holo/15"}`}>
              <span className="block font-display text-xs font-bold text-moon">
                {tx(UI.day)} {dd.day} · {tx(dd.title)}
              </span>
              {isSplit && <span className="mt-1 block text-xs font-bold text-solar">✦ {tx(L.split)}</span>}
              {shared ? (
                <p className="mt-2 text-sm">
                  <span className="text-holo">●</span>
                  <span className="text-violet">■</span> {ol && tx(ol)} <span className="text-moon">({tx(L.same)})</span>
                </p>
              ) : (
                <div className="mt-2 flex flex-col gap-1 text-sm">
                  <span className="rounded-lg border-s-4 px-2 py-1" style={{ borderColor: CYAN }}>
                    <span style={{ color: CYAN }}>●</span> {ol && tx(ol)}
                  </span>
                  <span className="rounded-lg border-s-4 border-dashed px-2 py-1" style={{ borderColor: PURPLE }}>
                    <span style={{ color: PURPLE }}>■</span> {al && tx(al)}
                    {replaced.has(id) && <span className="block text-xs text-solar">⚠ {tx(L.replaced)}</span>}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
