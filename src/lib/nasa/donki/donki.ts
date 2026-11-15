// V6.1 — NASA DONKI offline data: types, validation, normalization and fetching (no gameplay here).
//
// DONKI = Space Weather Database Of Notifications, Knowledge, Information (NASA CCMC), served by https://api.nasa.gov/.
// This module is pure except for `fetchDonki`, which takes an injectable `fetch`. It is used by the offline sync script
// (scripts/nasa/sync-donki.ts) and by the tests. The game never calls NASA at runtime.
//
// SCIENTIFIC RULES (do not relax):
// - Everything under `observed` / `rawEvent` is exactly what NASA reported. Nothing is filled in when NASA left it empty.
// - `derived` holds only mechanical conversions (e.g. the same timestamp in full ISO form). No physics, no doses.
// - These are historical observations made near Earth/the Sun; they are NOT measurements at the fictional SELENE-1 base
//   and NOT live data. No gameplay effect is defined in V6.1.

/* ---------------- types ---------------- */

export const DONKI_EVENT_TYPES = ["CME", "FLR", "SEP"] as const;
export type DONKIEventType = (typeof DONKI_EVENT_TYPES)[number];

export const DONKI_API_BASE = "https://api.nasa.gov/DONKI";
export const DONKI_ENDPOINTS: Record<DONKIEventType, string> = {
  CME: `${DONKI_API_BASE}/CME`,
  FLR: `${DONKI_API_BASE}/FLR`,
  SEP: `${DONKI_API_BASE}/SEP`,
};
export const DONKI_DATA_VERSION = "donki-v1";

/** Fields NASA reports per type: the identifier field and the time that dates the event. */
const ID_FIELD: Record<DONKIEventType, string> = { CME: "activityID", FLR: "flrID", SEP: "sepID" };
const TIME_FIELD: Record<DONKIEventType, string> = { CME: "startTime", FLR: "beginTime", SEP: "eventTime" };

/** Optional fields we look for; absent ones are listed in `dataQuality.missingOptionalFields`, never invented. */
const OPTIONAL_FIELDS: Record<DONKIEventType, string[]> = {
  CME: ["sourceLocation", "instruments", "link", "activeRegionNum", "cmeAnalyses"],
  FLR: ["sourceLocation", "instruments", "link", "activeRegionNum", "classType", "peakTime", "endTime"],
  SEP: ["instruments", "link"], // DONKI SEP records do not carry a solar source location
};

export interface DONKIEvent {
  /** NASA's own identifier (activityID / flrID / sepID), unchanged */
  id: string;
  eventType: DONKIEventType;
  /** NASA's own timestamp string, unchanged (e.g. "2024-05-10T06:54Z") */
  eventDate: string;
  /** solar source location as reported (e.g. "S17W33"), or null when NASA gave none */
  sourceLocation: string | null;
  /** instrument display names as reported (may be empty) */
  instruments: string[];
  /** DONKI web page for the event, or null when absent */
  sourceUrl: string | null;
  /** when our sync retrieved it (ISO, UTC) */
  retrievedAt: string;
  /** observed values copied from NASA, per type (only those present) */
  observed: Record<string, unknown>;
  /** mechanical conversions only */
  derived: { eventDateUtc: string };
  /** the original NASA object, unmodified */
  rawEvent: Record<string, unknown>;
  dataQuality: {
    level: "complete" | "partial";
    missingOptionalFields: string[];
    notes: string[];
    /** "instrument" = only measuring instruments; "model" = only MODEL: sources; "mixed"; "unknown" = no instruments listed */
    basis: "instrument" | "model" | "mixed" | "unknown";
  };
}

/** What each part of a DONKIEvent is (kept in the metadata file too). */
export const FIELD_PROVENANCE = {
  observed: ["id", "eventType", "eventDate", "sourceLocation", "instruments", "sourceUrl", "observed.*", "rawEvent"],
  derived: ["derived.eventDateUtc"],
  retrieval: ["retrievedAt", "dataQuality"],
  simulationAssumptions: [] as string[], // none in V6.1 — gameplay effects come in a later, documented stage
};

export interface RejectedRecord {
  eventType: DONKIEventType;
  id: string | null;
  reason: string;
}

/* ---------------- validation ---------------- */

const DONKI_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?Z$/;

/** A DONKI timestamp ("YYYY-MM-DDTHH:MMZ", seconds optional) that is a real calendar time. Returns the ISO form or null. */
export function parseDonkiTime(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = DONKI_TIME.exec(v.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const ms = Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0);
  const dt = new Date(ms);
  if (Number.isNaN(ms) || dt.getUTCFullYear() !== +y || dt.getUTCMonth() !== +mo - 1 || dt.getUTCDate() !== +d || +h > 23 || +mi > 59 || (s !== undefined && +s > 59)) return null;
  return dt.toISOString();
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export function isValidDate(d: string): boolean {
  if (!ISO_DATE.test(d)) return false;
  const ms = Date.parse(`${d}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === d;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const present = (v: unknown) => v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "") && !(Array.isArray(v) && v.length === 0);

/* ---------------- normalization ---------------- */

export type NormalizeResult = { ok: true; event: DONKIEvent } | { ok: false; rejected: RejectedRecord };

/** Turns one raw NASA record into a DONKIEvent, or rejects it with a reason (never repairs it). */
export function normalizeEvent(eventType: DONKIEventType, raw: unknown, retrievedAt: string): NormalizeResult {
  const reject = (reason: string, id: string | null = null): NormalizeResult => ({ ok: false, rejected: { eventType, id, reason } });
  if (!isObj(raw)) return reject("record is not an object");
  const idRaw = raw[ID_FIELD[eventType]];
  const id = typeof idRaw === "string" && idRaw.trim() ? idRaw.trim() : null;
  if (!id) return reject(`missing required field ${ID_FIELD[eventType]}`);
  const timeRaw = raw[TIME_FIELD[eventType]];
  const utc = parseDonkiTime(timeRaw);
  if (!utc) return reject(`invalid or missing ${TIME_FIELD[eventType]}: ${JSON.stringify(timeRaw ?? null)}`, id);

  const missing = OPTIONAL_FIELDS[eventType].filter((f) => !present(raw[f]));
  const notes: string[] = [];
  const instruments = Array.isArray(raw.instruments)
    ? raw.instruments
        .map((i) => (isObj(i) && typeof i.displayName === "string" ? i.displayName.trim() : null))
        .filter((x): x is string => !!x)
    : [];
  if (Array.isArray(raw.instruments) && instruments.length < raw.instruments.length) notes.push("some instrument entries had no displayName");
  // DONKI also lists model/forecast sources (e.g. "MODEL: REleASE ..."): reported by NASA, but not a direct measurement
  const modelOnly = instruments.length > 0 && instruments.every((i) => /^MODEL\s*:/i.test(i));
  const modelSome = !modelOnly && instruments.some((i) => /^MODEL\s*:/i.test(i));
  if (modelOnly) notes.push("reported through a model/forecast source only (MODEL: …), not a direct instrument measurement");
  else if (modelSome) notes.push("some reporting sources are models/forecasts (MODEL: …)");

  // observed, type-specific values — copied only when NASA provided them
  const keep = (keys: string[]) => Object.fromEntries(keys.filter((k) => present(raw[k])).map((k) => [k, raw[k]]));
  let observed: Record<string, unknown>;
  if (eventType === "FLR") {
    observed = keep(["classType", "beginTime", "peakTime", "endTime", "activeRegionNum", "note"]);
    for (const k of ["peakTime", "endTime"]) if (present(raw[k]) && !parseDonkiTime(raw[k])) notes.push(`${k} is not a valid DONKI timestamp (kept as reported)`);
  } else if (eventType === "CME") {
    observed = keep(["startTime", "activeRegionNum", "note", "catalog"]);
    const analyses = Array.isArray(raw.cmeAnalyses) ? raw.cmeAnalyses.filter(isObj) : [];
    const best = analyses.find((a) => a.isMostAccurate === true);
    if (best) observed.mostAccurateAnalysis = Object.fromEntries(["time21_5", "latitude", "longitude", "halfAngle", "speed", "type"].filter((k) => present(best[k])).map((k) => [k, best[k]]));
    else if (analyses.length) notes.push("no CME analysis is flagged as most accurate");
  } else {
    observed = keep(["eventTime", "note"]);
  }
  if (Array.isArray(raw.linkedEvents)) {
    observed.linkedEventIds = raw.linkedEvents.map((l) => (isObj(l) && typeof l.activityID === "string" ? l.activityID : null)).filter(Boolean);
  }

  return {
    ok: true,
    event: {
      id,
      eventType,
      eventDate: (timeRaw as string).trim(),
      sourceLocation: typeof raw.sourceLocation === "string" && raw.sourceLocation.trim() ? raw.sourceLocation.trim() : null,
      instruments,
      sourceUrl: typeof raw.link === "string" && /^https?:\/\//.test(raw.link) ? raw.link : null,
      retrievedAt,
      observed,
      derived: { eventDateUtc: utc },
      rawEvent: raw,
      dataQuality: {
        level: missing.length ? "partial" : "complete",
        missingOptionalFields: missing,
        notes,
        basis: instruments.length === 0 ? "unknown" : modelOnly ? "model" : modelSome ? "mixed" : "instrument",
      },
    },
  };
}

export interface NormalizedBatch {
  events: DONKIEvent[];
  rejected: RejectedRecord[];
  duplicates: string[];
}

/** Normalizes a whole response; duplicate IDs inside the response are kept once (the first) and listed. */
export function normalizeBatch(eventType: DONKIEventType, raws: unknown[], retrievedAt: string): NormalizedBatch {
  const events: DONKIEvent[] = [];
  const rejected: RejectedRecord[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();
  for (const raw of raws) {
    const r = normalizeEvent(eventType, raw, retrievedAt);
    if (!r.ok) {
      rejected.push(r.rejected);
      continue;
    }
    if (seen.has(r.event.id)) {
      duplicates.push(r.event.id);
      continue;
    }
    seen.add(r.event.id);
    events.push(r.event);
  }
  return { events, rejected, duplicates };
}

/**
 * Merges newly fetched events into the stored set without duplicates. When an ID exists in both, the newer NASA
 * revision wins (higher `versionId`, else later `submissionTime`); otherwise the stored record is kept.
 */
export function mergeEvents(existing: DONKIEvent[], incoming: DONKIEvent[]): { events: DONKIEvent[]; replaced: number; added: number } {
  const byId = new Map(existing.map((e) => [e.id, e]));
  let replaced = 0;
  let added = 0;
  const rev = (e: DONKIEvent) => {
    const v = Number(e.rawEvent.versionId);
    return { v: Number.isFinite(v) ? v : -1, t: typeof e.rawEvent.submissionTime === "string" ? (parseDonkiTime(e.rawEvent.submissionTime) ?? "") : "" };
  };
  for (const e of incoming) {
    const old = byId.get(e.id);
    if (!old) {
      byId.set(e.id, e);
      added++;
      continue;
    }
    const a = rev(old);
    const b = rev(e);
    if (b.v > a.v || (b.v === a.v && b.t > a.t)) {
      byId.set(e.id, e);
      replaced++;
    }
  }
  const events = [...byId.values()].sort((x, y) => x.derived.eventDateUtc.localeCompare(y.derived.eventDateUtc) || x.id.localeCompare(y.id));
  return { events, replaced, added };
}

/* ---------------- fetching ---------------- */

export interface FetchOptions {
  apiKey: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** NASA's rate-limit headers, when present (api.nasa.gov sends X-RateLimit-Remaining; 429 answers carry Retry-After). */
export interface RateLimitInfo {
  remaining: number | null;
  retryAfterSec: number | null;
}

export type FetchResult =
  | { ok: true; httpStatus: number; records: unknown[]; url: string; rateLimit: RateLimitInfo }
  | { ok: false; httpStatus: number | null; error: string; url: string; rateLimit: RateLimitInfo };

const NO_RATE: RateLimitInfo = { remaining: null, retryAfterSec: null };
function rateLimitOf(res: Response): RateLimitInfo {
  const h = (n: string) => {
    const v = res.headers?.get?.(n);
    const x = v == null ? NaN : Number(v);
    return Number.isFinite(x) ? x : null;
  };
  return { remaining: h("X-RateLimit-Remaining"), retryAfterSec: h("Retry-After") };
}

/** The request URL with the key masked — safe to log or store. */
export const maskKey = (url: string) => url.replace(/api_key=[^&]*/, "api_key=***");

/** One DONKI request with a timeout. Never throws; returns a typed error instead. */
export async function fetchDonki(eventType: DONKIEventType, startDate: string, endDate: string, opts: FetchOptions): Promise<FetchResult> {
  const url = `${DONKI_ENDPOINTS[eventType]}?startDate=${startDate}&endDate=${endDate}&api_key=${encodeURIComponent(opts.apiKey)}`;
  const safe = maskKey(url);
  if (!isValidDate(startDate) || !isValidDate(endDate)) return { ok: false, httpStatus: null, error: "invalid date range (expected YYYY-MM-DD)", url: safe, rateLimit: NO_RATE };
  if (startDate > endDate) return { ok: false, httpStatus: null, error: "startDate is after endDate", url: safe, rateLimit: NO_RATE };
  // never let the key leak through an error message
  const redact = (msg: string) => (opts.apiKey && opts.apiKey.length > 3 ? msg.split(opts.apiKey).join("***") : msg);
  const f = opts.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30000);
  try {
    const res = await f(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    const body = await res.text();
    const rateLimit = rateLimitOf(res);
    if (!res.ok) return { ok: false, httpStatus: res.status, error: redact(`HTTP ${res.status}: ${body.slice(0, 200).replace(/\s+/g, " ")}`), url: safe, rateLimit };
    // DONKI answers an empty body (not "[]") when there are no events in the range
    if (body.trim() === "") return { ok: true, httpStatus: res.status, records: [], url: safe, rateLimit };
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return { ok: false, httpStatus: res.status, error: "malformed JSON in response", url: safe, rateLimit };
    }
    if (!Array.isArray(parsed)) return { ok: false, httpStatus: res.status, error: "unexpected response shape (expected an array)", url: safe, rateLimit };
    return { ok: true, httpStatus: res.status, records: parsed, url: safe, rateLimit };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      httpStatus: null,
      error: redact(aborted ? `timeout after ${opts.timeoutMs ?? 30000} ms` : `network error: ${e instanceof Error ? e.message : String(e)}`),
      url: safe,
      rateLimit: NO_RATE,
    };
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- per-type dataset files ---------------- */

/** File name of the per-type dataset, e.g. public/data/donki/sep.json */
export const typeFileName = (t: DONKIEventType) => `${t.toLowerCase()}.json`;

/** How often each optional field is missing in a set of events (for reports; nothing is filled in). */
export function missingFieldSummary(events: DONKIEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) for (const f of e.dataQuality.missingOptionalFields) out[f] = (out[f] ?? 0) + 1;
  return out;
}

export interface TypeDataset {
  file: string;
  endpoint: string;
  retrievedAt: string;
  requestedDateRange: { startDate: string; endDate: string };
  count: number;
  missingOptionalFields: Record<string, number>;
  basis: Record<string, number>;
}

export function typeDatasetSummary(t: DONKIEventType, events: DONKIEvent[], retrievedAt: string, startDate: string, endDate: string): TypeDataset {
  const basis: Record<string, number> = {};
  for (const e of events) basis[e.dataQuality.basis] = (basis[e.dataQuality.basis] ?? 0) + 1;
  return {
    file: `public/data/donki/${typeFileName(t)}`,
    endpoint: DONKI_ENDPOINTS[t],
    retrievedAt,
    requestedDateRange: { startDate, endDate },
    count: events.length,
    missingOptionalFields: missingFieldSummary(events),
    basis,
  };
}

/* ---------------- metadata ---------------- */

export interface TypeReport {
  requestUrl: string;
  ok: boolean;
  httpStatus: number | null;
  error: string | null;
  received: number;
  accepted: number;
  duplicatesInResponse: number;
  rejected: RejectedRecord[];
}

export interface DONKIMetadata {
  schemaVersion: 1;
  dataVersion: string;
  source: {
    name: string;
    provider: string;
    apiBase: string;
    endpoints: Record<DONKIEventType, string>;
    documentation: string[];
  };
  isLiveData: false;
  notice: string;
  retrievedAt: string;
  requestedDateRange: { startDate: string; endDate: string };
  /** every range synced into this dataset so far (merged runs) */
  coveredRanges: { startDate: string; endDate: string; retrievedAt: string }[];
  supportedEventTypes: DONKIEventType[];
  counts: Record<DONKIEventType, number> & { total: number };
  apiKeyType: "NASA_API_KEY" | "DEMO_KEY";
  /** per-type files written from successful downloads (a type keeps its previous entry until a new download succeeds) */
  datasets: Partial<Record<DONKIEventType, TypeDataset>>;
  validation: { status: "valid" | "partial" | "failed"; perType: Record<DONKIEventType, TypeReport> };
  fieldProvenance: typeof FIELD_PROVENANCE;
}

export function validationStatus(per: Record<DONKIEventType, TypeReport>): "valid" | "partial" | "failed" {
  const reports = Object.values(per);
  if (reports.every((r) => !r.ok)) return "failed";
  if (reports.some((r) => !r.ok || r.rejected.length > 0)) return "partial";
  return "valid";
}

export function buildMetadata(args: {
  retrievedAt: string;
  startDate: string;
  endDate: string;
  events: DONKIEvent[];
  perType: Record<DONKIEventType, TypeReport>;
  apiKeyType: "NASA_API_KEY" | "DEMO_KEY";
  previousRanges?: { startDate: string; endDate: string; retrievedAt: string }[];
  datasets?: Partial<Record<DONKIEventType, TypeDataset>>;
}): DONKIMetadata {
  const count = (t: DONKIEventType) => args.events.filter((e) => e.eventType === t).length;
  return {
    schemaVersion: 1,
    dataVersion: DONKI_DATA_VERSION,
    source: {
      name: "NASA DONKI — Space Weather Database Of Notifications, Knowledge, Information",
      provider: "NASA Community Coordinated Modeling Center (CCMC), via api.nasa.gov",
      apiBase: DONKI_API_BASE,
      endpoints: DONKI_ENDPOINTS,
      documentation: ["https://api.nasa.gov/", "https://ccmc.gsfc.nasa.gov/tools/DONKI/"],
    },
    isLiveData: false,
    notice:
      "Historical NASA DONKI records downloaded before gameplay. They describe solar events observed from near Earth; they are not live data and not measurements at the fictional SELENE-1 base. No gameplay effect is defined in this version.",
    retrievedAt: args.retrievedAt,
    requestedDateRange: { startDate: args.startDate, endDate: args.endDate },
    coveredRanges: [...(args.previousRanges ?? []), { startDate: args.startDate, endDate: args.endDate, retrievedAt: args.retrievedAt }],
    supportedEventTypes: [...DONKI_EVENT_TYPES],
    counts: { CME: count("CME"), FLR: count("FLR"), SEP: count("SEP"), total: args.events.length },
    apiKeyType: args.apiKeyType,
    datasets: args.datasets ?? {},
    validation: { status: validationStatus(args.perType), perType: args.perType },
    fieldProvenance: FIELD_PROVENANCE,
  };
}
