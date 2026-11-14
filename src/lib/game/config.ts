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
 * GAME PARAMETER (V0.5): which real 2026 week the 7 mission days are mapped to.
 * The choice of week is a design decision; the light on each of those days is NOT —
 * it is read from NASA SVS 4930 through src/lib/nasa/NASADataAdapter.ts.
 */
export const MISSION_CALENDAR = {
  startDate: "2026-05-29",
  reason: {
    ar: "اخترنا أسبوعًا حقيقيًا (29 مايو – 4 يونيو 2026) يقلّ فيه ضوء الشمس عن موقعنا يومًا بعد يوم (58% ثم 50% ثم 33%) ثم يعود — تمامًا كما في قصة «الشمس التي تختفي». اختيار الأسبوع قرار تصميم، أما الضوء في كل يوم فهو من بيانات ناسا.",
    en: "We picked a real week (29 May – 4 June 2026) in which sunlight at our site fades day after day (58%, then 50%, then 33%) and then returns — just like the “Vanishing Sun” story. Choosing the week is a design decision; the light on each day is NASA data.",
  },
};

export const ENDING_RULES = {
  accomplished: { minResearch: 4, minFood: 60, minEnergy: 40, minWater: 250 },
  interrupted: { maxShortfallDays: 1, minWater: 150 },
};
