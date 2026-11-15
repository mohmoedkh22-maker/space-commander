"use client";
import { useEffect, useState } from "react";
import { BATTERY_CAP_KWH } from "@/lib/game/config";
import {
  activeEvents,
  CLUES_REQUIRED,
  cluesFor,
  INSPECTION_ORDER,
  INSPECTIONS,
  MISSION_INTROS,
  type ExperienceEvent,
  type FacilityInspection,
} from "@/lib/game/experience";
import { SAFETY_CHECKS, allSafetyChecksDone, completeSafetyCheck } from "@/lib/game/safety";
import type { GameState, MissionId } from "@/lib/game/types";
import { CREW, t } from "@/lib/i18n";
import { FACILITIES, RESOURCES, resourceValue } from "@/lib/mission";
import { LunarBase, facilityStatus, type FacilityId } from "../LunarBase";
import { Portrait } from "../Portrait";
import { useSettings } from "../settings";
import { Button } from "../ui";
import { SpeakerAvatar, speakerName } from "./ScriptDialogue";
import { BaseFrame } from "./Journey";

type InspectId = FacilityInspection["id"];
const LEVEL = { ok: "#43d9a3", warn: "#ffad4d", crit: "#ff6b6b" } as const;

function EventBanner({ events, state }: { events: ExperienceEvent[]; state: GameState }) {
  const { tx } = useSettings();
  if (!events.length) return null;
  const [top, ...rest] = events;
  const color = top.severity === "critical" ? "#ff6b6b" : "#ffad4d";
  return (
    <section className="banner-pulse mb-4 rounded-2xl border-2 bg-space/80 p-4 sm:p-5" style={{ borderColor: color }} role="alert">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full text-2xl" style={{ background: color + "33" }} aria-hidden>
          {top.severity === "critical" ? "🚨" : "⚠️"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold sm:text-xl" style={{ color }}>
            {tx(top.title)}
          </p>
          <p className="leading-relaxed">{tx(top.description(state))}</p>
        </div>
      </div>
      <p className="mt-2 text-sm text-moon">
        👉 {tx(top.interaction)} · {tx(top.consequence)}
      </p>
      {rest.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {rest.map((e) => (
            <li key={e.id} className="rounded-full border border-solar/50 px-3 py-1 text-sm">
              ⚠️ {tx(e.title)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Inspector({
  id,
  state,
  mission,
  found,
  onFind,
  onClose,
}: {
  id: InspectId;
  state: GameState;
  mission: MissionId;
  found: Set<string>;
  onFind: (clueId: string) => void;
  onClose: () => void;
}) {
  const { tx } = useSettings();
  const ins = INSPECTIONS[id];
  const fac = FACILITIES[id];
  const cond = ins.condition(state);
  const crew = CREW[ins.owner];
  const clues = ins.clues.filter((c) => c.missions.includes(mission));
  return (
    <section className="panel anim-rise flex flex-col gap-3 p-4 sm:p-5" style={{ borderColor: fac.color + "aa", boxShadow: `0 0 30px ${fac.color}22` }} aria-labelledby="insp-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="insp-title" className="font-display text-2xl font-bold" style={{ color: fac.color }}>
            {tx(fac.name)}
          </h2>
          <p className="mt-1 inline-flex items-center gap-2 rounded-full border px-3 py-0.5 text-sm" style={{ borderColor: LEVEL[cond.level], color: LEVEL[cond.level] }}>
            {cond.level === "ok" ? "✓" : "!"} {tx(cond.text)}
          </p>
        </div>
        <button onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-xl border border-holo/30 hover:bg-holo/10" aria-label={tx(t("إغلاق", "Close"))}>
          ✕
        </button>
      </div>
      <p className="leading-relaxed text-lunar/90">{tx(fac.info)}</p>
      <div className="flex flex-wrap gap-2">
        {ins.resources.map((r) => {
          const v = resourceValue(state, r);
          return (
            <span key={r} className="rounded-full border px-3 py-1 text-sm" style={{ borderColor: RESOURCES[r].color + "aa" }}>
              {RESOURCES[r].icon} {tx(RESOURCES[r].name)}: <b dir="ltr">{Math.round(v.value)} {RESOURCES[r].unit}</b>
            </span>
          );
        })}
      </div>
      <div className="flex items-start gap-3 rounded-xl bg-space/60 p-3">
        <Portrait id={ins.owner} size={52} />
        <p className="leading-relaxed">
          <b style={{ color: crew.color }}>{tx(crew.name)}:</b> “{tx(ins.report(state))}”
        </p>
      </div>
      {clues.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-display text-sm font-bold tracking-wider text-holo">🔎 {tx(t("افحص المعدات", "Inspect equipment"))}</p>
          {clues.map((c) =>
            found.has(c.id) ? (
              <div key={c.id} className="clue-pop rounded-xl border border-mint/60 bg-mint/10 p-3 leading-relaxed">
                <b className="text-mint">✓ {tx(c.action)}</b>
                <p className="mt-1">{tx(c.reveal(state))}</p>
              </div>
            ) : (
              <button key={c.id} onClick={() => onFind(c.id)} className="min-h-12 rounded-xl border-2 border-dashed border-holo/60 px-4 py-2 text-start hover:border-holo hover:bg-holo/10">
                🔍 {tx(c.action)}
              </button>
            ),
          )}
        </div>
      )}
    </section>
  );
}

/**
 * The interactive lunar base for one mission: live facility states from the engine, emergency events,
 * facility inspection with clues, crew comms, and (Mission 03) the engine's safety steps.
 */
export function BaseHub({
  mission,
  state,
  found,
  onFind,
  onReady,
}: {
  mission: MissionId;
  state: GameState;
  found: Set<string>;
  onFind: (clueId: string) => void;
  onReady: () => void;
}) {
  const { tx, beep } = useSettings();
  const [s, setS] = useState(state); // local copy so the safety steps run through the engine
  useEffect(() => setS(state), [state]);
  const [sel, setSel] = useState<InspectId | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const events = activeEvents(s);
  const missionClues = cluesFor(mission);
  const foundHere = missionClues.filter((c) => found.has(c.clue.id)).length;
  const need = CLUES_REQUIRED[mission];
  const safetyOk = mission !== 3 || allSafetyChecksDone(s);
  const ready = foundHere >= need && safetyOk;

  useEffect(() => {
    if (events.length) beep("alert");
    // only when the hub opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (id: FacilityId) => {
    if (id === "command") return;
    beep("facility");
    setSel(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      window.setTimeout(() => document.getElementById("inspector")?.scrollIntoView({ block: "start" }), 60);
    }
  };
  const find = (clueId: string) => {
    beep("ok");
    onFind(clueId);
    setToast(clueId);
    window.setTimeout(() => setToast(null), 1800);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-5">
      <header className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-display text-sm font-bold tracking-[0.2em] text-holo">{tx(MISSION_INTROS[mission].kicker)}</p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            {mission === 3
              ? tx(t("حالة طوارئ: احمِ الطاقم أولًا", "Emergency: protect the crew first"))
              : tx(t("مركز التحكم: استكشف القاعدة وحقّق", "Mission Control: explore and investigate"))}
          </h1>
        </div>
        <p className="max-w-md text-sm text-moon">🎯 {tx(MISSION_INTROS[mission].objective)}</p>
      </header>

      <EventBanner events={events} state={s} />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-3">
          <BaseFrame state={s}>
            <LunarBase
              status={facilityStatus(s)}
              onSelect={select}
              selected={sel}
              storm={s.flags.storm}
              alert={events[0]?.facility ?? null}
              energyPct={(s.resources.energy / BATTERY_CAP_KWH) * 100}
            />
          </BaseFrame>
          <nav aria-label={tx(t("مرافق القاعدة", "Base facilities"))}>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {INSPECTION_ORDER.map((id) => {
                const cond = INSPECTIONS[id].condition(s);
                const total = INSPECTIONS[id].clues.filter((c) => c.missions.includes(mission));
                const got = total.filter((c) => found.has(c.id)).length;
                const isAlert = events[0]?.facility === id;
                return (
                  <li key={id}>
                    <button
                      onClick={() => select(id)}
                      aria-pressed={sel === id}
                      className={`flex min-h-14 w-full flex-col items-start rounded-xl border-2 px-3 py-2 text-start text-sm transition hover:-translate-y-0.5 aria-pressed:bg-holo/15 ${isAlert ? "banner-pulse" : ""}`}
                      style={{ borderColor: isAlert ? "#ff6b6b" : FACILITIES[id].color + "77" }}
                    >
                      <span className="flex w-full items-center justify-between gap-1">
                        <b className="truncate">{tx(FACILITIES[id].name)}</b>
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: LEVEL[cond.level] }} aria-hidden />
                      </span>
                      <span className="text-xs text-moon">
                        {tx(cond.text)}
                        {total.length > 0 && ` · 🔎 ${got}/${total.length}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div id="inspector" className="flex scroll-mt-4 flex-col gap-3">
          {sel ? (
            <Inspector id={sel} state={s} mission={mission} found={found} onFind={find} onClose={() => setSel(null)} />
          ) : (
            <section className="panel flex flex-col gap-3 p-4 sm:p-5" aria-label={tx(t("اتصالات الطاقم", "Crew comms"))}>
              <p className="font-display text-sm font-bold tracking-wider text-holo">📡 {tx(t("اتصالات الطاقم", "CREW COMMS"))}</p>
              {(events.length ? events.flatMap((e) => e.dialogue(s)) : []).map((l, i) => (
                <div key={i} className="flex items-start gap-3 anim-rise" style={{ animationDelay: `${i * 0.25}s` }}>
                  <SpeakerAvatar who={l.who} size={52} />
                  <p className="rounded-xl bg-space/60 px-3 py-2 leading-relaxed">
                    <b>{speakerName(l.who, tx)}:</b> {tx(l.text)}
                  </p>
                </div>
              ))}
              <p className="rounded-xl border border-dashed border-holo/50 px-3 py-2 text-sm text-moon">
                👆 {tx(t("اضغط على أي مبنى (أو الأزرار) لتفحصه. المبنى الذي فيه إنذار يومض بالأحمر.", "Tap any building (or the buttons) to inspect it. The building with an alarm flashes red."))}
              </p>
            </section>
          )}

          {mission === 3 && (
            <section className="panel p-4" style={{ borderColor: allSafetyChecksDone(s) ? "#43d9a3aa" : "#ff6b6baa" }}>
              <p className="mb-2 font-display font-bold">🛡️ {tx(t("خطوات السلامة (إلزامية)", "Safety steps (required)"))}</p>
              <ul className="flex flex-col gap-2">
                {SAFETY_CHECKS.map((c) => {
                  const done = s.safetyChecks[c.id];
                  return (
                    <li key={c.id}>
                      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-holo/20 px-3 py-2 has-[:checked]:border-mint has-[:checked]:bg-mint/10">
                        <input
                          type="checkbox"
                          className="size-5 accent-[#43d9a3]"
                          checked={done}
                          disabled={done}
                          onChange={() => {
                            beep("soft");
                            setS((prev) => completeSafetyCheck(prev, c.id));
                          }}
                        />
                        {tx(c.label)}
                        {done && <span className="ms-auto text-mint">✓</span>}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* investigation progress */}
      <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-holo/30 bg-space/90 px-4 py-3 backdrop-blur">
        <p className="text-sm sm:text-base" aria-live="polite">
          📝 {tx(t("الأدلة التي وجدتها", "Clues found"))}: <b dir="ltr">{foundHere}/{missionClues.length}</b>
          {foundHere < need && ` — ${tx(t(`اجمع ${need} على الأقل قبل القرار`, `find at least ${need} before deciding`))}`}
          {mission === 3 && !safetyOk && ` · ${tx(t("أكمل خطوات السلامة", "complete the safety steps"))}`}
        </p>
        <Button onClick={onReady} disabled={!ready}>
          {tx(t("إلى غرفة القرار", "To the decision room"))} ▶
        </Button>
      </div>

      {toast && (
        <div className="toast fixed bottom-24 left-1/2 z-50 rounded-full border-2 border-mint bg-space px-5 py-2 font-bold text-mint shadow-[0_0_24px_#43d9a366]" role="status">
          🔎 {tx(t("وجدت دليلًا جديدًا!", "New clue found!"))}
        </div>
      )}
    </main>
  );
}
