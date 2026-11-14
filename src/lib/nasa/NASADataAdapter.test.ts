import { describe, expect, it } from "vitest";
import raw from "@/data/nasa/svs-4930-selene1-2026.json";
import { MISSION_CALENDAR, SOLAR_RATED_KW, START } from "@/lib/game/config";
import { missionDayLight, simulate, solarForDay } from "@/lib/game/engine";
import { calculateSolarEnergy } from "./energyModel";
import { ILLUMINATION } from "./illumination";
import { addDays, NASA_DATA, NASADataAdapter, NASADataError, parseIsoDate, parseSvsDataset } from "./NASADataAdapter";

const clone = () => structuredClone(raw) as unknown as Record<string, unknown> & { daily: { sunlitFraction: (number | null)[] } };

describe("V0.5 NASA SVS dataset — loading and schema", () => {
  it("loads the bundled SVS 4930 dataset with full provenance", () => {
    expect(NASA_DATA.available).toBe(true);
    expect(NASA_DATA.loadError).toBeNull();
    const ds = NASA_DATA.dataset!;
    expect(ds.source.id).toBe("SVS-4930");
    expect(ds.source.url).toBe("https://svs.gsfc.nasa.gov/4930/");
    expect(ds.source.relatedProduct.url).toBe("https://svs.gsfc.nasa.gov/5027/");
    expect(ds.source.accessDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ds.limitations.length).toBeGreaterThanOrEqual(3);
  });
  it("covers every day of 2026 at the same site as the LOLA sample", () => {
    expect(NASA_DATA.coverage).toEqual({ first: "2026-01-01", last: "2026-12-31" });
    const ds = NASA_DATA.dataset!;
    expect(ds.daily.sunlitFraction).toHaveLength(365);
    expect(ds.method.frames).toBe(365 * 12);
    expect(ds.site.lat).toBeCloseTo(ILLUMINATION.lat, 4);
    expect(ds.site.lon).toBeCloseTo(ILLUMINATION.lon, 3);
    for (const v of ds.daily.sunlitFraction) {
      expect(v).not.toBeNull();
      // 12 frames per day -> multiples of 1/12
      expect(Math.abs(v! * 12 - Math.round(v! * 12))).toBeLessThan(0.01);
    }
  });
  it("passes its own scientific sanity checks", () => {
    const v = NASA_DATA.dataset!.validation;
    // the permanently shadowed crater floor is never lit
    expect(v.controlShackletonFloorSunlitFraction).toBe(0);
    // the 2026 value at the site is in the same range as the 18.6-year LOLA average
    expect(Math.abs(v.annualSunlitFraction - v.lolaLongTermFractionSameSite)).toBeLessThan(0.15);
    expect(NASA_DATA.annualMean()).toBeCloseTo(v.annualSunlitFraction, 3);
  });
});

describe("V0.5 input validation", () => {
  it("rejects unsourced, out-of-range or malformed data", () => {
    const noSource = clone();
    delete noSource.source;
    expect(() => parseSvsDataset(noSource)).toThrow(/source/);
    const notSvs = clone();
    (notSvs.source as Record<string, unknown>).url = "https://example.com/data";
    expect(() => parseSvsDataset(notSvs)).toThrow(/SVS/);
    const tooBright = clone();
    tooBright.daily.sunlitFraction[3] = 1.2;
    expect(() => parseSvsDataset(tooBright)).toThrow(/Day 3/);
    const nan = clone();
    nan.daily.sunlitFraction[0] = Number.NaN;
    expect(() => parseSvsDataset(nan)).toThrow(NASADataError);
    const badSite = clone();
    (badSite.site as Record<string, unknown>).lat = -85;
    expect(() => parseSvsDataset(badSite)).toThrow(/latitude/);
    const noLimits = clone();
    noLimits.limitations = [];
    expect(() => parseSvsDataset(noLimits)).toThrow(/limitations/);
    expect(() => parseSvsDataset(null)).toThrow(NASADataError);
    expect(() => parseSvsDataset({ ...clone(), schemaVersion: 2 })).toThrow(/schemaVersion/);
  });
  it("validates dates and window lengths", () => {
    expect(() => parseIsoDate("2026-02-30")).toThrow(NASADataError);
    expect(() => parseIsoDate("14/11/2026")).toThrow(NASADataError);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(() => NASA_DATA.window("2026-03-01", 0)).toThrow(NASADataError);
    expect(() => new NASADataAdapter(raw, 1.5)).toThrow(NASADataError);
  });
});

describe("V0.5 missing-data handling", () => {
  it("falls back to the labelled LOLA average for a missing day, and only that day", () => {
    const gap = clone();
    gap.daily.sunlitFraction[10] = null;
    const a = new NASADataAdapter(gap);
    expect(a.available).toBe(true);
    expect(a.day("2026-01-11")).toEqual({ date: "2026-01-11", sunlitFraction: ILLUMINATION.fraction, source: "fallback-lola-average" });
    expect(a.day("2026-01-12").source).toBe("nasa-svs-4930");
  });
  it("falls back outside the covered year", () => {
    expect(NASA_DATA.day("2025-12-31").source).toBe("fallback-lola-average");
    expect(NASA_DATA.day("2027-01-01").source).toBe("fallback-lola-average");
  });
  it("keeps the game playable when the whole dataset is invalid", () => {
    const broken = new NASADataAdapter({ hello: "world" });
    expect(broken.available).toBe(false);
    expect(broken.loadError).toMatch(/schemaVersion/);
    expect(broken.window("2026-03-01", 7).every((d) => d.source === "fallback-lola-average")).toBe(true);
    expect(broken.weeks()).toEqual([]);
    expect(broken.extremeWeeks()).toBeNull();
    expect(broken.annualMean()).toBeNull();
  });
});

describe("V0.5 calculations — NASA light drives the game's energy", () => {
  it("each mission day reads its real 2026 date from the dataset", () => {
    for (let d = 1; d <= 7; d++) {
      const light = missionDayLight(d);
      expect(light.date).toBe(addDays(MISSION_CALENDAR.startDate, d - 1));
      expect(light.source).toBe("nasa-svs-4930");
      expect(light.sunlitFraction).toBe(NASA_DATA.day(light.date).sunlitFraction);
    }
  });
  it("solar energy = rated kW × 24 h × NASA sunlit fraction × performance", () => {
    for (let d = 1; d <= 7; d++) {
      const f = missionDayLight(d).sunlitFraction;
      expect(solarForDay(d, START.performanceFactor).energyKWh).toBeCloseTo(SOLAR_RATED_KW * 24 * f * START.performanceFactor, 9);
      expect(solarForDay(d, START.performanceFactor).energyKWh).toBe(
        calculateSolarEnergy(f, 24, { ratedPowerKW: SOLAR_RATED_KW, performanceFactor: START.performanceFactor }).energyKWh,
      );
    }
  });
  it("the simulation's day log records the NASA value, its date and its source", () => {
    const s = simulate({ "d1-energy": "balance", "d2-water": "repair", "d3-emergency": "essential" }).state;
    expect(s.log).toHaveLength(7);
    s.log.forEach((l, i) => {
      const light = missionDayLight(i + 1);
      expect(l.sunlitFraction).toBe(light.sunlitFraction);
      expect(l.lightDate).toBe(light.date);
      expect(l.lightSource).toBe("nasa-svs-4930");
    });
  });
  it("the mission week is real data and has the story's light dip on day 2", () => {
    const w = NASA_DATA.window(MISSION_CALENDAR.startDate, 7);
    expect(w[1].sunlitFraction).toBeLessThan(w[0].sunlitFraction);
    expect(solarForDay(2, START.performanceFactor).energyKWh).toBeLessThan(solarForDay(1, START.performanceFactor).energyKWh);
  });
  it("brightest and darkest weeks are found in the data, not invented", () => {
    const x = NASA_DATA.extremeWeeks()!;
    expect(x.brightest.mean).toBeGreaterThan(x.darkest.mean);
    expect(NASADataAdapter.mean(NASA_DATA.window(x.brightest.start, 7))).toBeCloseTo(x.brightest.mean, 9);
    const mission = NASADataAdapter.mean(NASA_DATA.window(MISSION_CALENDAR.startDate, 7));
    expect(mission).toBeLessThanOrEqual(x.brightest.mean);
    expect(mission).toBeGreaterThanOrEqual(x.darkest.mean);
  });
});

describe("V0.5 reproducible outcomes", () => {
  it("same input data gives identical results", () => {
    const a = new NASADataAdapter(structuredClone(raw));
    const b = new NASADataAdapter(structuredClone(raw));
    expect(a.window("2026-01-01", 365)).toEqual(b.window("2026-01-01", 365));
    expect(a.extremeWeeks()).toEqual(b.extremeWeeks());
    const path = { "d1-energy": "save-energy", "d2-water": "boost", "d3-emergency": "full-ops" } as const;
    expect(simulate(path).state).toEqual(simulate(path).state);
  });
  it("the adapter never mutates the bundled data", () => {
    const before = JSON.stringify(raw);
    NASA_DATA.window("2026-01-01", 365);
    NASA_DATA.extremeWeeks();
    expect(JSON.stringify(raw)).toBe(before);
  });
});
