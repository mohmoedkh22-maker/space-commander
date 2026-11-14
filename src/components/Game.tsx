"use client";
import { useEffect, useMemo, useState } from "react";
import { computeEnding, simulate, STEPS } from "@/lib/game/engine";
import type { Choices, DecisionId } from "@/lib/game/types";
import { Hud, Toolbar } from "./Hud";
import { SettingsProvider } from "./settings";
import { Briefing, Splash, Tour } from "./screens/Intro";
import { ConsequenceScreen, DayScreen, DecisionScreen, FaultEvent, SafetyScreen, StormEvent } from "./screens/Mission";
import { OutcomeScreen, ReportScreen } from "./screens/Outcome";
import { ScienceScreen } from "./screens/Science";
import { WhatIfLab, type LabResult } from "./screens/WhatIfLab";

type Screen = "splash" | "briefing" | "tour" | "play" | "outcome" | "lab" | "report";

export default function Game() {
  return (
    <SettingsProvider>
      <GameInner />
    </SettingsProvider>
  );
}

function GameInner() {
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

  const advance = (k = 1) => {
    const n = stepIndex + k;
    if (n >= STEPS.length) {
      setStepIndex(STEPS.length);
      setScreen("outcome");
    } else setStepIndex(n);
  };

  const restart = () => {
    setChoices({});
    setStepIndex(0);
    setConsequence(null);
    setLab(null);
    setScreen("splash");
  };

  if (science) return <ScienceScreen onBack={() => setScience(false)} />;
  if (screen === "splash") return <Splash onStart={() => setScreen("briefing")} onScience={() => setScience(true)} />;
  if (screen === "briefing") return <Briefing onDone={() => setScreen("tour")} />;
  if (screen === "tour") return <Tour onDone={() => setScreen("play")} />;

  const ending = computeEnding(final.state);
  if (screen === "outcome") {
    return (
      <>
        <Hud state={final.state} onScience={() => setScience(true)} />
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
    body = <SafetyScreen onNext={() => advance(1)} />;
  } else if (step) {
    const id = step as DecisionId;
    body = (
      <DecisionScreen
        key={id}
        id={id}
        state={current.state}
        records={current.records}
        onConfirm={(opt) => {
          setChoices((c) => ({ ...c, [id]: opt }));
          setStepIndex(stepIndex + 2); // the decision + the day it shapes
          setConsequence(id);
        }}
      />
    );
  }

  return (
    <>
      <Hud state={hudState} onScience={() => setScience(true)} />
      {body}
    </>
  );
}
