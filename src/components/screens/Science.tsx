"use client";
import { BATTERY_CAP_KWH, LOADS, SCENARIO_LIGHT_FACTOR, SOLAR_RATED_KW, START } from "@/lib/game/config";
import { calculateSolarEnergy } from "@/lib/nasa/energyModel";
import { ILLUMINATION } from "@/lib/nasa/illumination";
import { UI, t } from "@/lib/i18n";
import { useSettings } from "../settings";
import { Button, Panel, ScreenTitle } from "../ui";

export function ScienceScreen({ onBack }: { onBack: () => void }) {
  const { tx } = useSettings();
  const I = ILLUMINATION;
  const sample = calculateSolarEnergy(I.fraction, 24, { ratedPowerKW: SOLAR_RATED_KW, performanceFactor: START.performanceFactor });
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <ScreenTitle kicker="ABOUT THE SCIENCE" title={tx(UI.science)} />
      <div className="flex flex-col gap-4">
        <Panel style={{ borderColor: "#ffad4d88" }}>
          <h2 className="mb-2 font-display text-xl font-bold text-solar">🛰 {tx(t("بيانات ناسا التي تشغّل اللعبة", "The NASA data that powers the game"))}</h2>
          <p className="leading-relaxed">
            {tx(
              t(
                "استخدمنا خريطة متوسط إضاءة الشمس للقطب الجنوبي للقمر، المحسوبة من تضاريس مقياس الارتفاع الليزري LOLA على مركبة LRO التابعة لناسا. كل بكسل (60 متر) يخبرنا بنسبة الوقت الذي يرى فيه قرص الشمس، كمتوسط على 18.6 سنة.",
                "We use the average solar illumination map of the Moon's south pole, computed from topography measured by the LOLA laser altimeter on NASA's Lunar Reconnaissance Orbiter. Each 60 m pixel tells us the fraction of time the Sun's disc is visible, averaged over 18.6 years.",
              ),
            )}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat value={`${(I.fraction * 100).toFixed(2)}%`} label={tx(t("موقع SELENE-1 (أفضل بكسل مضاء قرب شاكلتون)", "SELENE-1 site (best-lit pixel near Shackleton)"))} color="#ffad4d" />
            <Stat value={`${(I.context.meanFractionNearby * 100).toFixed(0)}%`} label={tx(t("متوسط الإضاءة ضمن 20 كم", "Average light within 20 km"))} color="#50e3f0" />
            <Stat value={`${(I.context.permanentShadowShare * 100).toFixed(0)}%`} label={tx(t("من المنطقة في ظل دائم (0%)", "of the area is in permanent shadow (0%)"))} color="#8c78ff" />
          </div>
          <dl className="mt-4 grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4" dir="ltr">
            <dt className="text-moon">Product</dt>
            <dd>{I.provenance.id} — {I.provenance.title}</dd>
            <dt className="text-moon">Site</dt>
            <dd>{I.lat.toFixed(4)}°, {I.lon.toFixed(3)}°E (polar stereographic, R = 1737.4 km)</dd>
            <dt className="text-moon">Meaning</dt>
            <dd>{I.temporalMeaning}</dd>
            <dt className="text-moon">Source</dt>
            <dd>
              <a className="text-holo underline" href={I.provenance.url} target="_blank" rel="noreferrer">
                {I.provenance.organization}
              </a>
            </dd>
            <dt className="text-moon">Citation</dt>
            <dd>{I.provenance.citation}</dd>
            <dt className="text-moon">Accessed</dt>
            <dd>{I.provenance.accessDate}</dd>
            <dt className="text-moon">See also</dt>
            <dd>
              <a className="text-holo underline" href="https://svs.gsfc.nasa.gov/5027/" target="_blank" rel="noreferrer">
                NASA SVS 5027 — Illumination at the Moon&apos;s South Pole, 2025–2028
              </a>
            </dd>
          </dl>
        </Panel>

        <Panel>
          <h2 className="mb-2 font-display text-xl font-bold">⚙️ {tx(t("كيف تتحول البيانات إلى طاقة في اللعبة", "How the data becomes power in the game"))}</h2>
          <p className="mb-3 rounded-xl bg-space/70 p-3 font-display text-lg" dir="ltr">
            Energy (kWh) = {SOLAR_RATED_KW} kW × 24 h × <span className="text-solar">{I.fraction.toFixed(4)}</span> × {START.performanceFactor} ={" "}
            <b className="text-solar">{sample.energyKWh.toFixed(1)} kWh/day</b>
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            <li>
              🟠 <b>{tx(t("من ناسا", "From NASA"))}:</b> {tx(t("نسبة الإضاءة", "the illumination fraction"))} ({I.fraction.toFixed(4)})
            </li>
            <li>
              ⚪ <b>{tx(t("افتراضات اللعبة", "Game assumptions"))}:</b>{" "}
              {tx(
                t(
                  `قدرة الألواح ${SOLAR_RATED_KW} كيلوواط، كفاءة النظام ${START.performanceFactor}، سعة البطارية ${BATTERY_CAP_KWH} ك.و.س، دعم الحياة ${LOADS.lifeSupport} ك.و.س/يوم، وغيرها.`,
                  `panel size ${SOLAR_RATED_KW} kW, system performance ${START.performanceFactor}, battery ${BATTERY_CAP_KWH} kWh, life support ${LOADS.lifeSupport} kWh/day, and others.`,
                ),
              )}
            </li>
            <li>
              🟣 <b>{tx(t("قصة اللعبة", "Game story"))}:</b>{" "}
              {tx(
                t(
                  "منحنى «الشمس التي تختفي» اليومي خيالي ويُضرب في رقم ناسا. ناسا لا تقدّم توقعًا يوميًا لهذه الأيام.",
                  "The daily “vanishing sun” curve is fictional and multiplies the NASA value. NASA does not give a day-by-day forecast for these days.",
                ),
              )}
            </li>
          </ul>
          <div className="mt-3 flex gap-1" dir="ltr" aria-label="Scenario light factor per day (fictional)">
            {Object.entries(SCENARIO_LIGHT_FACTOR).map(([d, f]) => (
              <div key={d} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-20 w-full items-end rounded bg-space/70">
                  <div className="w-full rounded bg-violet/70" style={{ height: `${f * 100}%` }} />
                </div>
                <span className="text-xs text-moon">D{d} · {Math.round(I.fraction * f * 100)}%</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="mb-2 font-display text-xl font-bold">🔎 {tx(t("ما المبسّط في اللعبة؟", "What is simplified?"))}</h2>
          <ul className="flex list-disc flex-col gap-1 ps-5 text-sm">
            <li>{tx(t("القاعدة SELENE-1 والطاقم والأحداث خيالية.", "SELENE-1, the crew and the events are fictional."))}</li>
            <li>{tx(t("نسبة الإضاءة ليست كهرباء؛ نحوّلها بمعادلة مبسّطة.", "Illumination fraction is not electricity; we convert it with a simple formula."))}</li>
            <li>{tx(t("الطقس الفضائي في اللعبة سيناريو تدريبي، وليس تنبؤًا حقيقيًا.", "The space weather event is a training scenario, not a real forecast."))}</li>
            <li>{tx(t("أرقام الماء والأكسجين والمحاصيل تقريبية لأغراض تعليمية.", "Water, oxygen and crop numbers are approximate, for learning."))}</li>
          </ul>
        </Panel>
        <Button onClick={onBack} className="self-start">
          ← {tx(UI.back)}
        </Button>
      </div>
    </main>
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
