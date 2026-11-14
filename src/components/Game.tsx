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
import { DayScreen, FaultEvent, SafetyScreen, StormEvent } from "./screens/Mission";
import { ConsequenceScreen, DecisionScreen } from "./mission/DecisionCards";
import { OutcomeScreen, ReportScreen } from "./screens/Outcome";
import { ScienceScreen } from "./screens/Science";
import { WhatIfLab, type LabResult } from "./screens/WhatIfLab";

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
          setChoices({});
          setStepIndex(0);
          setConsequence(null);
          setLab(null);
          setScreen(introDone ? "play" : "intro");
        }}
        resumeDay={saved && saved.stepIndex > 0 ? savedDay : undefined}
        onResume={() => {
          if (!saved) return;
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
          // Day 1 was just shown in the cinematic, so open on the first decision.
          if (stepIndex === 0) setStepIndex(1);
          setScreen("play");
        }}
        onSkip={() => {
          set({ introDone: true });
          setScreen("play");
        }}
      />
    );
  if (screen === "briefing") return <MissionBriefing onDone={() => setScreen("tour")} />;
  if (screen === "tour") return <LunarBaseScreen onDone={() => setScreen("play")} onScience={() => setScience(true)} />;

  const ending = computeEnding(final.state);
  if (screen === "outcome") {
    return (
      <>
        <MissionHUD state={final.state} onScience={() => setScience(true)} />
        <OutcomeScreen ending={ending} state={final.state} onLab={() => setScreen("lab")} />
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
        <ReportScreen ending={ending} state={final.state} records={final.records} lab={lab} onScience={() => setScience(true)} onRestart={restart} />
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
  } else if (step === "evt-fault") {
    hudState = next.state;
    body = <FaultEvent state={next.state} onNext={() => advance(1)} />;
  } else if (step === "evt-storm") {
    hudState = next.state;
    body = <StormEvent state={next.state} onNext={() => advance(1)} />;
  } else if (step === "safety") {
    body = <SafetyScreen state={current.state} onNext={() => advance(1)} />;
  } else if (step) {
    const id = step as DecisionId;
    body = (
      <DecisionScreen
        key={id}
        id={id}
        state={current.state}
        records={current.records}
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
      {body}
    </>
  );
}
