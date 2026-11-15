"use client";
import { useEffect } from "react";
import { BATTERY_CAP_KWH, WATER_CAP_L } from "@/lib/game/config";
import { DECISIONS } from "@/lib/game/decisions";
import { chapterResult, INSPECTION_ORDER, INSPECTIONS, MISSION_INTROS } from "@/lib/game/experience";
import type { Choices, MissionId } from "@/lib/game/types";
import { t } from "@/lib/i18n";
import { FACILITIES, RESOURCE_ORDER, RESOURCES } from "@/lib/mission";
import { LunarBase, facilityStatus } from "../LunarBase";
import { ResourceIndicator } from "../mission/ResourceIndicator";
import { useSettings } from "../settings";
import { SuhailBot } from "../Suhail";
import { Button } from "../ui";
import { useCountUp } from "./CountUp";
import { BaseFrame, CrewReports } from "./Journey";
import { suhailLines } from "@/lib/game/dialogue";

const LEVEL = { ok: "#43d9a3", warn: "#ffad4d", crit: "#ff6b6b" } as const;

function ChapterTile({ id, from, to, i }: { id: (typeof RESOURCE_ORDER)[number]; from: number; to: number; i: number }) {
  const v = useCountUp(from, to, 1400, 500 + i * 150);
  const pct = id === "energy" ? (v / BATTERY_CAP_KWH) * 100 : id === "water" ? (v / WATER_CAP_L) * 100 : v;
  return <ResourceIndicator id={id} value={v} pct={pct} variant="tile" delta={v - from} />;
}

/** Cinematic end-of-chapter debrief: status, decision, resource changes, facilities, crew, and what carries forward. */
export function MissionResult({ mission, choices, onContinue }: { mission: MissionId; choices: Choices; onContinue: () => void }) {
  const { tx, beep } = useSettings();
  const res = chapterResult(choices, mission);
  const s = res.endState;
  const decision = res.decision ? DECISIONS[res.decision.id] : null;
  const option = decision?.options.find((o) => o.id === res.decision?.optionId);
  const tone = res.outlook === "fewer-options" ? "#ffad4d" : "#43d9a3";
  const nextTitle = mission < 3 ? MISSION_INTROS[(mission + 1) as MissionId].title : null;

  useEffect(() => {
    beep("ok");
  }, [beep]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-5 text-center">
        <p className="c7-online font-display text-sm font-bold tracking-[0.3em] text-holo">{tx(MISSION_INTROS[mission].kicker)}</p>
        <h1 className="c7-online mt-1 font-display text-4xl font-bold sm:text-6xl" style={{ animationDelay: "0.3s" }}>
          {tx(t("انتهت المهمة", "MISSION COMPLETE"))}
        </h1>
        <p className="c7-online mt-2 text-xl text-lunar/90" style={{ animationDelay: "0.5s" }}>
          {tx(MISSION_INTROS[mission].title)}
        </p>
        <p
          className="c7-online mx-auto mt-4 inline-flex items-center gap-2 rounded-full border-2 px-5 py-2 text-lg font-bold"
          style={{ borderColor: tone, color: tone, animationDelay: "0.8s" }}
        >
          {res.outlook === "fewer-options" ? "⚠️" : "✓"}{" "}
          {res.outlook === "final"
            ? tx(t("الطاقم آمن — المهمات الثلاث اكتملت", "Crew safe — all three missions complete"))
            : res.outlook === "fewer-options"
              ? tx(t("المهمة القادمة ستكون أصعب", "The next mission will be harder"))
              : tx(t("المهمة القادمة: كل الخيارات متاحة", "Next mission: every option available"))}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,440px)_1fr]">
        <div className="flex flex-col gap-3">
          <BaseFrame state={s}>
            <LunarBase status={facilityStatus(s)} storm={s.flags.storm} energyPct={(s.resources.energy / BATTERY_CAP_KWH) * 100} />
          </BaseFrame>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {INSPECTION_ORDER.map((id) => {
              const c = INSPECTIONS[id].condition(s);
              return (
                <li key={id} className="flex items-center gap-2 rounded-xl border border-holo/20 bg-space/60 px-3 py-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: LEVEL[c.level] }} aria-hidden />
                  <span className="truncate">
                    <b>{tx(FACILITIES[id].name)}</b> · {tx(c.text)}
                  </span>
                </li>
              );
            })}
            <li className="col-span-2 flex items-center gap-2 rounded-xl border border-mint/50 bg-mint/10 px-3 py-2">
              🛡️ {tx(t("سلامة الطاقم", "Crew safety"))}:{" "}
              <b>
                {tx(
                  s.crewSafety === "sheltered"
                    ? t("في المأوى ومحمي", "Sheltered and protected")
                    : s.crewSafety === "strained"
                      ? t("محمي — دعم الحياة كان تحت ضغط", "Protected — life support was strained")
                      : t("آمن", "Safe"),
                )}
              </b>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-4">
          {option && (
            <section className="panel p-4">
              <p className="font-display text-sm font-bold tracking-wider text-holo">🧭 {tx(t("قرارك في هذه المهمة", "Your decision in this mission"))}</p>
              <p className="mt-1 text-xl font-bold">{tx(option.label)}</p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-lunar/90">
                {option.consequences.map((c, i) => (
                  <li key={i}>• {tx(c)}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="panel p-4">
            <p className="mb-3 font-display text-sm font-bold tracking-wider text-holo">📊 {tx(t("الموارد من بداية المهمة إلى نهايتها", "Resources from start to end of the mission"))}</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {RESOURCE_ORDER.map((r, i) => (
                <ChapterTile key={r} id={r} i={i} from={res.start[r]} to={res.end[r]} />
              ))}
            </div>
            <p className="mt-2 text-xs text-moon">
              {RESOURCE_ORDER.map((r) => `${RESOURCES[r].icon} ${Math.round(res.start[r])} → ${Math.round(res.end[r])} ${RESOURCES[r].unit}`).join("  ·  ")}
            </p>
          </section>

          {nextTitle && (
            <section className="panel p-4" style={{ borderColor: tone + "aa" }}>
              <p className="font-display text-sm font-bold tracking-wider" style={{ color: tone }}>
                ⏭ {tx(t("ما ينتقل معك إلى", "Carried into"))} {tx(nextTitle)}
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {res.next.map((n) => (
                  <li key={n.optionId} className={`rounded-xl px-3 py-2 ${n.locked ? "bg-coral/10 text-coral" : "bg-mint/10"}`}>
                    {n.locked ? "🔒" : "✓"} <b>{tx(n.label)}</b>
                    {n.locked && <span className="block text-sm">{tx(n.locked)}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <CrewReports state={s} title={t("الطاقم يرفع تقاريره", "The crew reports in")} />

          <div className="flex items-start gap-3">
            <SuhailBot mood={res.outlook === "fewer-options" ? "thinking" : "happy"} size={84} />
            <p className="panel flex-1 px-4 py-3 text-lg leading-relaxed" style={{ borderColor: "#4fe5ffaa" }}>
              <b className="text-holo">{tx(t("سهيل:", "SUHAIL:"))}</b> {tx(res.closing)}
              {suhailLines(s, "chapter-end", 1).map((l) => (
                <span key={l.id} className="mt-2 block text-base text-lunar/90">
                  {tx(l.text)}
                </span>
              ))}
            </p>
          </div>

          <Button size="lg" onClick={onContinue} autoFocus className="self-center">
            {mission < 3 ? tx(t("إلى المهمة التالية", "To the next mission")) : tx(t("النتيجة النهائية", "Final outcome"))} ▶
          </Button>
        </div>
      </div>
    </main>
  );
}
