// GAME ASSUMPTIONS: none of these numbers are NASA measurements.
// The only NASA-derived input is the illumination fraction in src/lib/nasa/illumination.ts.

export const BATTERY_CAP_KWH = 300;
export const WATER_CAP_L = 600;

export const START = {
  batteryKWh: 240,
  waterL: 400,
  oxygenPct: 98,
  cropPct: 20,
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
  inspection: 10,
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
  accomplished: { minResearch: 4, minCrop: 60, minBattery: 40, minWater: 250 },
  interrupted: { maxShortfallDays: 1, minWater: 150 },
};

