"use client";
import { useEffect, useState } from "react";
import { MISSION_INTROS } from "@/lib/game/experience";
import type { GameState, MissionId } from "@/lib/game/types";
import { t } from "@/lib/i18n";
import { CommandCenter, LunarVista } from "../cinematic/Backdrops";
import { SceneTransition } from "../cinematic/SceneTransition";
import { useSettings } from "../settings";
import { Button } from "../ui";
import { ScriptDialogue } from "./ScriptDialogue";

/** Atmosphere layered on top of the existing backdrops. */
function Atmosphere({ scene }: { scene: "vanishing-sun" | "water" | "storm" }) {
  if (scene === "vanishing-sun")
    return <div className="mi-dusk pointer-events-none absolute inset-0 bg-gradient-to-l from-transparent via-[#0b1026aa] to-[#0b1026ee]" aria-hidden />;
  if (scene === "water")
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[#326bff1a]" />
        {[18, 34, 62, 80].map((x, i) => (
          <span key={x} className="mi-drop absolute top-0 text-2xl" style={{ left: `${x}%`, animationDelay: `${i * 0.7}s` }}>
            💧
          </span>
        ))}
        <div className="mi-alarm absolute inset-0 border-[6px] border-[#ffad4d]" />
      </div>
    );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="mi-alarm absolute inset-0 bg-[#8c78ff22]" />
      {[8, 22, 37, 51, 66, 79, 91].map((x, i) => (
        <span key={x} className="mi-streak absolute top-0 h-40 w-[2px] bg-gradient-to-b from-transparent via-[#c7b8ff] to-transparent" style={{ left: `${x}%`, animationDelay: `${i * 0.35}s` }} />
      ))}
      <div className="mi-alarm absolute inset-0 border-[6px] border-[#ff6b6b]" />
    </div>
  );
}

/**
 * Cinematic mission opening: environment → title reveal → crew dialogue → objective → Start.
 * Skippable at any time.
 */
export function MissionIntro({ mission, state, onStart }: { mission: MissionId; state: GameState; onStart: () => void }) {
  const { tx, beep } = useSettings();
  const intro = MISSION_INTROS[mission];
  const [phase, setPhase] = useState<"title" | "dialogue" | "objective">("title");
  useEffect(() => {
    beep(mission === 3 ? "alert" : "whoosh");
    const id = window.setTimeout(() => setPhase((p) => (p === "title" ? "dialogue" : p)), 2600);
    return () => window.clearTimeout(id);
  }, [mission, beep]);

  const backdrop =
    intro.scene === "water" ? (
      <CommandCenter labels={["⚡", "💧", "🫧", "🌱"]} dim />
    ) : (
      <LunarVista />
    );

  return (
    <div className="fixed inset-0 z-40 bg-black text-lunar">
      <SceneTransition sceneKey={`m${mission}`} backdrop={backdrop} camera={intro.scene === "water" ? "push" : "approach"}>
        <Atmosphere scene={intro.scene} />
        <div className="relative flex h-full flex-col overflow-y-auto px-4 pb-6 pt-6 sm:px-10">
          <div className="flex justify-end">
            <button className="min-h-10 rounded-full border border-solar/60 bg-space/70 px-4 py-1.5 text-sm font-bold backdrop-blur hover:bg-holo/15" onClick={onStart}>
              {tx(t("تخطي", "Skip"))} ⏭
            </button>
          </div>
          <header className={`mt-[6vh] text-center ${phase === "title" ? "" : "sm:mt-4"}`}>
            <p className="c7-online font-display text-base font-bold tracking-[0.3em] text-holo drop-shadow-[0_2px_12px_#000] sm:text-lg">{tx(intro.kicker)}</p>
            <h1
              className="c7-online mt-2 font-display text-5xl font-bold drop-shadow-[0_4px_30px_#000] sm:text-7xl"
              style={{ animationDelay: "0.4s", color: intro.scene === "storm" ? "#ffb4b4" : undefined }}
            >
              {tx(intro.title)}
            </h1>
          </header>
          <div className="mx-auto mt-auto w-full max-w-3xl">
            {phase === "title" && (
              <div className="flex justify-center">
                <Button variant="ghost" onClick={() => setPhase("dialogue")} className="bg-space/60 backdrop-blur">
                  {tx(t("متابعة", "Continue"))} ▶
                </Button>
              </div>
            )}
            {phase === "dialogue" && <ScriptDialogue lines={intro.lines(state)} onDone={() => setPhase("objective")} />}
            {phase === "objective" && (
              <div className="panel anim-rise flex flex-col items-center gap-4 p-6 text-center" style={{ borderColor: "#ffad4daa" }}>
                <p className="font-display text-sm font-bold tracking-[0.25em] text-solar">🎯 {tx(t("هدف المهمة", "MISSION OBJECTIVE"))}</p>
                <p className="text-xl leading-relaxed sm:text-2xl">{tx(intro.objective)}</p>
                <Button size="lg" onClick={onStart} autoFocus className="min-w-[min(100%,320px)]">
                  🚀 {tx(t("ابدأ المهمة", "Start mission"))}
                </Button>
              </div>
            )}
          </div>
        </div>
      </SceneTransition>
    </div>
  );
}
