// Versioned adapter for the NASA/LOLA illumination sample produced by
// scripts/extract_illumination.py (WP04 / V4.1). Only this module reads the raw file.
import raw from "@/data/nasa/lunar-illumination.json";

export interface ScientificProvenance {
  id: string;
  title: string;
  organization: string;
  url: string;
  fileUrl: string;
  citation: string;
  instrument: string;
  accessDate: string;
}

export interface IlluminationInput {
  /** Long-term average fraction of time the solar disc is visible (0..1). NASA-derived. */
  fraction: number;
  lat: number;
  lon: number;
  temporalMeaning: string;
  provenance: ScientificProvenance;
  context: {
    meanFractionNearby: number;
    craterCentreFraction: number;
    permanentShadowShare: number;
  };
}

export function loadIllumination(data: unknown = raw): IlluminationInput {
  const d = data as typeof raw;
  if (!d?.source?.id || !d.source.url || !d.source.citation) {
    throw new Error("Illumination dataset is missing source metadata");
  }
  const s = d.sample?.selectedSite;
  const f = s?.illuminationFraction;
  if (typeof f !== "number" || Number.isNaN(f) || f < 0 || f > 1) {
    throw new Error(`Invalid illumination fraction: ${f}`);
  }
  if (s.lat > -80 || s.lat < -90) throw new Error(`Site latitude outside south polar product: ${s.lat}`);
  return {
    fraction: f,
    lat: s.lat,
    lon: s.lon,
    temporalMeaning: d.interpretation.temporalMeaning,
    provenance: d.source,
    context: {
      meanFractionNearby: d.sample.windowStats.meanFraction,
      craterCentreFraction: d.sample.windowStats.craterCentreFraction,
      permanentShadowShare: d.sample.windowStats.fractionOfPixelsInPermanentShadow,
    },
  };
}

export const ILLUMINATION = loadIllumination();
