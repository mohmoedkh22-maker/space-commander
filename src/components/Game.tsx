"use client";
import { useEffect, useMemo, useState } from "react";
import { computeEnding, simulate, STEPS, tryApplyDecision } from "@/lib/game/engine";
import type { Choices, DecisionId } from "@/lib/game/types";
import { Toolbar } from "./Hud";
import { LunarBaseScreen, MissionBriefing } from "./mission/MissionBriefing";
import { MissionHUD } from "./mission/MissionHUD";
import { CinematicIntro } from "./cinematic/CinematicIntro";
import { PROGRESS_KEY, parseProgress, serializeProgress, type SavedProgress } from "@/lib/game/persistence";
import { SettingsProvider, useSettings } from "./settings";
import { Splash } from "./screens/Intro";
import { DayScreen } from "./screens/Mission";
import { BaseHub } from "./experience/BaseHub";
import { MissionIntro } from "./experience/MissionIntro";
import { MissionResult } from "./experience/MissionResult";
import { cluesFor } from "@/lib/game/experience";
import type { MissionId } from "@/lib/game/types";
import { ConsequenceScreen, DecisionScreen } from "./mission/DecisionCards";
import { OutcomeScreen, ReportScreen } from "./screens/Outcome";
import { ScienceScreen } from "./screens/Science";
import { WhatIfLab, type LabResult } from "./screens/WhatIfLab";
import { Scene } from "./experience/Journey";

type Screen = "splash" | "intro" | "briefing" | "tour" | "play" | "outcome" | "lab" | "report";

export default function Game() {
  return (
    <SettingsProvider>
      <GameInner />
    </SettingsProvider>
  );
}

function GameInner() {
  const { introDone, set } = useSettings();
  const [screen, setScreen] = useState<Screen>("splash");
  const [science, setScience] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [choices, setChoices] = useState<Choices>({});
  const [consequence, setConsequence] = useState<DecisionId | null>(null);
  const [lab, setLab] = useState<LabResult | null>(null);
  // V0.5 experience: which intros / base investigations / debriefs were seen, and which clues were found
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [clues, setClues] = useState<Set<string>>(new Set());
  const markSeen = (k: string) => setSeen((s) => new Set(s).add(k));
  const resetExperience = () => {
    setSeen(new Set());
    setClues(new Set());
  };

  const current = useMemo(() => simulate(choices, stepIndex), [choices, stepIndex]);
  const next = useMemo(() => simulate(choices, stepIndex + 1), [choices, stepIndex]);
  const final = useMemo(() => simulate(choices), [choices]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen, stepIndex, consequence, science]);

  // Optional session progress on this device (no accounts). Read once, write while playing.
  const [saved, setSaved] = useState<SavedProgress | null>(null);
  useEffect(() => {
    try {
      setSaved(parseProgress(localStorage.getItem(PROGRESS_KEY)));
    } catch {}
  }, []);
  useEffect(() => {
    if (screen === "splash" || screen === "intro" || screen === "briefing" || screen === "tour") return;
    try {
      localStorage.setItem(PROGRESS_KEY, serializeProgress(choices, stepIndex));
    } catch {}
  }, [screen, choices, stepIndex]);
  const clearProgress = () => {
    try {
      localStorage.removeItem(PROGRESS_KEY);
    } catch {}
    setSaved(null);
  };
  const savedDay = saved ? Math.min(simulate(saved.choices, saved.stepIndex).state.day, 7) : 0;

  const advance = (k = 1) => {
    const n = stepIndex + k;
    if (n >= STEPS.length) {
      setStepIndex(STEPS.length);
      setScreen("outcome");
    } else setStepIndex(n);
  };

  const restart = () => {
    clearProgress();
    resetExperience();
    setChoices({});
    setStepIndex(0);
    setConsequence(null);
    setLab(null);
    setScreen("splash");
  };

  if (science) return <ScienceScreen onBack={() => setScience(false)} />;
  if (screen === "splash")
    return (
      <Splash
        // First visit: the cinematic. Returning players go straight to the mission.
        onStart={() => {
          // Start always means a NEW mission; saved progress is offered separately.
          clearProgress();
          resetExperience();
          setChoices({});
          setStepIndex(0);
          setConsequence(null);
          setLab(null);
          // V0.7 journey: (cinematic, first time only) → Mission Briefing → Lunar Base → Mission 01
          setScreen(introDone ? "briefing" : "intro");
        }}
        resumeDay={saved && saved.stepIndex > 0 ? savedDay : undefined}
        onResume={() => {
          if (!saved) return;
          // chapters already behind the saved step don't replay their intro / debrief
          const past = (step: string, keys: string[]) => (saved.stepIndex > STEPS.indexOf(step as never) ? keys : []);
          setSeen(
            new Set([
              ...past("d1-energy", ["intro-1", "hub-1"]),
              ...past("evt-fault", ["result-1", "intro-2"]),
              ...past("d2-water", ["hub-2"]),
              ...past("evt-storm", ["result-2", "intro-3"]),
              ...past("safety", ["hub-3"]),
            ]),
          );
          setChoices(saved.choices);
          setStepIndex(saved.stepIndex);
          setConsequence(null);
          setScreen(saved.stepIndex >= STEPS.length ? "outcome" : "play");
        }}
        onReplayIntro={() => setScreen("intro")}
        onGuide={() => setScreen("briefing")}
        onScience={() => setScience(true)}
      />
    );
  if (screen === "intro")
    return (
      <CinematicIntro
        onFinish={() => {
          set({ introDone: true });
          // Day 1 was just shown in the cinematic, so the mission opens on the first decision.
          if (stepIndex === 0) setStepIndex(1);
          setScreen("briefing");
        }}
        onSkip={() => {
          set({ introDone: true });
          setScreen("briefing");
        }}
      />
    );
  if (screen === "briefing")
    return (
      <Scene id="briefing">
        <MissionBriefing onDone={() => setScreen("tour")} />
      </Scene>
    );
  if (screen === "tour")
    return (
      <Scene id="tour">
        <LunarBaseScreen
          onDone={() => {
            // Day 1 ("systems online") is the arrival; the first challenge starts on Day 2.
            if (stepIndex === 0) setStepIndex(1);
            setScreen("play");
          }}
          onScience={() => setScience(true)}
        />
      </Scene>
    );

  const ending = computeEnding(final.state);
  if (screen === "outcome" && !seen.has("result-3")) {
    return (
      <>
        <MissionHUD state={final.state} onScience={() => setScience(true)} />
        <MissionResult mission={3} choices={choices} onContinue={() => markSeen("result-3")} />
      </>
    );
  }
  if (screen === "outcome") {
    return (
      <>
        <MissionHUD state={final.state} onScience={() => setScience(true)} />
        <Scene id="outcome">
          <OutcomeScreen ending={ending} state={final.state} onLab={() => setScreen("lab")} />
        </Scene>
      </>
    );
  }
  const topBar = (
    <div className="sticky top-0 z-20 border-b border-holo/15 bg-space/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl justify-end px-4 py-2">
        <Toolbar onScience={() => setScience(true)} />
      </div>
    </div>
  );
  if (screen === "lab") {
    return (
      <>
      {topBar}
      <WhatIfLab
        choices={choices}
        records={final.records}
        onDone={(r) => {
          if (r) setLab(r);
          setScreen("report");
        }}
      />
      </>
    );
  }
  if (screen === "report") {
    return (
      <>
        {topBar}
        <Scene id="report">
          <ReportScreen ending={ending} state={final.state} records={final.records} lab={lab} onScience={() => setScience(true)} onRestart={restart} />
        </Scene>
      </>
    );
  }

  // screen === "play"
  const step = STEPS[stepIndex];
  let body: React.ReactNode = null;
  let hudState = current.state;

  if (consequence) {
    const rec = current.records.find((r) => r.decisionId === consequence)!;
    body = <ConsequenceScreen record={rec} after={current.state} onNext={() => setConsequence(null)} />;
  } else if (step?.startsWith("day")) {
    const day = Number(step.slice(3));
    hudState = next.state;
    body = <DayScreen key={step} day={day} before={current.state} after={next.state} onNext={() => advance(1)} />;
  } else if (step === "evt-fault" || step === "evt-storm") {
    // end of the previous chapter → debrief, then the next mission's cinematic intro
    const prev: MissionId = step === "evt-fault" ? 1 : 2;
    const nextMission: MissionId = step === "evt-fault" ? 2 : 3;
    if (!seen.has(`result-${prev}`)) {
      body = <MissionResult key={`r${prev}`} mission={prev} choices={choices} onContinue={() => markSeen(`result-${prev}`)} />;
    } else {
      return (
        <MissionIntro
          key={`i${nextMission}`}
          mission={nextMission}
          state={next.state}
          onStart={() => {
            markSeen(`intro-${nextMission}`);
            advance(1);
          }}
        />
      );
    }
  } else if (step === "safety") {
    // Mission 03 investigation includes the engine's mandatory safety steps
    body = (
      <BaseHub
        key="hub-3"
        mission={3}
        state={current.state}
        found={clues}
        onFind={(id) => setClues((s) => new Set(s).add(id))}
        onReady={() => {
          markSeen("hub-3");
          advance(1);
        }}
      />
    );
  } else if (step === "d1-energy" && !seen.has("intro-1")) {
    return <MissionIntro key="i1" mission={1} state={current.state} onStart={() => markSeen("intro-1")} />;
  } else if ((step === "d1-energy" || step === "d2-water") && !seen.has(step === "d1-energy" ? "hub-1" : "hub-2")) {
    const m: MissionId = step === "d1-energy" ? 1 : 2;
    body = (
      <BaseHub
        key={`hub-${m}`}
        mission={m}
        state={current.state}
        found={clues}
        onFind={(id) => setClues((s) => new Set(s).add(id))}
        onReady={() => markSeen(`hub-${m}`)}
      />
    );
  } else if (step) {
    const id = step as DecisionId;
    const m: MissionId = id === "d1-energy" ? 1 : id === "d2-water" ? 2 : 3;
    const notes = cluesFor(m)
      .filter((c) => clues.has(c.clue.id))
      .map((c) => c.clue.reveal(current.state));
    body = (
      <DecisionScreen
        key={id}
        id={id}
        state={current.state}
        records={current.records}
        notes={notes}
        onConfirm={(opt) => {
          // The engine is the single source of truth: reject anything it does not accept.
          const check = tryApplyDecision(current.state, id, opt);
          if (!check.ok) return;
          setChoices((c) => ({ ...c, [id]: opt }));
          setStepIndex(stepIndex + 2); // the decision + the day it shapes
          setConsequence(id);
        }}
      />
    );
  }

  return (
    <>
      <MissionHUD state={hudState} onScience={() => setScience(true)} />
      <Scene id={consequence ? `consequence-${consequence}` : `${step}-${seen.size}`}>{body}</Scene>
    </>
  );
}
