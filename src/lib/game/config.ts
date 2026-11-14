// GAME ASSUMPTIONS (educational, configurable): none of these numbers are NASA measurements.
// The only NASA-derived input is the illumination fraction in src/lib/nasa/illumination.ts.
// Documented in docs/simulation-assumptions.md. Pending review by the team's NASA Data Lead.
import type { ResourceId } from "./types";

export const BATTERY_CAP_KWH = 300;
export const WATER_CAP_L = 600;

/** Every resource has a hard minimum and maximum; the engine never stores values outside them. */
export const RESOURCE_LIMITS: Record<ResourceId, { min: number; max: number; unit: string }> = {
  energy: { min: 0, max: BATTERY_CAP_KWH, unit: "kWh" },
  water: { min: 0, max: WATER_CAP_L, unit: "L" },
  oxygen: { min: 0, max: 100, unit: "%" },
  food: { min: 0, max: 100, unit: "%" },
};

export const START = {
  resources: { energy: 240, water: 400, oxygen: 98, food: 20 },
  performanceFactor: 0.85,
  recyclerEfficiency: 0.9,
};

export const SOLAR_RATED_KW = 10;

/** Daily electrical loads in kWh. */
export const LOADS = {
  lifeSupport: 70,
  recycler: 25,
  recyclerBoostExtra: 20,
  greenhouse: { full: 55, reduced: 25, minimal: 10 },
  research: 30,
  shelter: 15,
  repair: 35,
};

/** Water in litres per day (4 crew). */
export const WATER = {
  crewUse: 40,
  crewUseRationed: 30,
  greenhouseNet: { full: 15, reduced: 8, minimal: 3 },
  boostEfficiencyGain: 0.15,
  faultEfficiency: 0.6,
  repairedEfficiency: 0.9,
};

export const CROP_GROWTH = { full: 15, reduced: 8, minimal: 3 };

/** Thresholds used by prerequisites, facility conditions and SUHAIL's dialogue. */
export const THRESHOLDS = {
  boostMinEnergy: 150,
  repairMinEnergy: 100,
  fullOpsMinEnergy: 150,
  fullOpsMinWater: 300,
  /** below 50 % (150 kWh) the power station reports a low reserve — same level that locks the recycler boost */
  lowReserveFraction: 0.5,
  lowEnergy: 150,
  goodEnergy: 180,
  lowWater: 250,
};

/**
 * FICTIONAL training-scenario shading factor applied to the NASA long-term average.
 * The NASA product is an 18.6-year average, not a forecast; this curve only creates
 * the story's "vanishing sun" period and is labelled as an assumption in the UI.
 */
export const SCENARIO_LIGHT_FACTOR: Record<number, number> = {
  1: 1.0,
  2: 0.4,
  3: 0.55,
  4: 0.75,
  5: 0.7,
  6: 0.7,
  7: 0.85,
};

export const ENDING_RULES = {
  accomplished: { minResearch: 4, minFood: 60, minEnergy: 40, minWater: 250 },
  interrupted: { maxShortfallDays: 1, minWater: 150 },
};
