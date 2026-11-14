/* eslint-disable @next/next/no-img-element -- static export, small local art */
"use client";
import { useCallback, useEffect, useState } from "react";
import { radioStatic, sfx, startAmbience, startMusic, stopAmbience, stopMusic } from "@/lib/audio";
import {
  CINE_UI,
  EXPLORE,
  RESPONSIBILITIES,
  SCENES,
  SCENE_NAMES,
  SUHAIL_DAY1,
  SUHAIL_WELCOME,
  type ExploreId,
  type SceneId,
} from "@/lib/cinematicScript";
import type { CrewId } from "@/lib/game/types";
import { CREW, UI, t } from "@/lib/i18n";
import { RESOURCES, RESOURCE_ORDER } from "@/lib/mission";
import { OrbitStarLogo } from "../Brand";
import { LunarBase, type FacilityId } from "../LunarBase";
import { Portrait } from "../Portrait";
import { useSettings } from "../settings";
import { Button } from "../ui";
import { CommandCenter, DeepSpace, LunarVista, StarField } from "./Backdrops";
import { DialogueBox } from "./DialogueBox";
import { SceneTransition } from "./SceneTransition";

/** Auto-advancing scenes (ms). The child can always press Continue to move on sooner. */
const AUTO: Partial<Record<SceneId, number>> = { space: 11000, base: 13000, command: 8500 };
const AUTO_REDUCED = 4000;

/** SUHAIL on the main holographic display; re-pulses each time a new line starts. */
function SuhailHolo({ pulse, size = "min(34vh, 60vw)" }: { pulse: number; size?: string }) {
  return (
    <div className="c4-holo flex flex-col items-center" aria-hidden>
      <div
        key={pulse}
        className="speaking relative overflow-hidden rounded-[32px] border-2 border-holo/80 bg-[#0b1a3a]"
        style={{ width: size, height: size }}
      >
        <img src="/art/suhail.png" alt="" className="h-full w-full object-cover opacity-95" />
        <div className="scanlines absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#4fe5ff33] to-transparent" />
      </div>
      <div className="mt-1 h-3 w-2/3 rounded-full bg-holo/50 blur-md" />
    </div>
  );
}

function SceneSpace() {
  const { tx } = useSettings();
  return (
    <SceneTransition sceneKey="space" backdrop={<DeepSpace />}>
      <div className="c1-title flex h-full flex-col items-center justify-center px-4 text-center">
        <div className="relative">
          <div className="orbit-spin absolute -inset-10 rounded-full border-2 border-holo/40 [border-top-color:#ffad4d]" aria-hidden />
          <OrbitStarLogo size={110} />
        </div>
        <h1 className="mt-6 font-display text-5xl font-bold tracking-tight drop-shadow-[0_4px_30px_#4fe5ff88] sm:text-7xl lg:text-8xl">SPACE COMMANDER</h1>
        <p className="mt-3 font-display text-lg font-bold tracking-[0.45em] text-holo sm:text-2xl">OPERATION MOONLIGHT</p>
        <p className="mt-2 text-lg text-lunar/80">{tx(UI.tagline)}</p>
      </div>
    </SceneTransition>
  );
}

function SceneBase() {
  const { tx } = useSettings();
  return (
    <SceneTransition sceneKey="base" backdrop={<LunarVista />} camera="approach">
      <div className="flex h-full items-end px-6 pb-28 sm:px-16">
        <div className="anim-rise" style={{ animationDelay: "2.2s" }}>
          <p className="font-display text-6xl font-bold tracking-tight drop-shadow-[0_4px_24px_#000] sm:text-8xl">SELENE-1</p>
          <p className="mt-1 font-display text-lg font-bold tracking-[0.35em] text-holo drop-shadow-[0_2px_12px_#000] sm:text-2xl">LUNAR RESEARCH OUTPOST</p>
          <p className="mt-2 text-lg text-lunar/90 drop-shadow-[0_2px_10px_#000]">
            {tx(CINE_UI.outpost)} · {tx(CINE_UI.southPole)}
          </p>
        </div>
      </div>
    </SceneTransition>
  );
}

function SceneCommand({ labels }: { labels: string[] }) {
  const { tx, sound } = useSettings();
  useEffect(() => {
    if (!sound) return;
    const ids = [0, 1, 2, 3].map((i) => window.setTimeout(() => sfx("screen"), 1200 + i * 900));
    ids.push(window.setTimeout(() => radioStatic(), 5600));
    return () => ids.forEach(clearTimeout);
  }, [sound]);
  return (
    <SceneTransition sceneKey="command" backdrop={<CommandCenter labels={labels} animateOn />} camera="push">
      <div className="flex h-full flex-col items-center justify-start pt-24">
        <p className="anim-rise font-display text-sm font-bold tracking-[0.35em] text-holo" style={{ animationDelay: "0.6s" }}>
          {tx(t("مركز القيادة · SELENE-1", "COMMAND CENTER · SELENE-1"))}
        </p>
        <div className="mt-[14vh]" style={{ animation: "c4-holo 1.4s ease-out 6s both" }}>
          <SuhailHolo pulse={0} size="min(26vh, 50vw)" />
        </div>
      </div>
    </SceneTransition>
  );
}

function SceneSuhail({ labels, onDone }: { labels: string[]; onDone: () => void }) {
  const { tx } = useSettings();
  const [line, setLine] = useState(0);
  return (
    <SceneTransition sceneKey="suhail" backdrop={<CommandCenter labels={labels} dim />}>
      <div className="flex h-full flex-col items-center justify-between gap-4 overflow-y-auto px-4 pb-6 pt-28 sm:pt-24">
        <SuhailHolo pulse={line} />
        <div className="w-full max-w-3xl">
          <DialogueBox speaker={tx(t("سهيل", "SUHAIL"))} lines={SUHAIL_WELCOME} onLine={setLine} onDone={onDone} doneLabel={tx(CINE_UI.finish)} />
        </div>
      </div>
    </SceneTransition>
  );
}

function SceneCommander({ onNext }: { onNext: () => void }) {
  const { tx } = useSettings();
  return (
    <SceneTransition sceneKey="commander" backdrop={<StarField />}>
      <div className="h-full overflow-y-auto px-4 pb-10 pt-28 sm:pt-24">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <header className="text-center">
            <p className="font-display text-sm font-bold tracking-[0.35em] text-holo">YOUR MISSION BEGINS HERE</p>
            <h1 className="mt-2 font-display text-4xl font-bold sm:text-6xl">{tx(CINE_UI.missionBegins)}</h1>
            <p className="mt-3 text-xl text-lunar/90 sm:text-2xl">{tx(CINE_UI.youAreCommander)}</p>
          </header>
          <section>
            <h2 className="mb-3 font-display text-xl font-bold">{tx(CINE_UI.responsibilities)}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {RESPONSIBILITIES.map((r, i) => (
                <li key={i} className="stagger panel flex items-center gap-3 px-4 py-3 text-lg" style={{ ["--i" as string]: i }}>
                  <span className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-holo/60 text-xl" aria-hidden>
                    {r.icon}
                  </span>
                  {tx(r.text)}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-3 font-display text-xl font-bold">{tx(CINE_UI.resources)}</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {RESOURCE_ORDER.map((id, i) => {
                const r = RESOURCES[id];
                return (
                  <div
                    key={id}
                    className="stagger flex flex-col items-center gap-2 rounded-2xl border-2 bg-midnight/80 p-4 text-center"
                    style={{ ["--i" as string]: i + 6, borderColor: r.color + "aa", boxShadow: `0 0 24px ${r.color}33` }}
                  >
                    <span className="anim-float grid size-16 place-items-center rounded-full border-2 text-3xl" style={{ borderColor: r.color, animationDelay: `${i * 0.4}s` }} aria-hidden>
                      {r.icon}
                    </span>
                    <b className="text-xl" style={{ color: r.color }}>
                      {tx(r.name)}
                    </b>
                    <p className="text-sm leading-relaxed text-lunar/85">{tx(r.explain)}</p>
                  </div>
                );
              })}
            </div>
          </section>
          <section>
            <h2 className="mb-3 font-display text-xl font-bold">{tx(CINE_UI.crew)}</h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(Object.keys(CREW) as CrewId[]).map((id, i) => (
                <li key={id} className="stagger flex items-center gap-3 rounded-2xl border bg-midnight/70 p-3" style={{ ["--i" as string]: i + 10, borderColor: CREW[id].color + "88" }}>
                  <Portrait id={id} size={52} />
                  <span>
                    <b className="block">{tx(CREW[id].name)}</b>
                    <span className="text-xs" style={{ color: CREW[id].color }}>
                      {tx(CREW[id].role)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <div className="flex justify-center">
            <Button size="lg" onClick={onNext} autoFocus className="min-w-[min(100%,320px)]">
              {tx(CINE_UI.next)} ▶
            </Button>
          </div>
        </div>
      </div>
    </SceneTransition>
  );
}

function SceneExplore({ onNext }: { onNext: () => void }) {
  const { tx, beep } = useSettings();
  const [sel, setSel] = useState<ExploreId | null>(null);
  const [seen, setSeen] = useState<Set<ExploreId>>(new Set());
  const pick = (id: FacilityId) => {
    if (!EXPLORE.some((e) => e.id === id)) return;
    const e = id as ExploreId;
    beep("facility");
    setSel(e);
    setSeen((s) => new Set(s).add(e));
  };
  const cur = EXPLORE.find((e) => e.id === sel);
  const done = seen.size === EXPLORE.length;
  const status = {
    energy: sel === "energy" ? "ok" : "dim",
    water: sel === "water" ? "ok" : "dim",
    greenhouse: sel === "greenhouse" ? "ok" : "dim",
    life: sel === "life" ? "ok" : "dim",
    shelter: "dim",
    command: "dim",
  } as const;
  return (
    <SceneTransition sceneKey="explore" backdrop={<StarField />}>
      <div className="h-full overflow-y-auto px-4 pb-10 pt-28 sm:pt-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <header className="text-center">
            <h1 className="font-display text-3xl font-bold sm:text-5xl">{tx(CINE_UI.exploreTitle)}</h1>
            <p className="mt-2 text-lg text-lunar/85">{tx(CINE_UI.exploreHint)}</p>
          </header>
          <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
            <div className="panel !p-2" style={{ borderColor: "#4fe5ff66" }}>
              <LunarBase status={status} onSelect={pick} selected={sel} />
            </div>
            <div className="flex flex-col gap-3">
              <ul className="grid grid-cols-2 gap-2">
                {EXPLORE.map((e) => (
                  <li key={e.id}>
                    <button
                      onClick={() => pick(e.id)}
                      aria-pressed={sel === e.id}
                      className="flex min-h-14 w-full items-center gap-2 rounded-2xl border-2 border-holo/40 px-3 py-2 text-start hover:border-holo aria-pressed:border-solar aria-pressed:bg-solar/10 aria-pressed:shadow-[0_0_20px_#ffad4d55]"
                    >
                      <span className={seen.has(e.id) ? "text-mint" : "text-moon"} aria-hidden>
                        {seen.has(e.id) ? "✓" : "○"}
                      </span>
                      {tx(e.name)}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-start gap-3" aria-live="polite">
                <span className="anim-float inline-block shrink-0 overflow-hidden rounded-full border-[3px] border-holo" style={{ width: 84, height: 84 }} aria-hidden>
                  <img src="/art/suhail.png" alt="" className="h-full w-full scale-125 object-cover object-[50%_25%]" />
                </span>
                <div key={sel ?? "intro"} className="panel anim-rise flex-1 px-4 py-3 text-lg leading-relaxed" style={{ borderColor: "#4fe5ffaa" }}>
                  <span className="mb-1 block font-display text-sm font-bold text-holo">{cur ? tx(cur.name) : tx(t("سهيل", "SUHAIL"))}</span>
                  {cur ? tx(cur.line) : tx(CINE_UI.exploreIntro)}
                </div>
              </div>
              <p className="text-center text-moon">
                {tx(CINE_UI.explored)}: <b dir="ltr">{seen.size}/4</b>
              </p>
              <Button size="lg" onClick={onNext} disabled={!done}>
                {tx(CINE_UI.backToCommand)} ▶
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SceneTransition>
  );
}

function SceneDay1({ labels, onFinish }: { labels: string[]; onFinish: () => void }) {
  const { tx, beep } = useSettings();
  const [line, setLine] = useState(0);
  const [online, setOnline] = useState(false);
  return (
    <SceneTransition sceneKey="day1" backdrop={<CommandCenter labels={labels} dim={!online} />}>
      {!online ? (
        <div className="flex h-full flex-col items-center justify-between gap-4 overflow-y-auto px-4 pb-6 pt-28 sm:pt-24">
          <SuhailHolo pulse={line} />
          <div className="w-full max-w-3xl">
            <DialogueBox
              speaker={tx(t("سهيل", "SUHAIL"))}
              lines={SUHAIL_DAY1}
              onLine={setLine}
              onDone={() => {
                beep("facility");
                setOnline(true);
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-6 bg-space/70 px-4 text-center backdrop-blur-sm">
          <p className="c7-online font-display text-4xl font-bold tracking-[0.2em] sm:text-7xl">{tx(CINE_UI.day1)}</p>
          <p className="c7-online font-display text-2xl font-bold tracking-[0.4em] text-mint sm:text-4xl" style={{ animationDelay: "0.5s" }}>
            ● {tx(CINE_UI.online)}
          </p>
          <ul className="flex flex-wrap justify-center gap-3">
            {RESOURCE_ORDER.map((id, i) => (
              <li key={id} className="stagger flex items-center gap-2 rounded-full border-2 px-4 py-2" style={{ ["--i" as string]: i + 8, borderColor: RESOURCES[id].color }}>
                <span aria-hidden>{RESOURCES[id].icon}</span>
                {tx(RESOURCES[id].name)} <span className="text-mint">✓</span>
              </li>
            ))}
          </ul>
          <Button size="lg" onClick={onFinish} autoFocus className="min-w-[min(100%,340px)]">
            🚀 {tx(CINE_UI.start)}
          </Button>
        </div>
      )}
    </SceneTransition>
  );
}

/**
 * SCENES 01–07 of the cinematic introduction. Skippable at any time; subtitles always on;
 * sound and music optional (original procedural audio).
 */
export function CinematicIntro({ onFinish, onSkip }: { onFinish: () => void; onSkip: () => void }) {
  const { tx, lang, set, sound, music, reducedMotion, beep } = useSettings();
  const [scene, setScene] = useState<SceneId>("space");
  const idx = SCENES.indexOf(scene);
  const labels = RESOURCE_ORDER.map((r) => tx(RESOURCES[r].name));

  const go = useCallback(
    (s: SceneId) => {
      beep("whoosh");
      setScene(s);
    },
    [beep],
  );
  const next = useCallback(() => {
    const n = SCENES[idx + 1];
    if (n) go(n);
  }, [idx, go]);

  // auto-advance the three establishing shots
  useEffect(() => {
    const d = AUTO[scene];
    if (!d) return;
    const id = window.setTimeout(next, reducedMotion ? AUTO_REDUCED : d);
    return () => window.clearTimeout(id);
  }, [scene, next, reducedMotion]);

  // ambience + music
  useEffect(() => {
    if (music) {
      startAmbience();
      startMusic();
    } else {
      stopAmbience();
      stopMusic();
    }
  }, [music]);
  useEffect(
    () => () => {
      stopAmbience();
      stopMusic();
    },
    [],
  );
  useEffect(() => {
    if (scene === "space" && sound) radioStatic();
  }, [scene, sound]);

  // Escape skips; Enter/Space continues on auto scenes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  const pill = "min-h-10 rounded-full border border-holo/40 bg-space/70 px-3 py-1.5 text-sm backdrop-blur hover:bg-holo/15 aria-pressed:border-holo aria-pressed:bg-holo/20";

  return (
    <div className="fixed inset-0 z-50 bg-black text-lunar" role="region" aria-roledescription="cinematic" aria-label="SPACE COMMANDER — Operation Moonlight">
      {scene === "space" && <SceneSpace />}
      {scene === "base" && <SceneBase />}
      {scene === "command" && <SceneCommand labels={labels} />}
      {scene === "suhail" && <SceneSuhail labels={labels} onDone={next} />}
      {scene === "commander" && <SceneCommander onNext={next} />}
      {scene === "explore" && <SceneExplore onNext={next} />}
      {scene === "day1" && <SceneDay1 labels={labels} onFinish={onFinish} />}

      {/* top bar: progress, audio, language, skip */}
      <div className="absolute inset-x-0 top-0 z-30 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-black/80 to-transparent px-3 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <ol className="flex gap-1.5" aria-label={tx(CINE_UI.scene)}>
            {SCENES.map((s, i) => (
              <li
                key={s}
                aria-current={i === idx ? "step" : undefined}
                className={`h-2 rounded-full transition-all ${i === idx ? "w-8 bg-holo" : i < idx ? "w-2 bg-holo/70" : "w-2 bg-moon/30"}`}
              >
                <span className="sr-only">
                  {i + 1}. {tx(SCENE_NAMES[s])}
                </span>
              </li>
            ))}
          </ol>
          <span className="hidden text-sm text-moon sm:inline">{tx(SCENE_NAMES[scene])}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={pill} aria-pressed={sound} aria-label={tx(CINE_UI.sound)} onClick={() => set({ sound: !sound })}>
            {sound ? "🔊" : "🔈"} <span className="hidden sm:inline">{tx(CINE_UI.sound)}</span>
          </button>
          <button className={pill} aria-pressed={music} aria-label={tx(CINE_UI.music)} onClick={() => set({ music: !music })}>
            🎵 <span className="hidden sm:inline">{tx(CINE_UI.music)}</span>
          </button>
          <button className={pill} onClick={() => set({ lang: lang === "ar" ? "en" : "ar" })} lang={lang === "ar" ? "en" : "ar"}>
            🌐 {tx(UI.lang)}
          </button>
          <button className={`${pill} border-solar/60 font-bold`} onClick={onSkip}>
            {tx(CINE_UI.skip)} ⏭
          </button>
        </div>
      </div>

      {/* sound hint on the first scene */}
      {scene === "space" && !sound && !music && (
        <div className="absolute inset-x-0 top-20 z-30 flex justify-center px-4">
          <button className="panel anim-rise px-4 py-2 text-sm hover:bg-holo/10" onClick={() => set({ sound: true, music: true })}>
            {tx(CINE_UI.soundHint)}
          </button>
        </div>
      )}

      {/* continue on the auto-advancing scenes */}
      {AUTO[scene] && (
        <div className="absolute inset-x-0 bottom-6 z-30 flex justify-center">
          <Button variant="ghost" onClick={next} className="bg-space/60 backdrop-blur">
            {tx(CINE_UI.next)} ▶
          </Button>
        </div>
      )}
    </div>
  );
}
