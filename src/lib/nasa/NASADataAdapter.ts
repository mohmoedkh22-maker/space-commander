// V0.5 — NASA SCIENCE INTEGRATION
// NASADataAdapter: the only module that reads the day-by-day NASA SVS illumination dataset.
//
//   SOURCE-DERIVED  : sunlitFraction per UTC day at the SELENE-1 site (NASA SVS 4930, 2026),
//                     extracted by scripts/extract_svs_illumination.py + build_svs_dataset.py
//   FALLBACK        : the LOLA 18.6-year average at the same site (illumination.ts), used only
//                     when a day is missing or the dataset fails validation, and always flagged
//   NOT IN HERE     : panel size, performance, loads — those are game assumptions (config.ts)
//
// Pure TypeScript: no React, no I/O at runtime (the JSON is bundled), no randomness.
import svsRaw from "@/data/nasa/svs-4930-selene1-2026.json";
import { ILLUMINATION } from "./illumination";

export type LightSource = "nasa-svs-4930" | "fallback-lola-average";

export interface DailyLight {
  /** ISO date (UTC), e.g. 2026-03-14 */
  date: string;
  /** share of the day the site is sunlit, 0..1 */
  sunlitFraction: number;
  source: LightSource;
}

export interface SvsProvenance {
  id: string;
  title: string;
  organization: string;
  url: string;
  framesUrl: string;
  credits: string;
  dataUsed: string[];
  relatedProduct: { id: string; title: string; url: string; whyNotSampled: string };
  accessDate: string;
}

export interface SvsDataset {
  schemaVersion: 1;
  source: SvsProvenance;
  observationContext: string;
  site: { name: string; lat: number; lon: number };
  method: {
    script: string;
    frames: number;
    timeStepHours: number;
    firstFrameUtc: string;
    lastFrameUtc: string;
    timeCheck: string;
    projection: string;
    sampleBlockPx: number;
    litThreshold: number;
    variable: string;
  };
  validation: {
    annualSunlitFraction: number;
    lolaLongTermFractionSameSite: number;
    thresholdSensitivity: Record<string, number>;
    controlShackletonFloorSunlitFraction: number;
    longestShadowHours: number;
  };
  limitations: string[];
  daily: { start: string; stepDays: 1; sunlitFraction: (number | null)[] };
}

export class NASADataError extends Error {}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isFrac = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;

/** Parses an ISO date as UTC midnight; throws on anything else. */
export function parseIsoDate(date: string): number {
  if (!ISO_DATE.test(date)) throw new NASADataError(`Invalid date "${date}" (expected YYYY-MM-DD)`);
  const ms = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
  if (new Date(ms).toISOString().slice(0, 10) !== date) throw new NASADataError(`Invalid calendar date "${date}"`);
  return ms;
}

export const addDays = (date: string, n: number) => new Date(parseIsoDate(date) + n * DAY_MS).toISOString().slice(0, 10);

/** Validates the schema of the bundled (or any supplied) dataset. Throws NASADataError with the first problem. */
export function parseSvsDataset(raw: unknown): SvsDataset {
  if (!isObj(raw)) throw new NASADataError("Dataset is not an object");
  if (raw.schemaVersion !== 1) throw new NASADataError(`Unsupported schemaVersion ${String(raw.schemaVersion)}`);
  const src = raw.source;
  if (!isObj(src) || !isStr(src.id) || !isStr(src.url) || !isStr(src.title) || !isStr(src.accessDate)) {
    throw new NASADataError("Dataset is missing source metadata (id, title, url, accessDate)");
  }
  if (!String(src.url).startsWith("https://svs.gsfc.nasa.gov/")) throw new NASADataError("Source URL is not a NASA SVS page");
  const site = raw.site;
  if (!isObj(site) || typeof site.lat !== "number" || typeof site.lon !== "number") throw new NASADataError("Dataset site is missing");
  if (site.lat > -88 || site.lat < -90) throw new NASADataError(`Site latitude ${site.lat} is outside the SVS 4930 field (88°S–90°S)`);
  const m = raw.method;
  if (!isObj(m) || m.timeStepHours !== 2 || typeof m.litThreshold !== "number") throw new NASADataError("Dataset method is missing or unexpected");
  const v = raw.validation;
  if (!isObj(v) || !isFrac(v.annualSunlitFraction)) throw new NASADataError("Dataset validation block is missing");
  if (!Array.isArray(raw.limitations) || raw.limitations.length === 0) throw new NASADataError("Dataset must list its limitations");
  const d = raw.daily;
  if (!isObj(d) || !isStr(d.start) || d.stepDays !== 1 || !Array.isArray(d.sunlitFraction)) {
    throw new NASADataError("Dataset daily series is missing");
  }
  parseIsoDate(d.start);
  if (d.sunlitFraction.length === 0) throw new NASADataError("Dataset daily series is empty");
  d.sunlitFraction.forEach((x, i) => {
    if (x !== null && !isFrac(x)) throw new NASADataError(`Day ${i}: sunlit fraction ${String(x)} is outside 0..1`);
  });
  return raw as unknown as SvsDataset;
}

export class NASADataAdapter {
  readonly dataset: SvsDataset | null;
  /** why the dataset could not be used (null when it loaded fine) */
  readonly loadError: string | null;
  readonly fallbackFraction: number;
  private readonly startMs: number;

  constructor(raw: unknown, fallbackFraction: number = ILLUMINATION.fraction) {
    if (!isFrac(fallbackFraction)) throw new NASADataError(`Invalid fallback fraction ${fallbackFraction}`);
    this.fallbackFraction = fallbackFraction;
    let ds: SvsDataset | null = null;
    let err: string | null = null;
    try {
      ds = parseSvsDataset(raw);
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }
    this.dataset = ds;
    this.loadError = err;
    this.startMs = ds ? parseIsoDate(ds.daily.start) : 0;
  }

  get available(): boolean {
    return this.dataset !== null;
  }

  /** First and last date covered by the dataset (null if unavailable). */
  get coverage(): { first: string; last: string } | null {
    if (!this.dataset) return null;
    const n = this.dataset.daily.sunlitFraction.length;
    return { first: this.dataset.daily.start, last: addDays(this.dataset.daily.start, n - 1) };
  }

  /** Light for one UTC day. Missing or out-of-range days fall back to the LOLA average and say so. */
  day(date: string): DailyLight {
    const ms = parseIsoDate(date);
    if (this.dataset) {
      const i = Math.round((ms - this.startMs) / DAY_MS);
      const v = this.dataset.daily.sunlitFraction[i];
      if (i >= 0 && isFrac(v)) return { date, sunlitFraction: v, source: "nasa-svs-4930" };
    }
    return { date, sunlitFraction: this.fallbackFraction, source: "fallback-lola-average" };
  }

  /** n consecutive days from start. */
  window(start: string, n: number): DailyLight[] {
    if (!Number.isInteger(n) || n < 1) throw new NASADataError(`Window length must be a positive integer, got ${n}`);
    return Array.from({ length: n }, (_, k) => this.day(addDays(start, k)));
  }

  /** Mean sunlit fraction over a window. */
  static mean(days: DailyLight[]): number {
    return days.reduce((a, d) => a + d.sunlitFraction, 0) / days.length;
  }

  /** Rolling 7-day windows that start inside the dataset, with their mean light. */
  weeks(): { start: string; mean: number }[] {
    if (!this.dataset) return [];
    const n = this.dataset.daily.sunlitFraction.length;
    const out: { start: string; mean: number }[] = [];
    for (let i = 0; i + 7 <= n; i++) {
      const w = this.window(addDays(this.dataset.daily.start, i), 7);
      if (w.every((d) => d.source === "nasa-svs-4930")) out.push({ start: w[0].date, mean: NASADataAdapter.mean(w) });
    }
    return out;
  }

  /** The brightest and darkest real weeks of the dataset (first one wins on ties). */
  extremeWeeks(): { brightest: { start: string; mean: number }; darkest: { start: string; mean: number } } | null {
    const w = this.weeks();
    if (w.length === 0) return null;
    let b = w[0];
    let d = w[0];
    for (const x of w) {
      if (x.mean > b.mean) b = x;
      if (x.mean < d.mean) d = x;
    }
    return { brightest: b, darkest: d };
  }

  /** Mean of all available days. */
  annualMean(): number | null {
    if (!this.dataset) return null;
    const vals = this.dataset.daily.sunlitFraction.filter(isFrac);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
}

/** The adapter the game uses: verified static data bundled with the app (works offline, no live API). */
export const NASA_DATA = new NASADataAdapter(svsRaw);
