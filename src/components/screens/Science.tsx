"use client";
import { useMemo, useState } from "react";
import { BATTERY_CAP_KWH, LOADS, MISSION_CALENDAR, SOLAR_RATED_KW, START } from "@/lib/game/config";
import { calculateSolarEnergy } from "@/lib/nasa/energyModel";
import { ILLUMINATION } from "@/lib/nasa/illumination";
import { NASA_DATA, type DailyLight } from "@/lib/nasa/NASADataAdapter";
import { UI, t } from "@/lib/i18n";
import type { T } from "@/lib/game/types";
import { useSettings } from "../settings";
import { Button, Panel, ScreenTitle } from "../ui";

/** Daily energy the base needs for normal operations (game assumption, from config). */
const NORMAL_LOAD = LOADS.lifeSupport + LOADS.recycler + LOADS.greenhouse.full + LOADS.research;
const kwh = (f: number) =>
  calculateSolarEnergy(f, 24, { ratedPowerKW: SOLAR_RATED_KW, performanceFactor: START.performanceFactor }).energyKWh;
const pct = (f: number) => `${Math.round(f * 100)}%`;

type ScenarioId = "mission" | "brightest" | "darkest";

export function ScienceScreen({ onBack }: { onBack: () => void }) {
  const { tx } = useSettings();
  const ds = NASA_DATA.dataset;
  const [scenario, setScenario] = useState<ScenarioId>("mission");

  const scenarios = useMemo(() => {
    const x = NASA_DATA.extremeWeeks();
    const list: { id: ScenarioId; label: T; start: string }[] = [
      { id: "mission", label: t("أسبوع مهمتك", "Your mission week"), start: MISSION_CALENDAR.startDate },
    ];
    if (x) {
      list.push({ id: "brightest", label: t("أكثر أسبوع إضاءة في 2026", "Brightest week of 2026"), start: x.brightest.start });
      list.push({ id: "darkest", label: t("أظلم أسبوع في 2026", "Darkest week of 2026"), start: x.darkest.start });
    }
    return list;
  }, []);
  const active = scenarios.find((s) => s.id === scenario) ?? scenarios[0];
  const week = NASA_DATA.window(active.start, 7);
  const weekKWh = week.reduce((a, d) => a + kwh(d.sunlitFraction), 0);
  const deficitDays = week.filter((d) => kwh(d.sunlitFraction) < NORMAL_LOAD).length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <ScreenTitle kicker="ABOUT THE SCIENCE" title={tx(UI.science)} />
      <div className="flex flex-col gap-4">
        {/* 1 — what the data is */}
        <Panel style={{ borderColor: "#ffad4d88" }}>
          <h2 className="mb-2 font-display text-xl font-bold text-solar">
            🛰 {tx(t("ضوء الشمس الحقيقي يشغّل قاعدتك", "Real NASA sunlight powers your base"))}
          </h2>
          <p className="leading-relaxed">
            {tx(
              t(
                "قرب القطب الجنوبي للقمر تبقى الشمس منخفضة جدًا عند الأفق، فتتحرك ظلال الجبال والفوهات طوال الوقت. صمّم علماء ناسا محاكاة تُظهر الضوء والظل كل ساعتين لسنوات قادمة، باستخدام خريطة تضاريس القمر من مقياس الارتفاع الليزري LOLA على مركبة LRO وموقع الشمس الدقيق. قسنا من هذه المحاكاة: كم ساعة كان موقع قاعدتنا مضاءً في كل يوم من 2026.",
                "Near the Moon's south pole the Sun stays very low on the horizon, so the shadows of mountains and craters keep moving. NASA scientists built a simulation that shows light and shadow every two hours for years ahead, using the Moon's terrain map from the LOLA laser altimeter on the Lunar Reconnaissance Orbiter and the exact position of the Sun. From that simulation we measured how much of each day of 2026 our base site is in sunlight.",
              ),
            )}
          </p>
          {ds ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat value={pct(ds.validation.annualSunlitFraction)} label={tx(t("موقعنا مضاء خلال 2026 (ناسا SVS)", "Our site sunlit during 2026 (NASA SVS)"))} color="#ffad4d" />
              <Stat value={pct(ILLUMINATION.fraction)} label={tx(t("المتوسط على 18.6 سنة (ناسا LOLA)", "18.6-year average (NASA LOLA)"))} color="#50e3f0" />
              <Stat value={`${ds.validation.longestShadowHours} h`} label={tx(t("أطول فترة ظل في 2026", "Longest shadow in 2026"))} color="#8c78ff" />
            </div>
          ) : (
            <p className="mt-3 rounded-xl bg-coral/15 p-3 text-sm" role="status">
              ⚠ {tx(t("تعذّر تحميل بيانات ناسا اليومية، لذلك تستخدم اللعبة متوسط ناسا الطويل لكل الأيام.", "NASA's daily data could not be loaded, so the game uses NASA's long-term average for every day."))}{" "}
              <span dir="ltr" className="text-moon">({NASA_DATA.loadError})</span>
            </p>
          )}
          {ds && (
            <YearStrip days={ds.daily.sunlitFraction} highlight={active.start} start={ds.daily.start} label={tx(t("كل يوم من 2026: ارتفاع العمود = نسبة الضوء", "Every day of 2026: bar height = share of the day in sunlight"))} />
          )}
        </Panel>

        {/* 2 — scenario: how the chosen week changes the energy */}
        <Panel>
          <h2 className="mb-2 font-display text-xl font-bold">
            🔆 {tx(t("كيف يغيّر الأسبوع المختار الطاقة المتاحة؟", "How does the chosen week change the energy?"))}
          </h2>
          <div className="mb-3 flex flex-wrap gap-2" role="radiogroup" aria-label={tx(t("اختر سيناريو الإضاءة", "Choose a lighting scenario"))}>
            {scenarios.map((s) => (
              <button
                key={s.id}
                role="radio"
                aria-checked={s.id === active.id}
                onClick={() => setScenario(s.id)}
                className={`min-h-11 rounded-full border px-4 text-sm ${s.id === active.id ? "border-solar bg-solar/20 font-bold" : "border-holo/30 hover:border-holo"}`}
              >
                {tx(s.label)} · <span dir="ltr" className="text-moon">{s.start}</span>
              </button>
            ))}
          </div>
          <WeekBars week={week} />
          <p className="mt-3 leading-relaxed">
            {tx(
              t(
                `في هذا الأسبوع تنتج الألواح ${Math.round(weekKWh)} ك.و.س. القاعدة تحتاج حوالي ${NORMAL_LOAD} ك.و.س كل يوم للتشغيل الكامل، فيكون الإنتاج أقل من الحاجة في ${deficitDays} من 7 أيام — وفي هذه الأيام يجب أن تأتي الطاقة من البطارية (${BATTERY_CAP_KWH} ك.و.س) أو من تقليل الأحمال. كلما قلّ الضوء، قلّ ما يمكنك تشغيله.`,
                `In this week the panels make ${Math.round(weekKWh)} kWh. The base needs about ${NORMAL_LOAD} kWh a day for full operations, so output is below the need on ${deficitDays} of 7 days — on those days the energy must come from the battery (${BATTERY_CAP_KWH} kWh) or from switching loads off. Less light means less you can run.`,
              ),
            )}
          </p>
          {active.id === "mission" && (
            <p className="mt-2 text-sm text-moon">
              {tx(
                t(
                  `لماذا هذا الأسبوع؟ ${MISSION_CALENDAR.reason.ar}`,
                  `Why this week? ${MISSION_CALENDAR.reason.en}`,
                ),
              )}
            </p>
          )}
        </Panel>

        {/* 3 — the model, with sources separated from assumptions */}
        <Panel>
          <h2 className="mb-2 font-display text-xl font-bold">⚙️ {tx(t("كيف يتحول الضوء إلى طاقة في اللعبة", "How light becomes power in the game"))}</h2>
          <p className="mb-3 rounded-xl bg-space/70 p-3 font-display text-lg" dir="ltr">
            Energy (kWh/day) = <span className="text-moon">{SOLAR_RATED_KW} kW</span> × 24 h × <span className="text-solar">sunlit fraction</span> ×{" "}
            <span className="text-moon">{START.performanceFactor}</span>
          </p>
          <p className="mb-3 text-sm" dir="ltr">
            e.g. {pct(week[0].sunlitFraction)} → {SOLAR_RATED_KW} × 24 × {week[0].sunlitFraction.toFixed(3)} × {START.performanceFactor} ={" "}
            <b className="text-solar">{kwh(week[0].sunlitFraction).toFixed(1)} kWh</b>
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            <li className="rounded-xl border border-solar/40 p-2">
              🟠 <b>{tx(t("من ناسا (قيمة مستخرجة من المصدر)", "From NASA (source-derived)"))}:</b>{" "}
              {tx(t("نسبة الضوء في كل يوم بموقع القاعدة (NASA SVS 4930)، والمتوسط الطويل للمقارنة وللأيام الناقصة (NASA LOLA).", "the sunlit fraction of each day at the base site (NASA SVS 4930), and the long-term average for comparison and for any missing day (NASA LOLA)."))}
            </li>
            <li className="rounded-xl border border-holo/30 p-2">
              ⚪ <b>{tx(t("افتراضات اللعبة", "Game assumptions"))}:</b>{" "}
              {tx(
                t(
                  `قدرة الألواح ${SOLAR_RATED_KW} كيلوواط عندما تكون الشمس ظاهرة، كفاءة النظام ${START.performanceFactor}، البطارية ${BATTERY_CAP_KWH} ك.و.س، دعم الحياة ${LOADS.lifeSupport} ك.و.س/يوم، ربط أيام المهمة بتواريخ 2026.`,
                  `panel output ${SOLAR_RATED_KW} kW whenever the Sun is visible, system performance ${START.performanceFactor}, battery ${BATTERY_CAP_KWH} kWh, life support ${LOADS.lifeSupport} kWh/day, mapping mission days to 2026 dates.`,
                ),
              )}
            </li>
            <li className="rounded-xl border border-violet/40 p-2">
              🟣 <b>{tx(t("قصة اللعبة", "Game story"))}:</b>{" "}
              {tx(t("القاعدة SELENE-1 والطاقم والأعطال والطقس الفضائي خيالية.", "SELENE-1, the crew, the faults and the space weather are fictional."))}
            </li>
          </ul>
        </Panel>

        {/* 4 — simplifications and checks */}
        <Panel>
          <h2 className="mb-2 font-display text-xl font-bold">🔎 {tx(t("ما المبسّط؟ وكيف تحققنا؟", "What is simplified, and how did we check?"))}</h2>
          <ul className="flex list-disc flex-col gap-1 ps-5 text-sm">
            <li>{tx(t("ناسا لم تنشر جدول أرقام لهذه المحاكاة؛ قسنا الضوء والظل من صورها (لقطة كل ساعتين) ببرنامج يمكن إعادة تشغيله.", "NASA did not publish a table of numbers for this simulation; we measured light and shadow from its images (one every two hours) with a script anyone can re-run."))}</li>
            <li>{tx(t("كل لقطة تُحسب «مضاءة» أو «مظلمة» فقط؛ الشمس نصف الظاهرة لا تُحسب بدقة.", "Each snapshot counts as just “lit” or “dark”; a half-visible Sun is not measured precisely."))}</li>
            <li>{tx(t("هذه محاكاة مبنية على تضاريس حقيقية وحركة الشمس، وليست صورًا التقطتها كاميرا.", "This is a simulation built from real terrain and the Sun's motion, not photos taken by a camera."))}</li>
            <li>{tx(t("الضوء ليس كهرباء: حجم الألواح وكفاءتها افتراضات للتعلم.", "Light is not electricity: panel size and efficiency are assumptions for learning."))}</li>
            {ds && (
              <li>
                {tx(
                  t(
                    `للتحقق: أرضية فوهة شاكلتون (ظل دائم) قيست مضاءة ${pct(ds.validation.controlShackletonFloorSunlitFraction)} من الوقت كما هو متوقع، ونسبة 2026 في موقعنا (${pct(ds.validation.annualSunlitFraction)}) قريبة من متوسط LOLA الطويل (${pct(ILLUMINATION.fraction)}).`,
                    `Checks: the floor of Shackleton crater (permanent shadow) measured ${pct(ds.validation.controlShackletonFloorSunlitFraction)} lit, as expected, and our site's 2026 value (${pct(ds.validation.annualSunlitFraction)}) is close to the long-term LOLA average (${pct(ILLUMINATION.fraction)}).`,
                  ),
                )}
              </li>
            )}
          </ul>
        </Panel>

        {/* 5 — references */}
        <Panel>
          <h2 className="mb-2 font-display text-xl font-bold">📚 {tx(t("المصادر", "Sources"))}</h2>
          <dl className="grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4" dir="ltr">
            {ds && (
              <>
                <dt className="text-moon">Daily light</dt>
                <dd>
                  <a className="text-holo underline" href={ds.source.url} target="_blank" rel="noreferrer">
                    NASA SVS {ds.source.id.replace("SVS-", "")} — {ds.source.title}
                  </a>{" "}
                  · {ds.source.credits} · Data: {ds.source.dataUsed.join("; ")} · Accessed {ds.source.accessDate}
                </dd>
                <dt className="text-moon">Reviewed</dt>
                <dd>
                  <a className="text-holo underline" href={ds.source.relatedProduct.url} target="_blank" rel="noreferrer">
                    NASA SVS 5027 — {ds.source.relatedProduct.title}
                  </a>{" "}
                  · {ds.source.relatedProduct.whyNotSampled}
                </dd>
                <dt className="text-moon">Site</dt>
                <dd>
                  {ds.site.lat.toFixed(4)}°, {ds.site.lon.toFixed(3)}°E · {ds.method.frames} frames, every {ds.method.timeStepHours} h, {ds.method.firstFrameUtc} → {ds.method.lastFrameUtc}
                </dd>
              </>
            )}
            <dt className="text-moon">Long-term</dt>
            <dd>
              <a className="text-holo underline" href={ILLUMINATION.provenance.url} target="_blank" rel="noreferrer">
                {ILLUMINATION.provenance.id}
              </a>{" "}
              · {ILLUMINATION.provenance.citation}
            </dd>
            <dt className="text-moon">Method</dt>
            <dd>scripts/extract_svs_illumination.py, scripts/build_svs_dataset.py · docs/nasa-data-sources.md</dd>
          </dl>
        </Panel>
        <Button onClick={onBack} className="self-start">
          ← {tx(UI.back)}
        </Button>
      </div>
    </main>
  );
}

function WeekBars({ week }: { week: DailyLight[] }) {
  const { tx } = useSettings();
  return (
    <div className="flex gap-1" dir="ltr" role="img" aria-label={week.map((d) => `${d.date}: ${pct(d.sunlitFraction)} sunlit, ${Math.round(kwh(d.sunlitFraction))} kWh`).join("; ")}>
      {week.map((d, i) => {
        const e = kwh(d.sunlitFraction);
        const short = e < NORMAL_LOAD;
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <span className={`text-xs font-bold ${short ? "text-coral" : "text-solar"}`}>{Math.round(e)}</span>
            <div className="relative flex h-24 w-full items-end rounded bg-space/70">
              <div className="absolute inset-x-0 border-t border-dashed border-lunar/50" style={{ bottom: `${(NORMAL_LOAD / kwh(1)) * 100}%` }} aria-hidden />
              <div className={`w-full rounded ${short ? "bg-coral/70" : "bg-solar/80"}`} style={{ height: `${d.sunlitFraction * 100}%` }} />
            </div>
            <span className="text-xs">{pct(d.sunlitFraction)}</span>
            <span className="flex flex-col items-center text-xs leading-tight text-moon" dir="ltr">
              <span className="font-bold">
                {tx(t("يوم", "Day"))} {i + 1}
              </span>
              <span>
                {d.date.slice(5)}
                {d.source !== "nasa-svs-4930" && " *"}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function YearStrip({ days, start, highlight, label }: { days: (number | null)[]; start: string; highlight: string; label: string }) {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const hi = Math.round((Date.parse(`${highlight}T00:00:00Z`) - startMs) / 86_400_000);
  return (
    <figure className="mt-4">
      <svg viewBox={`0 0 ${days.length} 40`} preserveAspectRatio="none" className="h-16 w-full rounded bg-space/70" role="img" aria-label={label}>
        <rect x={hi} y={0} width={7} height={40} fill="#ffad4d33" />
        {days.map((v, i) => (v === null ? null : <rect key={i} x={i} y={40 - v * 40} width={1} height={v * 40} fill={i >= hi && i < hi + 7 ? "#ffad4d" : "#50e3f0aa"} />))}
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-moon" dir="ltr">
        <span>Jan 2026</span>
        <span className="px-2 text-center">{label}</span>
        <span>Dec 2026</span>
      </figcaption>
    </figure>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="rounded-xl bg-space/70 p-3 text-center">
      <div className="font-display text-3xl font-bold" style={{ color }} dir="ltr">
        {value}
      </div>
      <div className="text-xs text-moon">{label}</div>
    </div>
  );
}
