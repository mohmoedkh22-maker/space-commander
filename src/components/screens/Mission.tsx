"use client";
import { useState } from "react";
import { DECISIONS } from "@/lib/game/decisions";
import type { DayLog, DecisionId, DecisionRecord, GameState, T } from "@/lib/game/types";
import { ILLUMINATION } from "@/lib/nasa/illumination";
import { SCENARIO_LIGHT_FACTOR } from "@/lib/game/config";
import { UI, t } from "@/lib/i18n";
import { LunarBase, facilityStatus } from "../LunarBase";
import { useSettings } from "../settings";
import { SuhailSays, type Mood } from "../Suhail";
import { Button, CrewSays, Delta, Panel, ScreenTitle } from "../ui";

const MISSION_NAMES: Record<number, T> = {
  1: t("المهمة 01 — الشمس التي تختفي", "Mission 01 — The Vanishing Sun"),
  2: t("المهمة 02 — القطرة الأخيرة", "Mission 02 — The Last Drop"),
  3: t("المهمة 03 — الإشارة الأخيرة", "Mission 03 — The Final Signal"),
};

export function DecisionScreen({
  id,
  state,
  records,
  onConfirm,
}: {
  id: DecisionId;
  state: GameState;
  records: DecisionRecord[];
  onConfirm: (optionId: string) => void;
}) {
  const { tx, beep } = useSettings();
  const d = DECISIONS[id];
  const [openReports, setOpenReports] = useState<Set<number>>(new Set());
  const [choice, setChoice] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <ScreenTitle kicker={`${tx(MISSION_NAMES[d.mission])} · ${tx(UI.day)} ${d.day}`} title={tx(d.title)} />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-4">
          <Panel className="!p-2">
            <LunarBase status={facilityStatus(state)} storm={state.flags.storm} />
          </Panel>
          <Panel>
            <p className="text-lg leading-relaxed">{tx(d.problem)}</p>
          </Panel>
          {id === "d1-energy" && <NasaLightCard day={d.day} />}
          {id !== "d1-energy" && (
            <Panel>
              <h2 className="mb-1 font-display font-bold text-holo">🔬 {tx(t("لحظة علمية", "Science moment"))}</h2>
              <p className="leading-relaxed">{tx(d.science)}</p>
            </Panel>
          )}
          {id === "d3-emergency" && records.length > 0 && <MiniTimeline records={records} />}
        </div>

        <div className="flex flex-col gap-4">
          <Panel>
            <h2 className="mb-3 font-display font-bold">📋 {tx(UI.reports)}</h2>
            <div className="flex flex-col gap-2">
              {d.reports.map((r, i) => {
                const open = openReports.has(i);
                return (
                  <div key={i} className="rounded-xl border border-holo/20">
                    <button
                      className="flex w-full items-center justify-between px-4 py-3 text-start"
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
                    {open && <p className="px-4 pb-3 text-moon anim-rise">{tx(r.body(state))}</p>}
                  </div>
                );
              })}
            </div>
          </Panel>

          <fieldset className="panel p-5">
            <legend className="sr-only">{tx(UI.options)}</legend>
            <h2 className="mb-3 font-display font-bold">{tx(UI.options)}</h2>
            <div className="flex flex-col gap-3">
              {d.options.map((o, i) => {
                const lock = o.locked?.(state) ?? null;
                const selected = choice === o.id;
                return (
                  <label
                    key={o.id}
                    className={`block cursor-pointer rounded-2xl border-2 p-4 transition ${
                      lock ? "cursor-not-allowed border-moon/20 opacity-60" : selected ? "border-holo bg-holo/10" : "border-holo/20 hover:border-holo/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name={d.id}
                      className="sr-only"
                      disabled={!!lock}
                      checked={selected}
                      onChange={() => {
                        beep("soft");
                        setChoice(o.id);
                      }}
                    />
                    <span className="flex items-start gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-cosmic font-display font-bold" aria-hidden>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">
                        <b className="block text-lg">{tx(o.label)}</b>
                        <span className="mt-1 block text-sm">
                          <span className="text-mint">✔ {tx(UI.benefit)}:</span> {tx(o.benefit)}
                        </span>
                        <span className="block text-sm">
                          <span className="text-solar">⚠ {tx(UI.cost)}:</span> {tx(o.cost)}
                        </span>
                        {lock && (
                          <span className="mt-2 block rounded-lg bg-coral/15 px-3 py-2 text-sm text-coral">
                            🔒 {tx(UI.locked)} — {tx(lock)}
                          </span>
                        )}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {showHint ? (
            <SuhailSays compact mood="thinking" text={d.hint} />
          ) : (
            <Button variant="ghost" onClick={() => setShowHint(true)}>
              💡 {tx(UI.hint)}
            </Button>
          )}
          <Button
            disabled={!choice}
            onClick={() => {
              if (!choice) return;
              beep("ok");
              onConfirm(choice);
            }}
          >
            {tx(UI.confirm)}
          </Button>
        </div>
      </div>
    </main>
  );
}

function NasaLightCard({ day }: { day: number }) {
  const { tx } = useSettings();
  const pct = (ILLUMINATION.fraction * 100).toFixed(1);
  const todayPct = (ILLUMINATION.fraction * (SCENARIO_LIGHT_FACTOR[day] ?? 1) * 100).toFixed(0);
  return (
    <Panel style={{ borderColor: "#ffad4d88" }}>
      <h2 className="mb-2 font-display font-bold text-solar">🛰 {tx(UI.nasaFact)}</h2>
      <p className="mb-3 leading-relaxed">{tx(DECISIONS["d1-energy"].science)}</p>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl bg-space/70 p-3">
          <div className="font-display text-3xl font-bold text-solar" dir="ltr">
            {pct}%
          </div>
          <div className="text-xs text-moon">{tx(t("متوسط ضوء الشمس في موقعنا (ناسا)", "Average sunlight at our site (NASA)"))}</div>
        </div>
        <div className="rounded-xl bg-space/70 p-3">
          <div className="font-display text-3xl font-bold text-coral" dir="ltr">
            ~{todayPct}%
          </div>
          <div className="text-xs text-moon">{tx(t("ضوء اليوم في سيناريو التدريب (افتراضي)", "Today's light in the training scenario (made up)"))}</div>
        </div>
      </div>
      <p className="mt-2 text-xs text-moon">
        {tx(
          t(
            "المصدر: NASA LRO/LOLA — Mazarico وآخرون 2011. الرقم الأول قياس حقيقي متوسط على 18.6 سنة؛ الثاني جزء من قصة اللعبة.",
            "Source: NASA LRO/LOLA — Mazarico et al. 2011. The first number is a real 18.6-year average; the second is part of the game story.",
          ),
        )}
      </p>
    </Panel>
  );
}

function MiniTimeline({ records }: { records: DecisionRecord[] }) {
  const { tx } = useSettings();
  return (
    <Panel>
      <h2 className="mb-3 font-display font-bold text-violet">⏳ {tx(t("قراراتك حتى الآن", "Your decisions so far"))}</h2>
      <ol className="flex flex-col gap-2">
        {records.map((r) => {
          const d = DECISIONS[r.decisionId];
          const o = d.options.find((x) => x.id === r.optionId)!;
          return (
            <li key={r.decisionId} className="flex gap-3">
              <span className="font-display text-sm font-bold text-holo">
                {tx(UI.day)} {r.day}
              </span>
              <span>
                {tx(d.title)}: <b>{tx(o.label)}</b>
              </span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

export function DayResultCard({ log }: { log: DayLog }) {
  const { tx } = useSettings();
  return (
    <Panel>
      <h2 className="mb-3 font-display font-bold">⚡ {tx(UI.day)} {log.day}</h2>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl bg-space/70 p-3">
          <div className="font-display text-2xl font-bold text-solar" dir="ltr">
            +{Math.round(log.solarKWh)} kWh
          </div>
          <div className="text-xs text-moon">{tx(UI.solar)}</div>
        </div>
        <div className="rounded-xl bg-space/70 p-3">
          <div className="font-display text-2xl font-bold text-coral" dir="ltr">
            −{Math.round(log.loadKWh)} kWh
          </div>
          <div className="text-xs text-moon">{tx(UI.used)}</div>
        </div>
      </div>
      {log.shed.length > 0 && (
        <p className="mt-3 rounded-lg bg-solar/15 px-3 py-2 text-sm">
          ⚠ {tx(UI.shed)} {log.shed.map((x) => tx(UI.shedNames[x])).join("، ")}
        </p>
      )}
    </Panel>
  );
}

function DeltaTable({ before, after }: { before: GameState; after: GameState }) {
  const { tx } = useSettings();
  const rows: [string, number, string][] = [
    [tx(UI.energy), after.batteryKWh - before.batteryKWh, " kWh"],
    [tx(UI.water), after.waterL - before.waterL, " L"],
    [tx(UI.oxygen), after.oxygenPct - before.oxygenPct, "%"],
    [tx(UI.food), after.cropPct - before.cropPct, "%"],
  ];
  return (
    <Panel>
      <h2 className="mb-3 font-display font-bold">{tx(UI.whatChanged)}</h2>
      <ul className="grid grid-cols-2 gap-2">
        {rows.map(([l, v, u]) => (
          <li key={l} className="flex justify-between rounded-xl bg-space/60 px-3 py-2">
            <span>{l}</span>
            <Delta value={v} unit={u} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function ConsequenceScreen({
  record,
  after,
  onNext,
}: {
  record: DecisionRecord;
  after: GameState;
  onNext: () => void;
}) {
  const { tx } = useSettings();
  const d = DECISIONS[record.decisionId];
  const o = d.options.find((x) => x.id === record.optionId)!;
  const log = after.log[after.log.length - 1];
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <ScreenTitle kicker={`${tx(UI.yourChoice)}: ${tx(o.label)}`} title={tx(t("نتيجة قرارك", "Your decision's result"))} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Panel className="!p-2">
            <LunarBase status={facilityStatus(after)} storm={after.flags.storm} />
          </Panel>
          <CrewSays who={o.crew.who} text={o.crew.text} />
        </div>
        <div className="flex flex-col gap-4">
          <DeltaTable before={record.before} after={after} />
          {log && <DayResultCard log={log} />}
          <SuhailSays mood="thinking" text={o.suhail} />
          <Button onClick={onNext}>{tx(UI.continue)}</Button>
        </div>
      </div>
    </main>
  );
}

const DAY_LINES: Record<number, { title: T; suhail: T; mood: Mood }> = {
  1: {
    title: t("اليوم 1 — الأنظمة تعمل", "MISSION DAY 1 — SYSTEMS ONLINE"),
    suhail: t("أحسنت أيها القائد. كل الأنظمة تعمل بشكل طبيعي. لنبدأ يومنا الأول.", "Well done, Commander. All systems are normal. Let's begin our first day."),
    mood: "happy",
  },
  4: {
    title: t("اليوم 4 — مراجعة الموارد", "DAY 4 — RESOURCE CHECK"),
    suhail: t(
      "اجتزنا تحديين. لكن الأيام الأخيرة قد تحتاج ما تبقّى من احتياطياتنا. سؤال واحد: هل خطتنا مستعدة لمشكلة غير متوقعة؟",
      "We've passed two challenges. But the last days may need what's left of our reserves. One question: is our plan ready for a surprise?",
    ),
    mood: "thinking",
  },
  5: { title: t("اليوم 5 — في المأوى", "DAY 5 — IN THE SHELTER"), suhail: t("الطاقم آمن في المأوى. الأنظمة الحيوية تعمل.", "The crew is safe in the shelter. Vital systems running."), mood: "normal" },
  6: { title: t("اليوم 6 — العاصفة مستمرة", "DAY 6 — STORM CONTINUES"), suhail: t("نراقب الموارد ساعة بساعة. خطتك قيد التنفيذ.", "We're watching resources hour by hour. Your plan is running."), mood: "normal" },
  7: { title: t("اليوم 7 — الإشارة الأخيرة", "DAY 7 — THE FINAL SIGNAL"), suhail: t("العاصفة تهدأ. لنرَ أين أوصلتنا قراراتك.", "The storm is calming. Let's see where your decisions led us."), mood: "curious" },
};

export function DayScreen({ day, before, after, onNext }: { day: number; before: GameState; after: GameState; onNext: () => void }) {
  const { tx } = useSettings();
  const info = DAY_LINES[day] ?? DAY_LINES[1];
  const log = after.log[after.log.length - 1];
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <ScreenTitle kicker={`${tx(UI.day)} ${day} / 7`} title={tx(info.title)} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="!p-2">
          <LunarBase status={facilityStatus(after)} storm={after.flags.storm} />
        </Panel>
        <div className="flex flex-col gap-4">
          {log && <DayResultCard log={log} />}
          {day > 1 && <DeltaTable before={before} after={after} />}
          <SuhailSays mood={info.mood} text={info.suhail} />
          <Button onClick={onNext} autoFocus>
            {tx(UI.continue)}
          </Button>
        </div>
      </div>
    </main>
  );
}

export function FaultEvent({ state, onNext }: { state: GameState; onNext: () => void }) {
  const { tx } = useSettings();
  const lowPower = state.batteryKWh < 150;
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <ScreenTitle kicker={tx(MISSION_NAMES[2])} title={tx(t("تنبيه: نظام المياه", "ALERT: Water system"))} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="!p-2">
          <LunarBase status={facilityStatus(state)} />
        </Panel>
        <div className="flex flex-col gap-3">
          <CrewSays who="mira" text={t("سهيل، كمية المياه التي نستعيدها أقل من المعتاد!", "SUHAIL, we're recovering less water than usual!")} />
          <CrewSays who="layan" text={t("علينا التأكد من توفير احتياجات الطاقم الأساسية.", "We must make sure the crew's basic needs are covered.")} />
          {state.cropPct < 45 && (
            <CrewSays who="mira" text={t("المزرعة لم تصل بعد إلى مستوى النمو المخطط.", "The greenhouse hasn't reached its planned growth yet.")} />
          )}
          <SuhailSays
            mood="warning"
            text={
              lowPower
                ? t(
                    "مشكلة جديدة أيها القائد. واحتياطي البطارية محدود الآن — لن نستطيع زيادة تشغيل كل المعدات دون مراجعة الأنظمة الأخرى. هنا يظهر أثر قرارنا السابق.",
                    "A new problem, Commander. And our battery reserve is limited now — we can't run every machine harder without checking other systems. Here's where our earlier decision shows up.",
                  )
                : t(
                    "مشكلة جديدة أيها القائد. لدينا احتياطي كهرباء جيد، وهذا يمنحنا مساحة إضافية — لكنه لا يجعل الموارد غير محدودة.",
                    "A new problem, Commander. We have a good power reserve, which gives us extra room — but it doesn't make resources unlimited.",
                  )
            }
          />
          <Button onClick={onNext} autoFocus>
            {tx(UI.continue)}
          </Button>
        </div>
      </div>
    </main>
  );
}

export function StormEvent({ state, onNext }: { state: GameState; onNext: () => void }) {
  const { tx, beep } = useSettings();
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <ScreenTitle kicker={tx(MISSION_NAMES[3])} title={tx(t("تحذير طقس فضائي — سيناريو تدريبي", "SPACE WEATHER WARNING — TRAINING SCENARIO"))} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="!p-2" style={{ borderColor: "#8c78ff88" }}>
          <LunarBase status={{ ...facilityStatus(state), shelter: "warn" }} storm />
        </Panel>
        <div className="flex flex-col gap-3">
          <SuhailSays
            mood="warning"
            text={t(
              "وصل تحذير من احتمال ارتفاع الجسيمات الشمسية ضمن سيناريو مهمتنا. يجب أن نراجع خطة السلامة فورًا.",
              "We've received a warning about a possible rise in solar particles in our mission scenario. We need to review the safety plan right away.",
            )}
          />
          <CrewSays who="rashed" text={t("سنوقف الأنشطة الخارجية ونجهّز المأوى.", "We'll stop outside work and prepare the shelter.")} />
          <CrewSays who="layan" text={t("الأولوية: وصول الطاقم إلى مكان محمي.", "Priority: get the crew somewhere protected.")} />
          <Button
            onClick={() => {
              beep("alert");
              onNext();
            }}
            autoFocus
          >
            {tx(UI.continue)}
          </Button>
        </div>
      </div>
    </main>
  );
}

export function SafetyScreen({ onNext }: { onNext: () => void }) {
  const { tx, beep } = useSettings();
  const [done, setDone] = useState<boolean[]>(UI.safetyItems.map(() => false));
  const [warn, setWarn] = useState(false);
  const all = done.every(Boolean);
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <ScreenTitle kicker={`${tx(UI.day)} 5`} title={tx(UI.safetyTitle)} />
      <Panel>
        <ul className="flex flex-col gap-3">
          {UI.safetyItems.map((it, i) => (
            <li key={i}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-holo/20 p-4 has-[:checked]:border-mint has-[:checked]:bg-mint/10">
                <input
                  type="checkbox"
                  className="size-6 accent-[#43d9a3]"
                  checked={done[i]}
                  onChange={() => {
                    beep("soft");
                    setDone((d) => d.map((v, j) => (j === i ? !v : v)));
                  }}
                />
                <span className="text-lg">{tx(it)}</span>
                {done[i] && <span className="ms-auto text-mint">✓</span>}
              </label>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="mt-4 flex flex-col gap-3">
        {warn && !all && <SuhailSays mood="warning" text={UI.safetyWarn} />}
        <Button
          onClick={() => {
            if (!all) {
              beep("alert");
              setWarn(true);
              return;
            }
            beep("ok");
            onNext();
          }}
        >
          {tx(UI.continue)}
        </Button>
      </div>
    </main>
  );
}
