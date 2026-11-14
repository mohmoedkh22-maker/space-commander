export type Lang = "ar" | "en";
export interface T {
  ar: string;
  en: string;
}

export type CrewId = "layan" | "adam" | "mira" | "rashed";
export type GreenhouseLevel = "full" | "reduced" | "minimal";
export type DecisionId = "d1-energy" | "d2-water" | "d3-emergency";
export type Choices = Partial<Record<DecisionId, string>>;
export type MissionId = 1 | 2 | 3;

/* ---------------- Resources ---------------- */

export type ResourceId = "energy" | "water" | "oxygen" | "food";
/** energy = battery reserve (kWh) · water (L) · oxygen index (%) · food = crop growth / food supply (%) */
export type Resources = Record<ResourceId, number>;

export interface ResourceEffect {
  resource: ResourceId;
  delta: number;
}

/* ---------------- Facilities & safety ---------------- */

/** Visible condition of each facility; changed by events, decisions and daily simulation. */
export interface FacilityConditions {
  powerStation: "nominal" | "low-reserve";
  waterRecycling: "nominal" | "faulty" | "boosted" | "repaired";
  greenhouse: "thriving" | "reduced" | "dormant";
  lifeSupport: "nominal" | "strained";
  shelter: "standby" | "ready" | "active";
}

/** The crew is always protected; "strained" means life support was underpowered that day. */
export type CrewSafety = "safe" | "sheltered" | "strained";

export type SafetyCheckId = "stopExternal" | "crewIndoors" | "shelterReady" | "lifeSupportConfirmed";

/* ---------------- Missions & outcomes ---------------- */

export type EndingId = "A" | "B" | "C";
export type MissionOutcome = "MISSION_ACCOMPLISHED" | "SAFE_BUT_LIMITED" | "MISSION_INTERRUPTED";
export type MissionStatus = "IN_PROGRESS" | MissionOutcome;

/** What a mission chapter's decision produced, stored for the following chapters. */
export interface MissionChapterResult {
  missionId: MissionId;
  decisionId: DecisionId;
  optionId: string;
  day: number;
  consequences: T[];
}

export interface HistoryEntry {
  decisionId: DecisionId;
  optionId: string;
  day: number;
}

export interface Policy {
  greenhouse: GreenhouseLevel;
  research: boolean;
  recyclerBoost: boolean;
  ration: boolean;
}

export interface DayLog {
  day: number;
  /** real 2026 date this mission day is mapped to (MISSION_CALENDAR) */
  lightDate: string;
  /** share of that day the site is sunlit (0..1), from NASA SVS 4930 via NASADataAdapter */
  sunlitFraction: number;
  /** "nasa-svs-4930", or "fallback-lola-average" if the day was missing */
  lightSource: "nasa-svs-4930" | "fallback-lola-average";
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
  /** resources at the end of the day */
  energy: number;
  water: number;
  oxygen: number;
  food: number;
}

/** The single authoritative game state. */
export interface GameState {
  /** Next day to simulate (1..8). 8 means the mission is over. */
  day: number;
  activeMissionId: MissionId;
  resources: Resources;
  facilities: FacilityConditions;
  crewSafety: CrewSafety;
  safetyChecks: Record<SafetyCheckId, boolean>;
  decisionHistory: HistoryEntry[];
  missionResults: MissionChapterResult[];
  missionStatus: MissionStatus;
  researchPoints: number;
  performanceFactor: number;
  recyclerEfficiency: number;
  policy: Policy;
  /** one-day overrides (e.g. crew busy repairing) */
  today: { extraLoadKWh: number; researchPaused: boolean };
  flags: {
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

/* ---------------- Data-driven decisions ---------------- */

export type Prerequisite =
  | { kind: "resource-min"; resource: ResourceId; min: number; reason: T }
  | { kind: "safety-checks"; reason: T };

/** A decision option is pure DATA: the engine interprets it, the UI renders it. */
export interface DecisionOption {
  id: string;
  label: T;
  description: T;
  benefit: T;
  cost: T;
  prerequisites?: Prerequisite[];
  /** ongoing operating plan from now on */
  policy?: Partial<Policy>;
  /** immediate one-time resource changes (validated against limits) */
  resourceEffects?: ResourceEffect[];
  facilityEffects?: Partial<FacilityConditions>;
  /** one-day effects (extra work today) */
  today?: Partial<GameState["today"]>;
  flags?: Partial<GameState["flags"]>;
  /** stored for later missions and shown to the player */
  consequences: T[];
  /** the science behind the choice */
  explanation: T;
  suhail: T;
  crew: { who: CrewId; text: T };
}

export interface Decision {
  id: DecisionId;
  day: number;
  mission: MissionId;
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
  outcome: MissionOutcome;
  crewSafe: true;
  final: Resources;
  reasons: T[];
}
