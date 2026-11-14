"use client";
import { useEffect, useState } from "react";
import { DECISIONS } from "@/lib/game/decisions";
import { lockReason } from "@/lib/game/engine";
import { suhailLines } from "@/lib/game/dialogue";
import { optionCost } from "@/lib/game/experience";
import { explainFacilities } from "@/lib/game/consequences";
import { BATTERY_CAP_KWH } from "@/lib/game/config";
import { LunarBase, facilityStatus } from "../LunarBase";
import { useCountUp } from "../experience/CountUp";
import type { DecisionId, DecisionRecord, GameState, T } from "@/lib/game/types";
import { CREW, UI, t } from "@/lib/i18n";
import { RESOURCE_ORDER, resourceValue } from "@/lib/mission";
import { MISSION_NAMES, MiniTimeline, NasaLightCard } from "../screens/Mission";
import { useSettings } from "../settings";
import { SuhailBot } from "../Suhail";
import { Button, CrewSays, Panel } from "../ui";
import { OptionArt } from "./OptionArt";
import { WhyPanel } from "./WhyPanel";
import { explainDay, guidanceFor } from "@/lib/game/consequences";
import { ResourceIndicator } from "./ResourceIndicator";
import { Stepper } from "./Stepper";

const FLOW: T[] = [t("التحقيق", "Investigate"), t("القرار", "Decide"), t("النتيجة", "Result")];

/** Big centred title with the orange flourishes from the mockups. */
function FancyTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <header className="mb-5 flex flex-col items-center gap-2 text-center anim-rise">
      {kicker && <p className="font-display text-sm font-bold tracking-[0.2em] text-holo">{kicker}</p>}
      <div className="flex items-center gap-3 sm:gap-5">
        <span className="h-1.5 w-10 rounded-full bg-gradient-to-l from-solar to-transparent sm:w-20" aria-hidden />
        <h1 className="font-display text-3xl font-bold sm:text-5xl">{title}</h1>
        <span className="h-1.5 w-10 rounded-full bg-gradient-to-r from-solar to-transparent sm:w-20" aria-hidden />
      </div>
      {sub && <p className="max-w-3xl text-lg leading-relaxed text-lunar/90 sm:text-xl">{sub}</p>}
    </header>
  );
}

/** SUHAIL with a big speech bubble, as on the left of the mockups. */
function SuhailCorner({ text, mood }: { text: T; mood: "curious" | "thinking" | "happy" | "warning" | "normal" }) {
  const { tx } = useSettings();
  return (
    <div className="flex items-start gap-3 lg:flex-col lg:items-center">
      <SuhailBot mood={mood} size={110} />
      <div className="panel relative flex-1 px-4 py-3 text-base leading-relaxed sm:text-lg" style={{ borderColor: "#4fe5ffaa", boxShadow: "0 0 24px #4fe5ff22" }} aria-live="polite">
        <span className="mb-1 block w-fit rounded-full border border-holo/60 px-3 font-display text-sm font-bold text-holo">{tx(t("سهيل", "SUHAIL"))}</span>
        {tx(text)}
      </div>
    </div>
  );
}

export function DecisionScreen({
  id,
  state,
  records,
  onConfirm,
  notes = [],
}: {
  id: DecisionId;
  state: GameState;
  records: DecisionRecord[];
  onConfirm: (optionId: string) => void;
  /** clues the commander discovered while inspecting the base */
  notes?: T[];
}) {
  const { tx, beep } = useSettings();
  const d = DECISIONS[id];
  const [openReports, setOpenReports] = useState<Set<number>>(new Set());
  const [choice, setChoice] = useState<string | null>(null);
  const step = choice ? 1 : 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mx-auto mb-4 max-w-xl">
        <Stepper steps={FLOW} current={step} />
      </div>
      <FancyTitle kicker={`${tx(MISSION_NAMES[d.mission])} · ${tx(UI.day)} ${d.day}`} title={tx(d.title)} sub={tx(d.problem)} />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Left: SUHAIL + investigation */}
        <aside className="flex flex-col gap-4">
          <SuhailCorner mood="thinking" text={guidanceFor(id, state)} />
          {notes.length > 0 && (
            <Panel className="!p-4" style={{ borderColor: "#43d9a3aa" }}>
              <h2 className="mb-2 font-display font-bold text-mint">📝 {tx(t("ملاحظات تحقيقك", "Your investigation notes"))}</h2>
              <ul className="flex flex-col gap-2 text-sm leading-relaxed">
                {notes.map((n, i) => (
                  <li key={i} className="rounded-lg bg-space/60 px-3 py-2">
                    🔎 {tx(n)}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel className="!p-4">
            <h2 className="mb-2 font-display font-bold">📋 {tx(UI.reports)}</h2>
            <div className="flex flex-col gap-2">
              {d.reports.map((r, i) => {
                const open = openReports.has(i);
                return (
                  <div key={i} className="rounded-xl border border-holo/20">
                    <button
                      className="flex min-h-11 w-full items-center justify-between px-3 py-2 text-start"
                      aria-expanded={open}
                      onClick={() => {
                        beep("soft");
                        setOpenReports((s) => {
                          const n = new Set(s);
                          if (n.has(i)) n.delete(i);
                          else n.add(i);
                          return n;
                        });
                      }}
                    >
                      <span>{tx(r.title)}</span>
                      <span aria-hidden>{open ? "−" : "+"}</span>
                    </button>
                    {open && <p className="px-3 pb-3 text-moon anim-rise">{tx(r.body(state))}</p>}
                  </div>
                );
              })}
            </div>
          </Panel>
          {id === "d1-energy" ? (
            <NasaLightCard day={d.day} />
          ) : (
            <Panel className="!p-4">
              <h2 className="mb-1 font-display font-bold text-holo">🔬 {tx(t("لحظة علمية", "Science moment"))}</h2>
              <p className="leading-relaxed">{tx(d.science)}</p>
            </Panel>
          )}
          {id === "d3-emergency" && records.length > 0 && <MiniTimeline records={records} />}
        </aside>

        {/* Right: illustrated option cards */}
        <section>
          <h2 className="sr-only">{tx(UI.options)}</h2>
          <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label={tx(UI.options)}>
            {d.options.map((o, i) => {
              const lock = lockReason(state, d.id, o.id);
              const selected = choice === o.id;
              const cost = optionCost(state, d.id, o.id);
              return (
                <label
                  key={o.id}
                  className={`group relative flex cursor-pointer flex-col gap-3 rounded-[22px] border-[3px] bg-midnight/90 p-3 transition ${
                    lock
                      ? "cursor-not-allowed border-moon/20 opacity-70"
                      : selected
                        ? "border-solar shadow-[0_0_32px_#ffad4d88]"
                        : "border-holo/40 hover:border-holo hover:shadow-[0_0_24px_#4fe5ff44]"
                  }`}
                >
                  <input
                    type="radio"
                    name={d.id}
                    className="peer sr-only"
                    disabled={!!lock}
                    checked={selected}
                    onChange={() => {
                      beep("soft");
                      setChoice(o.id);
                    }}
                  />
                  <OptionArt optionId={o.id} locked={!!lock} />
                  <div className="flex flex-1 flex-col gap-1.5 px-1 text-center">
                    <span className="font-display text-sm font-bold text-holo">{String.fromCharCode(65 + i)}</span>
                    <b className="text-xl leading-snug">{tx(o.label)}</b>
                    <span className="text-sm text-moon">{tx(o.description)}</span>
                    <span className="text-sm text-lunar/90">
                      <span className="text-mint">✔ </span>
                      {tx(o.benefit)}
                    </span>
                    <span className="text-sm text-lunar/90">
                      <span className="text-solar">⚠ </span>
                      {tx(o.cost)}
                    </span>
                    {cost && (
                      <span className="mx-auto mt-1 inline-flex flex-wrap justify-center gap-x-3 gap-y-1 rounded-lg bg-space/70 px-3 py-1.5 text-xs" dir="auto">
                        <span>
                          ⚡ {tx(t("استهلاك اليوم", "Uses today"))}: <b dir="ltr">{Math.round(cost.useKWh)} kWh</b>
                        </span>
                        <span>
                          ☀️ {tx(t("إنتاج الألواح", "Panels make"))}: <b dir="ltr">{Math.round(cost.solarKWh)} kWh</b>
                        </span>
                      </span>
                    )}
                    {lock && <span className="mt-1 rounded-lg bg-coral/15 px-3 py-2 text-sm text-coral">🔒 {tx(lock)}</span>}
                  </div>
                  <span
                    className={`mx-auto mb-1 grid size-9 place-items-center rounded-full border-[3px] peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-holo ${
                      selected ? "border-solar" : "border-holo/70"
                    }`}
                    aria-hidden
                  >
                    {selected && <span className="size-4 rounded-full bg-solar" />}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="mt-6 flex justify-center">
            <Button
              size="lg"
              disabled={!choice}
              className="min-w-[min(100%,360px)]"
              onClick={() => {
                if (!choice) return;
                beep("ok");
                onConfirm(choice);
              }}
            >
              ▶ {tx(t("تأكيد الاختيار", "Confirm choice"))}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}

/** Resource tile whose number visibly counts from the old value to the new one. */
function AnimatedTile({ id, from, to, pct }: { id: (typeof RESOURCE_ORDER)[number]; from: number; to: number; pct: number }) {
  const v = useCountUp(from, to, 1300, 700);
  return <ResourceIndicator id={id} value={v} pct={pct} variant="tile" delta={v - from} />;
}

export function ConsequenceScreen({ record, after, onNext }: { record: DecisionRecord; after: GameState; onNext: () => void }) {
  const { tx, beep } = useSettings();
  const d = DECISIONS[record.decisionId];
  const o = d.options.find((x) => x.id === record.optionId)!;
  const log = after.log[after.log.length - 1];
  const crew = CREW[o.crew.who];
  // the base is shown as it WAS, then switches to how it IS now
  const [live, setLive] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => {
      setLive(true);
      beep("facility");
    }, 700);
    return () => window.clearTimeout(id);
  }, [beep]);
  const shown = live ? after : record.before;
  const facilityChanges = explainFacilities(record.before, after);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mx-auto mb-4 max-w-xl">
        <Stepper steps={FLOW} current={2} />
      </div>
      <FancyTitle title={tx(t("نتيجة القرار", "Decision result"))} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
          <div className="panel relative !p-2" style={{ borderColor: live ? "#43d9a3aa" : "#4fe5ff55" }}>
            <span className="absolute start-3 top-3 z-10 rounded-full bg-space/80 px-3 py-1 text-xs font-bold" aria-live="polite">
              {live ? `● ${tx(t("القاعدة الآن", "Base now"))}` : `◌ ${tx(t("قبل قرارك", "Before your decision"))}`}
            </span>
            <LunarBase status={facilityStatus(shown)} storm={shown.flags.storm} energyPct={(shown.resources.energy / BATTERY_CAP_KWH) * 100} />
          </div>
          {facilityChanges.length > 0 && (
            <ul className="flex flex-col gap-2" aria-label={tx(t("ماذا تغيّر في القاعدة", "What changed in the base"))}>
              {facilityChanges.map((c, i) => (
                <li key={i} className={`rounded-xl border border-holo/40 bg-space/70 px-3 py-2 text-sm ${live ? "clue-pop" : "opacity-0"}`} style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
                  🏗️ {tx(c.text)}
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-center">
            <SuhailBot mood="happy" size={110} />
          </div>
        </div>
        <section className="panel flex flex-col gap-5 p-5 sm:p-7" style={{ borderColor: "#4fe5ffaa", boxShadow: "0 0 36px #4fe5ff22" }}>
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="flex items-center gap-3 rounded-full border-[3px] border-mint bg-mint/15 py-2 pe-6 ps-2 text-xl font-bold shadow-[0_0_24px_#43d9a355] sm:text-2xl">
              <span className="grid size-10 place-items-center rounded-full bg-mint text-space" aria-hidden>
                ✓
              </span>
              {tx(o.label)}
            </p>
            <p className="max-w-2xl text-lg leading-relaxed">{tx(o.suhail)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-holo/30 p-3 sm:p-4 lg:grid-cols-4">
            {RESOURCE_ORDER.map((r) => {
              const now = resourceValue(after, r);
              const before = resourceValue(record.before, r);
              return <AnimatedTile key={r} id={r} from={before.value} to={now.value} pct={now.pct} />;
            })}
          </div>

          <CrewSays who={o.crew.who} text={o.crew.text} />

          {/* stored consequences of this choice (they follow the player into the next missions) */}
          <div className="rounded-2xl border border-solar/40 bg-solar/5 p-4">
            <h2 className="mb-2 font-display text-lg font-bold text-solar">📌 {tx(t("ما الذي سيتغير بعد قرارك", "What your decision changes"))}</h2>
            <ul className="flex flex-col gap-1.5">
              {o.consequences.map((c, i) => (
                <li key={i}>• {tx(c)}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-lunar/85">
              🔬 <b>{tx(t("العلم وراء القرار:", "The science:"))}</b> {tx(o.explanation)}
            </p>
          </div>

          {/* SUHAIL reacts to the new state (data-driven rules) */}
          {suhailLines(after, "after-decision", 1).map((l) => (
            <p key={l.id} className="rounded-xl border border-holo/40 bg-holo/5 px-4 py-3 leading-relaxed">
              <b className="text-holo">{tx(t("سهيل:", "SUHAIL:"))}</b> {tx(l.text)}
            </p>
          ))}

          {log && <WhyPanel open items={explainDay(log, record.before, after)} />}

          {log && (
            <p className="text-center text-sm text-moon">
              ⚡ {tx(UI.day)} {log.day}: <span dir="ltr">+{Math.round(log.solarKWh)} kWh</span> {tx(UI.solar)} ·{" "}
              <span dir="ltr">−{Math.round(log.loadKWh)} kWh</span> {tx(UI.used)}
              {log.shed.length > 0 && (
                <>
                  {" "}
                  · ⚠ {tx(UI.shed)} {log.shed.map((x) => tx(UI.shedNames[x])).join("، ")}
                </>
              )}
            </p>
          )}
          <span className="sr-only">{tx(crew.name)}</span>
        </section>
      </div>

      <div className="mt-6 flex justify-center">
        <Button size="lg" onClick={onNext} className="min-w-[min(100%,360px)]" autoFocus>
          ▶ {tx(t("التالي", "Next"))}
        </Button>
      </div>
    </main>
  );
}
