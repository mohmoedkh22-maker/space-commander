export type Lang = "ar" | "en";
export interface T {
  ar: string;
  en: string;
}

export type CrewId = "layan" | "adam" | "mira" | "rashed";
export type GreenhouseLevel = "full" | "reduced" | "minimal";
export type DecisionId = "d1-energy" | "d2-water" | "d3-emergency";
export type Choices = Partial<Record<DecisionId, string>>;

export interface Policy {
  greenhouse: GreenhouseLevel;
  research: boolean;
  recyclerBoost: boolean;
  ration: boolean;
}

export interface DayLog {
  day: number;
  solarKWh: number;
  loadKWh: number;
  shortfallKWh: number;
  shed: string[];
  batteryKWh: number;
  waterL: number;
  oxygenPct: number;
  cropPct: number;
}

export interface GameState {
  /** Next day to simulate (1..8). 8 means the mission is over. */
  day: number;
  batteryKWh: number;
  waterL: number;
  oxygenPct: number;
  cropPct: number;
  researchPoints: number;
  performanceFactor: number;
  recyclerEfficiency: number;
  policy: Policy;
  /** one-day overrides (e.g. crew busy repairing) */
  today: { extraLoadKWh: number; researchPaused: boolean };
  flags: {
    panelsInspected: boolean;
    recyclerFault: boolean;
    recyclerRepairPending: boolean;
    storm: boolean;
    safetyConfirmed: boolean;
    researchEnded: boolean;
  };
  shortfallDays: number;
  log: DayLog[];
}

export type StepId =
  | "day1"
  | "d1-energy"
  | "day2"
  | "evt-fault"
  | "d2-water"
  | "day3"
  | "day4"
  | "evt-storm"
  | "safety"
  | "d3-emergency"
  | "day5"
  | "day6"
  | "day7";

export interface DecisionOption {
  id: string;
  label: T;
  benefit: T;
  cost: T;
  /** returns null when allowed, otherwise the reason it is locked */
  locked?: (s: GameState) => T | null;
  apply: (s: GameState) => GameState;
  suhail: T;
  crew: { who: CrewId; text: T };
}

export interface Decision {
  id: DecisionId;
  day: number;
  mission: 1 | 2 | 3;
  title: T;
  problem: T;
  science: T;
  hint: T;
  reports: { title: T; body: (s: GameState) => T }[];
  options: DecisionOption[];
}

export interface DecisionRecord {
  decisionId: DecisionId;
  optionId: string;
  requestedOptionId: string;
  fallback: boolean;
  day: number;
  before: GameState;
  after: GameState;
}

export type EndingId = "A" | "B" | "C";
