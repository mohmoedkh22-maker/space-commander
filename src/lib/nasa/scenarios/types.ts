// WP06.4 — Scientific Scenario Engine: shared types.
// Pure TypeScript. Scenarios are EDUCATIONAL DATA derived from offline NASA datasets; nothing here changes gameplay,
// the simulation engine, resources, decisions or the What If engine (only its public types are referenced).
import type { CompanionExpression } from "../../game/companion.ts";
import type { DecisionId, T } from "../../game/types.ts";
import type { Prediction } from "../../game/whatif.ts";

export const SCENARIO_SCHEMA_VERSION = 1;
export const SCENARIO_GENERATOR_VERSION = "scenarios-v1";

export type ScenarioCategory = "CME" | "SEP" | "FLR" | "LUNAR_ORBIT_RADIATION" | "DEEP_SPACE_COMPARISON";
export const SCENARIO_CATEGORIES: ScenarioCategory[] = ["CME", "SEP", "FLR", "LUNAR_ORBIT_RADIATION", "DEEP_SPACE_COMPARISON"];

/** Which source dataset a category may use. DONKI and RadLab are never mixed inside one data scenario. */
export const CATEGORY_DATASET: Record<ScenarioCategory, SourceDataset> = {
  CME: "DONKI",
  SEP: "DONKI",
  FLR: "DONKI",
  LUNAR_ORBIT_RADIATION: "RADLAB",
  DEEP_SPACE_COMPARISON: "RADLAB",
};

export type SourceDataset = "DONKI" | "RADLAB";

/**
 * historical-observation      — a record NASA reports from instruments
 * historical-model-output     — a historical NASA record whose source is a forecast/model, not a direct measurement
 * historical-reference-only   — NASA references the record by ID, but its details are not available offline
 * simulated                   — invented for gameplay; never used by generated scenarios (reserved for game content)
 */
export type ScenarioClassification = "historical-observation" | "historical-model-output" | "historical-reference-only" | "simulated";

/** Where a measurement or observation was made. Lunar ORBIT is never the lunar surface. */
export type ObservationContext = "solar-corona" | "near-earth-and-inner-heliosphere" | "lunar-orbit" | "heliocentric-1au";

export interface SourceRef {
  dataset: SourceDataset;
  provider: string;
  endpoint: string;
  /** the local offline file the scenario was generated from */
  file: string;
  retrievedAt: string;
  dataVersion: string;
}

export interface SourceRecordRef {
  /** NASA record id (DONKI) or "<instrument_id>@<timestamp>" (RadLab), unchanged */
  id: string;
  recordType: "CME" | "SEP" | "FLR" | "RADLAB_MEASUREMENT";
  timestamp: string | null;
  url: string | null;
  /** true when the full record is stored offline; false when NASA only references it */
  availableOffline: boolean;
}

/**
 * A value copied from a source record. `derivation` says how it was chosen; values are never computed, converted or filled.
 *   as-recorded            — the record's own value
 *   selected-daily-maximum — the largest recorded value of that UTC-assumed day, copied from one identified record
 */
export interface ScenarioMeasurement {
  name: string;
  value: number;
  unit: string;
  unitSource: string;
  recordId: string;
  derivation: "as-recorded" | "selected-daily-maximum";
}

/** A measurement the scenario would describe but that the source does not provide. It stays missing. */
export interface MissingMeasurement {
  name: string;
  reason: T;
}

export interface DataQuality {
  /** indicators copied from the source (e.g. DONKI dataQuality.level/basis, RadLab quality flags and counts) */
  sourceIndicators: Record<string, string | number | boolean | string[]>;
  /** no numeric confidence is invented: neither DONKI nor RadLab provides one */
  confidence: null;
  confidenceNote: T;
  uncertainties: T[];
}

export interface DecisionOptionEdu {
  id: string;
  label: T;
  /** educational explanation only: no resource, score or engine effect */
  educationalConsequence: T;
}

/** Hook for a later What If Lab integration. Qualitative only; the What If engine is not modified. */
export interface WhatIfHook {
  question: T;
  /** the existing game decision this scenario relates to (topic link only) */
  linkedDecisionId: DecisionId | null;
  predictionDirections: Prediction[];
  /** radiation readings are never converted into oxygen, water, food or energy effects */
  resourceEffects: null;
  note: T;
}

/**
 * nasa-linked-events        — NASA DONKI itself lists these records as linked (copied as given)
 * temporal-correlation-only — the records happened in the same period; no causation is claimed
 */
export interface ScenarioRelation {
  kind: "nasa-linked-events" | "temporal-correlation-only";
  recordIds: string[];
  statement: T;
}

export interface ScientificScenario {
  id: string;
  category: ScenarioCategory;
  title: T;
  description: T;
  classification: ScenarioClassification;
  observationContext: ObservationContext;
  contextDescription: T;
  source: SourceRef;
  sourceRecords: SourceRecordRef[];
  /** YYYY-MM-DD of the observation (UTC for DONKI; UTC-assumed for RadLab) */
  observationDate: string;
  /** for scenarios that cover several records over a period */
  observationWindow: { start: string; end: string } | null;
  measurements: ScenarioMeasurement[];
  missingMeasurements: MissingMeasurement[];
  dataQuality: DataQuality;
  limitations: T[];
  educationalObjective: T;
  decisionOptions: DecisionOptionEdu[];
  expectedLearningOutcome: T;
  whatIf: WhatIfHook;
  relations: ScenarioRelation[];
}

/** A featured SUHAIL lesson built on top of data scenarios. */
export interface SuhailLesson {
  id: string;
  title: T;
  expression: CompanionExpression;
  suhailIntro: T;
  childExplanation: T;
  challenge: T;
  choices: DecisionOptionEdu[];
  learningObjective: T;
  /** data scenarios (by id) this lesson is built on */
  basedOnScenarioIds: string[];
  /** NASA records the lesson quotes */
  sourceRecordIds: string[];
  classification: ScenarioClassification;
  limitations: T[];
  relations: ScenarioRelation[];
}

export interface ScenarioSet {
  schemaVersion: number;
  generatorVersion: string;
  isLiveData: false;
  notice: T;
  inputs: {
    donki: { file: string; retrievedAt: string; dataVersion: string; events: number };
    radlab: { files: string[]; retrievedAt: string; dataVersion: string; records: Record<string, number> };
  };
  counts: Record<ScenarioCategory, number> & { total: number; lessons: number };
  scenarios: ScientificScenario[];
  lessons: SuhailLesson[];
}

export const t = (ar: string, en: string): T => ({ ar, en });
