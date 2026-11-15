"use client";
// PHASE 1 — CINEMATIC OPENING (Operation Moonlight · Cosmic Discovery)
// Six scenes, ~60–90 s: deep space → approaching the Moon → the mission alert → SUHAIL → the crew → the commander moment.
// Skippable at any time (button or Esc), subtitles always on, Reduce Motion shows still frames,
// and no sound plays until the child has interacted with the page.
import { useCallback, useEffect, useState } from "react";
import { radioStatic, sfx, startAmbience, startMusic, stopAmbience, stopMusic } from "@/lib/audio";
import {
  ALERT,
  CINE_UI,
  COMMANDER_LINES,
  CREW_INTRO,
  CREW_SPOTLIGHT_MS,
  READY_QUESTION,
  SCENES,
  SCENE_AUTO_MS,
  SCENE_AUTO_REDUCED_MS,
  SCENE_NAMES,
  STORY,
  SUHAIL_WELCOME,
  type SceneId,
} from "@/lib/cinematicScript";
import { CREW, UI, t } from "@/lib/i18n";
import { FACILITIES } from "@/lib/mission";
import { OrbitStarLogo } from "../Brand";
import { LunarBase } from "../LunarBase";
import { Portrait } from "../Portrait";
import { SuhailRobot, type SuhailExpression } from "../SuhailRobot";
import { useSettings } from "../settings";
import { Button, Modal } from "../ui";
import { DeepSpace, Dust, LunarVista, StarField } from "./Backdrops";
import { DialogueBox } from "./DialogueBox";
import { SceneTransition } from "./SceneTransition";

/** SUHAIL glides in and floats; his expression follows the line he is saying (Phase 2). */
const WELCOME_FACES: SuhailExpression[] = ["happy", "explaining", "curious"];
const COMMANDER_FACES: SuhailExpression[] = ["explaining", "encouraging"];

function SuhailFloating({ expression, size = "min(30vh, 52vw)" }: { expression: SuhailExpression; size?: string }) {
  return (
    <div className="suhail-arrive flex flex-col items-center" aria-hidden>
      <SuhailRobot key={expression} expression={expression} size={size} />
    </div>
  );
}

/* ---------------- SCENE 1 — DEEP SPACE ---------------- */
function SceneSpace() {
  return (
    <SceneTransition sceneKey="space" backdrop={<DeepSpace />}>
      <div className="c1-title flex h-full flex-col items-center justify-center px-4 text-center">
        <div className="relative">
          <div className="orbit-spin absolute -inset-10 rounded-full border-2 border-holo/40 [border-top-color:#ffad4d]" aria-hidden />
          <OrbitStarLogo size={110} />
        </div>
        <h1 className="mt-6 font-display text-5xl font-bold tracking-tight drop-shadow-[0_4px_30px_#4fe5ff88] sm:text-7xl lg:text-8xl" dir="ltr">
          SPACE COMMANDER
        </h1>
        {/* QA: kept right under the title (over the Moon it was hard to read) */}
        <p className="c1-sub mt-3 font-display text-lg font-bold tracking-[0.45em] text-holo drop-shadow-[0_2px_10px_#000] sm:text-2xl" dir="ltr">
          OPERATION MOONLIGHT
        </p>
      </div>
    </SceneTransition>
  );
}

/* ---------------- SCENE 2 — APPROACHING THE MOON ---------------- */
function SceneApproach() {
  const { tx } = useSettings();
  return (
    <SceneTransition sceneKey="approach" backdrop={<LunarVista />} camera="approach">
      <Dust />
      <div className="flex h-full items-end px-6 pb-28 sm:px-16">
        <div className="anim-rise" style={{ animationDelay: "3s" }}>
          <p className="font-display text-6xl font-bold tracking-tight drop-shadow-[0_4px_24px_#000] sm:text-8xl" dir="ltr">
            SELENE-1
          </p>
          <p className="mt-1 font-display text-lg font-bold tracking-[0.3em] text-holo drop-shadow-[0_2px_12px_#000] sm:text-2xl">{tx(CINE_UI.outpost)}</p>
          <p className="mt-2 text-lg text-lunar/90 drop-shadow-[0_2px_10px_#000]">{tx(CINE_UI.southPole)}</p>
        </div>
      </div>
    </SceneTransition>
  );
}

/* ---------------- SCENE 3 — THE MISSION ALERT ---------------- */
function SceneAlert({ audio }: { audio: boolean }) {
  const { tx } = useSettings();
  useEffect(() => {
    if (!audio) return;
    radioStatic();
    const ids = [window.setTimeout(() => sfx("alert"), 900), window.setTimeout(() => sfx("screen"), 2000)];
    return () => ids.forEach(clearTimeout);
  }, [audio]);
  return (
    <SceneTransition sceneKey="alert" backdrop={<LunarVista />} camera="push">
      <div className="alert-sweep pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#ff6b6b55,transparent_60%)]" aria-hidden />
      <div className="relative flex h-full flex-col items-center justify-center px-4 pt-16">
        <div className="relative mb-4 grid size-16 place-items-center" aria-hidden>
          <span className="ring-out absolute inset-0 rounded-full border-2 border-coral" />
          <span className="ring-out absolute inset-0 rounded-full border-2 border-coral" style={{ animationDelay: "1.1s" }} />
          <span className="text-3xl">📡</span>
        </div>
        <section
          className="holo-in panel relative w-full max-w-2xl overflow-hidden p-5 text-center sm:p-7"
          style={{ animationDelay: "1.6s", borderColor: "#50e3f0aa", boxShadow: "0 0 50px #50e3f033" }}
          role="status"
          aria-live="polite"
        >
          <div className="scanlines pointer-events-none absolute inset-0" aria-hidden />
          <p className="font-display text-xs font-bold tracking-[0.35em] text-coral">● {tx(ALERT.title)}</p>
          <p className="mt-1 font-display text-sm tracking-[0.25em] text-holo">{tx(ALERT.from)}</p>
          <div className="mt-4 flex flex-col gap-2 text-xl leading-relaxed sm:text-2xl">
            {ALERT.lines.map((l, i) => (
              <p key={i} className={`line-in ${i === 2 ? "font-display text-lg font-bold tracking-wider text-solar sm:text-xl" : ""}`} style={{ animationDelay: `${2.6 + i * 1.3}s` }}>
                {tx(l)}
              </p>
            ))}
          </div>
          <p className="line-in mt-4 text-xl font-bold text-lunar sm:text-2xl" style={{ animationDelay: "6.6s" }}>
            {tx(ALERT.question)}
          </p>
        </section>
      </div>
    </SceneTransition>
  );
}

/* ---------------- SCENE 4 — INTRODUCING SUHAIL ---------------- */
function SceneSuhail({ onDone, audio }: { onDone: () => void; audio: boolean }) {
  const { tx } = useSettings();
  const [line, setLine] = useState(0);
  return (
    <SceneTransition sceneKey="suhail" backdrop={<StarField />}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,#326bff33,transparent_60%)]" aria-hidden />
      <div className="relative flex h-full flex-col items-center justify-between gap-4 overflow-y-auto px-4 pb-6 pt-24">
        <SuhailFloating expression={WELCOME_FACES[line] ?? "idle"} />
        <div className="w-full max-w-3xl">
          <DialogueBox speaker={tx(t("سهيل", "SUHAIL"))} lines={SUHAIL_WELCOME} onLine={setLine} onDone={onDone} doneLabel={tx(CINE_UI.meetCrew)} audio={audio} />
        </div>
      </div>
    </SceneTransition>
  );
}

/* ---------------- SCENE 5 — MEETING THE CREW ---------------- */
const CREW_FACILITY = { layan: "life", adam: "energy", mira: "greenhouse", rashed: "shelter" } as const;

function SceneCrew({ onDone }: { onDone: () => void }) {
  const { tx, lang, reducedMotion, beep } = useSettings();
  const [i, setI] = useState(0);
  const c = CREW_INTRO[i];
  const crew = CREW[c.id];
  const last = i === CREW_INTRO.length - 1;
  const next = useCallback(() => {
    beep("soft"); // beep() only sounds after a tap, which this click is
    if (last) onDone();
    else setI((n) => n + 1);
  }, [last, onDone, beep]);
  // each member holds the spotlight for a moment; Reduce Motion waits for the child
  useEffect(() => {
    if (reducedMotion || last) return;
    const id = window.setTimeout(() => setI((n) => Math.min(n + 1, CREW_INTRO.length - 1)), CREW_SPOTLIGHT_MS);
    return () => window.clearTimeout(id);
  }, [i, last, reducedMotion]);
  return (
    <SceneTransition sceneKey="crew" backdrop={<StarField />}>
      <div className="absolute inset-0 transition-colors duration-700" style={{ background: `radial-gradient(circle at 50% 40%, ${crew.color}33, transparent 62%)` }} aria-hidden />
      <div className="relative flex h-full flex-col items-center justify-center gap-6 overflow-y-auto px-4 pb-8 pt-24">
        <div key={c.id} className="spotlight flex w-full max-w-3xl flex-col items-center gap-5 text-center sm:flex-row sm:text-start">
          <div className="relative shrink-0">
            <div className="absolute -inset-4 rounded-full blur-2xl" style={{ background: crew.color + "44" }} aria-hidden />
            <div className="relative overflow-hidden rounded-full border-4" style={{ borderColor: crew.color }}>
              <Portrait id={c.id} size={180} />
            </div>
            <span className="absolute -bottom-2 end-0 grid size-14 place-items-center rounded-full border-2 bg-space text-2xl" style={{ borderColor: crew.color }} aria-hidden>
              {c.icon}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-display text-5xl font-bold sm:text-6xl" style={{ color: crew.color }}>
              {tx(crew.name)}
            </p>
            <p className="font-display text-lg font-bold tracking-wider text-lunar/90">
              {tx(crew.role)} · <span className="text-moon">{tx(FACILITIES[CREW_FACILITY[c.id]].name)}</span>
            </p>
            <p className="panel mt-1 px-4 py-3 text-xl leading-relaxed sm:text-2xl" style={{ borderColor: crew.color + "88" }}>
              {lang === "ar" ? `«${tx(c.line)}»` : `“${tx(c.line)}”`}
            </p>
          </div>
        </div>
        <ol className="flex gap-2" aria-label={tx(CINE_UI.meetCrew)}>
          {CREW_INTRO.map((x, k) => (
            <li key={x.id}>
              <button
                onClick={() => setI(k)}
                aria-current={k === i ? "step" : undefined}
                className={`min-h-11 rounded-full border-2 px-3 text-sm ${k === i ? "font-bold" : "opacity-60"}`}
                style={{ borderColor: CREW[x.id].color, color: CREW[x.id].color }}
              >
                {tx(CREW[x.id].name)}
              </button>
            </li>
          ))}
        </ol>
        <Button size="lg" onClick={next} autoFocus className="min-w-[min(100%,260px)]">
          {last ? tx(CINE_UI.next) : tx(CINE_UI.nextCrew)} ▶
        </Button>
      </div>
    </SceneTransition>
  );
}

/* ---------------- SCENE 6 — THE COMMANDER MOMENT ---------------- */
function SceneCommander({ onStart, audio }: { onStart: () => void; audio: boolean }) {
  const { tx, beep } = useSettings();
  const [ready, setReady] = useState(false);
  const [line, setLine] = useState(0);
  const [story, setStory] = useState(false);
  const all = { energy: "ok", life: "ok", greenhouse: "ok", water: "ok", shelter: "ok", command: "ok" } as const;
  return (
    <SceneTransition sceneKey="commander" backdrop={<StarField />}>
      <div className="relative flex h-full flex-col items-center gap-4 overflow-y-auto px-4 pb-8 pt-24">
        <div className="rise-over w-full max-w-3xl">
          <LunarBase status={all} />
        </div>
        {!ready ? (
          <div className="flex w-full max-w-3xl items-end gap-3">
            <div className="hidden shrink-0 sm:block">
              <SuhailFloating expression={COMMANDER_FACES[line] ?? "encouraging"} size="104px" />
            </div>
            <div className="flex-1">
              <DialogueBox
                speaker={tx(t("سهيل", "SUHAIL"))}
                lines={COMMANDER_LINES}
                onLine={setLine}
                onDone={() => {
                  beep("ok");
                  setReady(true);
                }}
                doneLabel={tx(CINE_UI.next)}
                audio={audio}
              />
            </div>
          </div>
        ) : (
          <section className="anim-rise flex w-full max-w-2xl flex-col items-center gap-4 text-center" aria-labelledby="ready-q">
            <h1 id="ready-q" className="font-display text-3xl font-bold sm:text-5xl">
              {tx(READY_QUESTION)}
            </h1>
            <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button variant="solar" size="lg" onClick={onStart} autoFocus className="w-full sm:w-auto sm:min-w-[260px]">
                🚀 {tx(CINE_UI.startMission)}
              </Button>
              <Button variant="ghost" size="lg" onClick={() => setStory(true)} aria-haspopup="dialog" className="w-full sm:w-auto">
                📖 {tx(CINE_UI.discoverStory)}
              </Button>
            </div>
          </section>
        )}
      </div>
      <Modal open={story} onClose={() => setStory(false)} title={tx(STORY.title)} closeLabel={tx(CINE_UI.close)}>
        <p className="font-display text-lg font-bold text-holo">{tx(STORY.lead)}</p>
        <p className="mt-2 leading-relaxed">{tx(STORY.body)}</p>
        <ul className="mt-3 flex flex-col gap-2">
          {STORY.chapters.map((c, i) => (
            <li key={i} className="rounded-xl bg-space/60 px-3 py-2">
              {tx(c)}
            </li>
          ))}
        </ul>
        <Button variant="solar" className="mt-4 w-full" onClick={onStart}>
          🚀 {tx(CINE_UI.startMission)}
        </Button>
      </Modal>
    </SceneTransition>
  );
}

/**
 * The cinematic opening. `onStart` = the child chose "Start Mission" (goes into the existing game);
 * `onSkip` = skipped (goes to the start menu).
 */
export function CinematicIntro({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const { tx, lang, set, sound, music, reducedMotion, beep } = useSettings();
  const [scene, setScene] = useState<SceneId>("space");
  const idx = SCENES.indexOf(scene);
  // Browsers (and children) should never hear sound before the first tap or key press.
  const [interacted, setInteracted] = useState(false);
  useEffect(() => {
    const mark = () => setInteracted(true);
    window.addEventListener("pointerdown", mark, { once: true });
    window.addEventListener("keydown", mark, { once: true });
    return () => {
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
    };
  }, []);
  const sfxOn = sound && interacted;
  const musicOn = music && interacted;

  const go = useCallback(
    (s: SceneId) => {
      if (sfxOn) sfx("whoosh");
      setScene(s);
    },
    [sfxOn],
  );
  const next = useCallback(() => {
    const n = SCENES[idx + 1];
    if (n) go(n);
  }, [idx, go]);

  // the three establishing shots advance by themselves
  useEffect(() => {
    const d = SCENE_AUTO_MS[scene];
    if (!d) return;
    const id = window.setTimeout(next, reducedMotion ? SCENE_AUTO_REDUCED_MS : d);
    return () => window.clearTimeout(id);
  }, [scene, next, reducedMotion]);

  // ambience + music (original procedural audio), only after interaction
  useEffect(() => {
    if (musicOn) {
      startAmbience();
      startMusic();
    } else {
      stopAmbience();
      stopMusic();
    }
  }, [musicOn]);
  useEffect(
    () => () => {
      stopAmbience();
      stopMusic();
    },
    [],
  );
  useEffect(() => {
    if (scene === "space" && sfxOn) radioStatic();
  }, [scene, sfxOn]);

  // keyboard: Esc skips; Enter / → continues on the self-running scenes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
      else if ((e.key === "Enter" || e.key === "ArrowRight" || e.key === "ArrowLeft") && SCENE_AUTO_MS[scene] && !(e.target instanceof HTMLButtonElement)) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip, next, scene]);

  const pill = "min-h-11 rounded-full border border-holo/40 bg-space/70 px-3 py-1.5 text-sm backdrop-blur hover:bg-holo/15 aria-pressed:border-holo aria-pressed:bg-holo/20";

  return (
    <div className="fixed inset-0 z-50 bg-black text-lunar" role="region" aria-roledescription="cinematic" aria-label="SPACE COMMANDER — Operation Moonlight" data-scene={scene}>
      {scene === "space" && <SceneSpace />}
      {scene === "approach" && <SceneApproach />}
      {scene === "alert" && <SceneAlert audio={sfxOn} />}
      {scene === "suhail" && <SceneSuhail onDone={next} audio={sfxOn} />}
      {scene === "crew" && <SceneCrew onDone={next} />}
      {scene === "commander" && <SceneCommander onStart={onStart} audio={sfxOn} />}

      {/* top bar: progress, audio, language, skip */}
      <div className="absolute inset-x-0 top-0 z-30 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-black/80 to-transparent px-3 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <ol className="flex gap-1.5" aria-label={tx(CINE_UI.scene)}>
            {SCENES.map((s, i) => (
              <li key={s} aria-current={i === idx ? "step" : undefined} className={`h-2 rounded-full transition-all ${i === idx ? "w-8 bg-holo" : i < idx ? "w-2 bg-holo/70" : "w-2 bg-moon/30"}`}>
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

      {/* invite sound on the first shots (never starts it automatically) */}
      {(scene === "space" || scene === "approach") && !sound && !music && (
        <div className="absolute inset-x-0 top-20 z-30 flex justify-center px-4">
          <button
            className="panel anim-rise min-h-11 px-4 py-2 text-sm hover:bg-holo/10"
            onClick={() => {
              setInteracted(true);
              set({ sound: true, music: true });
              beep("ok");
            }}
          >
            {tx(CINE_UI.soundHint)}
          </button>
        </div>
      )}

      {/* continue on the self-running scenes */}
      {SCENE_AUTO_MS[scene] && (
        <div className="absolute inset-x-0 bottom-6 z-30 flex justify-center">
          <Button variant="ghost" onClick={next} className="bg-space/60 backdrop-blur">
            {tx(CINE_UI.next)} ▶
          </Button>
        </div>
      )}
    </div>
  );
}
