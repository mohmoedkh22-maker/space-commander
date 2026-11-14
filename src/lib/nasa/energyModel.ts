// WP04 / V4.2 — simplified, transparent solar energy model.
// SolarEnergy_kWh = RatedPower_kW × Duration_h × IlluminationFraction × PerformanceFactor
// Only IlluminationFraction comes from NASA. Everything else is a labelled game assumption.

export interface SolarSystemConfiguration {
  ratedPowerKW: number; // ASSUMPTION: size of SELENE-1's solar array
  performanceFactor: number; // ASSUMPTION: dust, temperature, wiring losses (0..1)
}

export interface SolarEnergyResult {
  energyKWh: number;
  inputs: { illuminationFraction: number; durationHours: number } & SolarSystemConfiguration;
  formula: string;
}

export const DEFAULT_SOLAR_CONFIG: SolarSystemConfiguration = {
  ratedPowerKW: 10,
  performanceFactor: 0.85,
};

export function calculateSolarEnergy(
  illuminationFraction: number,
  durationHours: number,
  config: SolarSystemConfiguration = DEFAULT_SOLAR_CONFIG,
): SolarEnergyResult {
  if (!Number.isFinite(illuminationFraction) || illuminationFraction < 0 || illuminationFraction > 1) {
    throw new RangeError(`illuminationFraction must be within [0,1], got ${illuminationFraction}`);
  }
  if (!Number.isFinite(durationHours) || durationHours < 0) {
    throw new RangeError(`durationHours must be >= 0, got ${durationHours}`);
  }
  if (!(config.ratedPowerKW > 0)) throw new RangeError("ratedPowerKW must be > 0");
  if (!(config.performanceFactor > 0 && config.performanceFactor <= 1)) {
    throw new RangeError("performanceFactor must be within (0,1]");
  }
  const energyKWh = config.ratedPowerKW * durationHours * illuminationFraction * config.performanceFactor;
  return {
    energyKWh,
    inputs: { illuminationFraction, durationHours, ...config },
    formula: "kWh = kW × h × illumination × performance",
  };
}
