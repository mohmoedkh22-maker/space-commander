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

export type MissionId = 1 | 2 | 3;

/** Visible condition of each facility; changed by events and decisions, shown on the base map. */
export interface FacilityConditions {
  energy: "nominal" | "serviced";
  water: "nominal" | "faulty" | "repaired";
  greenhouse: "thriving" | "reduced" | "dormant";
  life: "nominal" | "strained";
  shelter: "standby" | "active";
}

/** The crew is always protected; "strained" means life support was underpowered that day. */
export type CrewSafety = "safe" | "sheltered" | "strained";

export interface DayLog {
  day: number;
  /** story light factor applied to the NASA average that day */
  lightFactor: number;
  solarKWh: number;
  loadKWh: number;
  /** where the energy went (kWh) */
  loads: { lifeSupport: number; recycler: number; greenhouse: number; research: number; shelter: number; extra: number };
  shortfallKWh: number;
  shed: string[];
  /** effective water recovery that day (0..1) */
  recyclerEfficiency: number;
  crewWaterUseL: number;
  greenhouseWaterL: number;
  cropGrowth: number;
  batteryKWh: number;
  waterL: number;
  oxygenPct: number;
  cropPct: number;
}

export interface HistoryEntry {
  decisionId: DecisionId;
  optionId: string;
  day: number;
}

export interface GameState {
  /** Next day to simulate (1..8). 8 means the mission is over. */
  day: number;
  /** active mission chapter (derived from the day) */
  mission: MissionId;
  facilities: FacilityConditions;
  crewSafety: CrewSafety;
  /** decisions taken so far, in order */
  history: HistoryEntry[];
  /** set when Day 7 ends */
  outcome: EndingId | null;
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

export type EventId = "evt-fault" | "evt-storm" | "safety";

/** A mission chapter: its days, its decision and the event that opens it. */
export interface Mission {
  id: MissionId;
  title: T;
  focus: T;
  days: number[];
  decision: DecisionId;
  openingEvent?: EventId;
}

export type ResourceKey = "batteryKWh" | "waterL" | "oxygenPct" | "cropPct";
export interface ResourceEffect {
  resource: ResourceKey;
  delta: number;
}

/** One explained consequence ("what changed, and why"). */
export interface Consequence {
  kind: "energy" | "load" | "shed" | "water" | "food" | "oxygen" | "facility" | "safety";
  text: T;
  effect?: ResourceEffect;
}

/** A scripted story event that changes the state (data-driven). */
export interface GameEvent {
  id: EventId;
  day: number;
  title: T;
  apply: (s: GameState) => GameState;
}

export interface MissionResult {
  ending: EndingId;
  crewSafe: true;
  final: Record<ResourceKey, number>;
  reasons: T[];
}
