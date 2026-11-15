// WP06.3 — NASA OSDR RadLab offline data adapter.
//
// Pure, deterministic helpers for a *pre-build* sync. Nothing here runs during gameplay and the game never calls RadLab.
// This module is independent of the DONKI adapter: the two sources are stored separately and their raw records are never combined.
//
// Scientific rules enforced here (see docs/nasa/RADLAB-DATA.md):
//   - values, timestamps and instrument IDs are kept exactly as NASA returned them; nulls stay null
//   - a zero reading is flagged, never read as "zero radiation"
//   - absorbed dose is never converted to equivalent dose or to an astronaut/biological dose
//   - lunar-ORBIT measurements are never described as lunar-SURFACE measurements
//   - units come only from the RadLab documentation; detector materials are NOT stated by the API and are left unknown

export const RADLAB_API_BASE = "https://visualization.osdr.nasa.gov/radlab/api/";
export const RADLAB_DOCS_URL = "https://visualization.osdr.nasa.gov/radlab/gui/data-api/";
/** The live documentation answered HTTP 500 when this adapter was written; units were read from this archived copy. */
export const RADLAB_DOCS_ARCHIVE_URL =
  "http://web.archive.org/web/20240522074550/https://visualization.osdr.nasa.gov/radlab/gui/data-api/";
export const RADLAB_DATA_VERSION = "radlab-v1";

/* ---------------- approved sources ---------------- */

export interface RadLabSource {
  instrumentId: string;
  /** what RadLab reports for this instrument (checked against every returned row when present) */
  spacecraft: string;
  trajectory: string;
  celestialBody: string;
  role: "primary" | "secondary";
  description: string;
}

/** WP06.3 approves exactly these two sources. */
export const RADLAB_SOURCES: Record<string, RadLabSource> = {
  "CRaTER-D1D2": {
    instrumentId: "CRaTER-D1D2",
    spacecraft: "LRO",
    trajectory: "Lunar orbit",
    celestialBody: "Moon",
    role: "primary",
    description: "LRO / CRaTER detector pair D1-D2. Historical measurements in LUNAR ORBIT (not on the lunar surface).",
  },
  BPD: {
    instrumentId: "BPD",
    spacecraft: "BioSentinel",
    trajectory: "Heliocentric orbit at 1 AU",
    celestialBody: "Sun",
    role: "secondary",
    description: "BioSentinel / BPD. Deep-space comparison measurements in heliocentric orbit at about 1 AU (not near the Moon).",
  },
};
export const RADLAB_INSTRUMENT_IDS = Object.keys(RADLAB_SOURCES);

/* ---------------- measurements and units ---------------- */

export const MEASUREMENT_FIELDS = ["absorbed_dose_rate", "dose_equivalent_rate", "flux"] as const;
export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number];

/** Units exactly as written in the RadLab Data API documentation. The API response itself carries no units. */
export const MEASUREMENT_UNITS: Record<MeasurementField, { unit: string; meaning: string; source: string }> = {
  absorbed_dose_rate: {
    unit: "μGy/hour",
    meaning: "Absorbed radiation dose rate as reported by the detector (in the detector's own material, which the API does not state)",
    source: RADLAB_DOCS_ARCHIVE_URL,
  },
  dose_equivalent_rate: {
    unit: "μSv/hour",
    meaning: "Dose equivalent rate, only where the instrument itself reports it. Never derived from absorbed dose here",
    source: RADLAB_DOCS_ARCHIVE_URL,
  },
  flux: { unit: "cm^-2 sr^-1 s^-1", meaning: "Particle flux, only where the instrument reports it", source: RADLAB_DOCS_ARCHIVE_URL },
};

/** Context columns requested alongside the measurements (provenance, never altered). */
export const CONTEXT_FIELDS = ["spacecraft", "trajectory", "celestial_body", "instrument", "instrument_family"] as const;

/* ---------------- dates and timestamps ---------------- */

export function isValidDate(d: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return false;
  const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return t.getUTCFullYear() === +m[1] && t.getUTCMonth() === +m[2] - 1 && t.getUTCDate() === +m[3];
}

/** The day after an inclusive end date: RadLab's upper bound is sent as `timestamp<nextDay`. */
export function nextDay(d: string): string {
  return new Date(Date.parse(`${d}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
}

/**
 * RadLab timestamps look like "2024-05-10T00:59:58": ISO 8601 with NO timezone designator.
 * Returns the same instant read as UTC (an assumption, flagged everywhere it is used), or null if the value is not a real
 * calendar time in that format. A timestamp that carries its own offset or "Z" is rejected, because it would not match
 * the documented format and would need different handling.
 */
export function parseRadLabTimestamp(v: unknown): { original: string; utcAssumed: string } | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,6})?)?$/.exec(v);
  if (!m) return null;
  const [Y, M, D, h, mi, s] = m.slice(1, 7).map((x) => (x === undefined ? 0 : Number(x)));
  if (h > 23 || mi > 59 || s > 59) return null;
  const t = new Date(Date.UTC(Y, M - 1, D, h, mi, s, m[7] ? Math.round(Number(m[7]) * 1000) : 0));
  if (t.getUTCFullYear() !== Y || t.getUTCMonth() !== M - 1 || t.getUTCDate() !== D) return null;
  return { original: v, utcAssumed: t.toISOString() };
}

/* ---------------- pandas "split" JSON ---------------- */

export interface SplitTable {
  columns: string[];
  rows: Record<string, unknown>[];
}

export type ParseResult = { ok: true; table: SplitTable } | { ok: false; error: string };

/**
 * Safely parse RadLab's JSON output, which is pandas' "split" orientation: {"columns":[...],"index":[...],"data":[[...]]}.
 * Every row must have exactly one value per column. Nothing is coerced: values are copied as-is.
 */
export function parseSplitJson(text: string): ParseResult {
  let j: unknown;
  try {
    j = JSON.parse(text);
  } catch {
    return { ok: false, error: "malformed JSON in response" };
  }
  if (!j || typeof j !== "object" || Array.isArray(j)) return { ok: false, error: "unexpected response shape (expected an object)" };
  const o = j as Record<string, unknown>;
  if (!Array.isArray(o.columns) || !o.columns.every((c) => typeof c === "string")) return { ok: false, error: "missing or invalid 'columns'" };
  if (!Array.isArray(o.data)) return { ok: false, error: "missing or invalid 'data'" };
  if (o.index !== undefined && (!Array.isArray(o.index) || o.index.length !== o.data.length)) {
    return { ok: false, error: "'index' length does not match 'data'" };
  }
  const columns = o.columns as string[];
  if (new Set(columns).size !== columns.length) return { ok: false, error: "duplicate column names" };
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < o.data.length; i++) {
    const r = o.data[i];
    if (!Array.isArray(r) || r.length !== columns.length) return { ok: false, error: `row ${i} does not have one value per column` };
    const obj: Record<string, unknown> = {};
    columns.forEach((c, k) => (obj[c] = r[k]));
    rows.push(obj);
  }
  return { ok: true, table: { columns, rows } };
}

/* ---------------- records and validation ---------------- */

export type QualityFlag =
  | "zero_value" // a measurement is exactly 0: may be a real low reading, a dropout or a processing artefact; NOT "no radiation"
  | "timezone_assumed_utc"; // the source timestamp has no timezone designator

export interface RadLabRecord {
  instrumentId: string; // exactly as returned
  timestamp: string; // exactly as returned (no timezone)
  /** derived: the same timestamp read as UTC. ASSUMPTION: RadLab does not state the timezone */
  timestampUtcAssumed: string;
  /** measurements exactly as returned; null when NASA returned null; null when the column was not returned (see `notReturned`) */
  absorbed_dose_rate: number | null;
  dose_equivalent_rate: number | null;
  flux: number | null;
  notReturned: MeasurementField[];
  context: Partial<Record<(typeof CONTEXT_FIELDS)[number], string | null>>;
  qualityFlags: QualityFlag[];
}

export interface RejectedRow {
  instrumentId: string | null;
  timestamp: unknown;
  reason: string;
  raw: Record<string, unknown>;
}

export type RowResult = { ok: true; record: RadLabRecord } | { ok: false; rejected: RejectedRow };

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Validate one row against the instrument that was requested and the requested range [startDate, endDate] (inclusive days).
 * Rejections keep the raw row and a reason. Nothing is repaired or filled in.
 */
export function validateRow(row: Record<string, unknown>, expectedInstrumentId: string, startDate: string, endDate: string): RowResult {
  const id = typeof row.instrument_id === "string" ? row.instrument_id : null;
  const reject = (reason: string): RowResult => ({ ok: false, rejected: { instrumentId: id, timestamp: row.timestamp, reason, raw: row } });

  if (!id) return reject("missing instrument_id");
  // instrument IDs are case-sensitive in RadLab: compare exactly
  if (id !== expectedInstrumentId) return reject(`unexpected instrument_id (requested ${expectedInstrumentId})`);
  const ts = parseRadLabTimestamp(row.timestamp);
  if (!ts) return reject("invalid timestamp (expected YYYY-MM-DDTHH:MM[:SS] without timezone)");
  if (ts.original.slice(0, 10) < startDate || ts.original.slice(0, 10) > endDate) return reject("timestamp outside the requested range");

  const src = RADLAB_SOURCES[expectedInstrumentId];
  const context: RadLabRecord["context"] = {};
  for (const f of CONTEXT_FIELDS) {
    if (!(f in row)) continue;
    const v = row[f];
    if (v !== null && typeof v !== "string") return reject(`non-text value in '${f}'`);
    context[f] = v as string | null;
  }
  // provenance must match the approved source; anything else means we would mislabel where the measurement was taken
  if (src) {
    if (context.spacecraft != null && context.spacecraft !== src.spacecraft) return reject(`spacecraft '${context.spacecraft}' does not match ${src.spacecraft}`);
    if (context.trajectory != null && context.trajectory !== src.trajectory) return reject(`trajectory '${context.trajectory}' does not match ${src.trajectory}`);
  }

  const values = {} as Record<MeasurementField, number | null>;
  const notReturned: MeasurementField[] = [];
  const flags: QualityFlag[] = ["timezone_assumed_utc"];
  for (const f of MEASUREMENT_FIELDS) {
    if (!(f in row)) {
      values[f] = null;
      notReturned.push(f);
      continue;
    }
    const v = row[f];
    if (v === null) {
      values[f] = null;
      continue;
    }
    if (!isNum(v)) return reject(`non-numeric value in '${f}'`);
    if (v < 0) return reject(`negative value in '${f}' (physically invalid for a rate)`);
    if (v === 0 && !flags.includes("zero_value")) flags.push("zero_value");
    values[f] = v;
  }

  return {
    ok: true,
    record: {
      instrumentId: id,
      timestamp: ts.original,
      timestampUtcAssumed: ts.utcAssumed,
      ...values,
      notReturned,
      context,
      qualityFlags: flags,
    },
  };
}

export interface DuplicateInfo {
  instrumentId: string;
  timestamp: string;
  kind: "identical" | "conflicting";
  /** for "conflicting": the raw row that was NOT kept (the first occurrence is kept) */
  dropped?: Record<string, unknown>;
}

export interface ValidatedBatch {
  records: RadLabRecord[];
  rejected: RejectedRow[];
  duplicates: DuplicateInfo[];
}

const sameValues = (a: RadLabRecord, b: RadLabRecord) => MEASUREMENT_FIELDS.every((f) => a[f] === b[f]);

/** Validate every row; de-duplicate on (instrumentId, timestamp). Output is sorted by timestamp. */
export function validateRows(rows: Record<string, unknown>[], expectedInstrumentId: string, startDate: string, endDate: string): ValidatedBatch {
  const byKey = new Map<string, RadLabRecord>();
  const rejected: RejectedRow[] = [];
  const duplicates: DuplicateInfo[] = [];
  for (const row of rows) {
    const r = validateRow(row, expectedInstrumentId, startDate, endDate);
    if (!r.ok) {
      rejected.push(r.rejected);
      continue;
    }
    const key = `${r.record.instrumentId}|${r.record.timestamp}`;
    const prev = byKey.get(key);
    if (!prev) byKey.set(key, r.record);
    else if (sameValues(prev, r.record)) duplicates.push({ instrumentId: r.record.instrumentId, timestamp: r.record.timestamp, kind: "identical" });
    else duplicates.push({ instrumentId: r.record.instrumentId, timestamp: r.record.timestamp, kind: "conflicting", dropped: row });
  }
  const records = [...byKey.values()].sort((a, b) => (a.timestampUtcAssumed < b.timestampUtcAssumed ? -1 : a.timestampUtcAssumed > b.timestampUtcAssumed ? 1 : 0));
  return { records, rejected, duplicates };
}

/* ---------------- request ---------------- */

/** Date chunks [start, end] (inclusive days) of at most `chunkDays` days, to keep each request small. */
export function dateChunks(startDate: string, endDate: string, chunkDays: number): { startDate: string; endDate: string }[] {
  const out: { startDate: string; endDate: string }[] = [];
  const step = Math.max(1, Math.floor(chunkDays));
  let s = startDate;
  while (s <= endDate) {
    let e = s;
    for (let i = 1; i < step && e < endDate; i++) e = nextDay(e);
    out.push({ startDate: s, endDate: e });
    s = nextDay(e);
  }
  return out;
}

/** Key-value syntax of the RadLab API; the end date is inclusive (sent as `timestamp<nextDay`). */
export function buildRadLabUrl(instrumentId: string, startDate: string, endDate: string): string {
  const parts = [
    `instrument_id=${encodeURIComponent(instrumentId)}`,
    `timestamp%3E=${startDate}`,
    `timestamp%3C${nextDay(endDate)}`,
    ...MEASUREMENT_FIELDS,
    ...CONTEXT_FIELDS,
    "format=json",
  ];
  return `${RADLAB_API_BASE}?${parts.join("&")}`;
}

export interface FetchOptions {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export type FetchResult =
  | { ok: true; httpStatus: number; url: string; rawText: string; table: SplitTable }
  | { ok: false; httpStatus: number | null; url: string; error: string };

/** RadLab reports errors as small HTML pages ("500: Something Went Wrong … Error: …"); keep only readable text. */
function errorText(body: string): string {
  return body
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/** Read-only GET. Never throws: HTTP errors, network errors, timeouts and malformed bodies are returned as failures. */
export async function fetchRadLab(instrumentId: string, startDate: string, endDate: string, opts: FetchOptions = {}): Promise<FetchResult> {
  const url = buildRadLabUrl(instrumentId, startDate, endDate);
  if (!isValidDate(startDate) || !isValidDate(endDate)) return { ok: false, httpStatus: null, url, error: "invalid date range (expected YYYY-MM-DD)" };
  if (startDate > endDate) return { ok: false, httpStatus: null, url, error: "startDate is after endDate" };
  const f = opts.fetchImpl ?? fetch;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 120000);
  try {
    const res = await f(url, { signal: ctl.signal, headers: { Accept: "application/json" } });
    const body = await res.text();
    if (!res.ok) return { ok: false, httpStatus: res.status, url, error: `HTTP ${res.status}: ${errorText(body)}` };
    const parsed = parseSplitJson(body);
    if (!parsed.ok) return { ok: false, httpStatus: res.status, url, error: parsed.error };
    return { ok: true, httpStatus: res.status, url, rawText: body, table: parsed.table };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      httpStatus: null,
      url,
      error: aborted ? `timeout after ${opts.timeoutMs ?? 120000} ms` : `network error: ${e instanceof Error ? e.message : String(e)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- statistics (descriptive only: no conversions, no fills) ---------------- */

export interface FieldStats {
  nonNull: number;
  nulls: number;
  notReturned: number;
  zeros: number;
  min: number | null;
  max: number | null;
}

export function fieldStats(records: RadLabRecord[]): Record<MeasurementField, FieldStats> {
  const out = {} as Record<MeasurementField, FieldStats>;
  for (const f of MEASUREMENT_FIELDS) {
    const s: FieldStats = { nonNull: 0, nulls: 0, notReturned: 0, zeros: 0, min: null, max: null };
    for (const r of records) {
      if (r.notReturned.includes(f)) s.notReturned++;
      const v = r[f];
      if (v === null) {
        if (!r.notReturned.includes(f)) s.nulls++;
        continue;
      }
      s.nonNull++;
      if (v === 0) s.zeros++;
      s.min = s.min === null ? v : Math.min(s.min, v);
      s.max = s.max === null ? v : Math.max(s.max, v);
    }
    out[f] = s;
  }
  return out;
}

/** Median spacing between consecutive records, in seconds (descriptive; the source cadence is not documented per instrument). */
export function medianCadenceSec(records: RadLabRecord[]): number | null {
  const t = records.map((r) => Date.parse(r.timestampUtcAssumed));
  const gaps: number[] = [];
  for (let i = 1; i < t.length; i++) if (t[i] > t[i - 1]) gaps.push((t[i] - t[i - 1]) / 1000);
  if (!gaps.length) return null;
  gaps.sort((a, b) => a - b);
  return gaps[gaps.length >> 1];
}

/* ---------------- metadata ---------------- */

export interface InstrumentReport {
  instrumentId: string;
  spacecraft: string;
  trajectory: string;
  role: "primary" | "secondary";
  ok: boolean;
  /** true when this run wrote new files for the instrument; false when a previous dataset (if any) was kept */
  written: boolean;
  error: string | null;
  requests: { url: string; startDate: string; endDate: string; httpStatus: number | null; rows: number | null; error: string | null }[];
  received: number;
  accepted: number;
  rejected: RejectedRow[];
  duplicates: { identical: number; conflicting: DuplicateInfo[] };
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  medianCadenceSec: number | null;
  fields: Record<MeasurementField, FieldStats> | null;
  files: { records: string; raw: string } | null;
  /** set when this run failed for the instrument and an earlier validated dataset was left in place */
  keptPrevious: { retrievedAt: string; accepted: number; requestedDateRange: { startDate: string; endDate: string } } | null;
}

export const SCIENTIFIC_LIMITATIONS = [
  "CRaTER-D1D2 data are measurements in LUNAR ORBIT aboard LRO. They are not lunar-surface measurements and are not measurements at the fictional SELENE-1 base.",
  "BPD data are measurements aboard BioSentinel in heliocentric orbit at about 1 AU. They are not measurements near the Moon.",
  "absorbed_dose_rate is the absorbed dose rate reported by each detector. It is not an astronaut, tissue or biological dose, and no conversion is applied.",
  "No equivalent dose is derived from absorbed dose. dose_equivalent_rate is stored only where RadLab returns it (null otherwise).",
  "Detector materials are not stated by the RadLab API, and the RadLab knowledgebase was unavailable (HTTP 500) at retrieval. They are recorded as unknown.",
  "RadLab timestamps carry no timezone designator. They are kept exactly as returned; timestampUtcAssumed reads them as UTC, which is an assumption.",
  "Units come from the RadLab Data API documentation (archived copy, 2024-05-22). The API responses themselves carry no units.",
  "A reading of exactly 0 is flagged (zero_value). It may be a real low reading, a data dropout or a processing artefact, and is never interpreted as zero radiation.",
  "Null values are preserved as null. Missing values are never interpolated or filled.",
  "Values are historical and cached. They must never be presented as current or live space weather.",
  "Any comparison with NASA DONKI events is a temporal correlation only. No causation is claimed, and RadLab and DONKI records are stored separately.",
];

export interface RadLabMetadata {
  schemaVersion: 1;
  dataVersion: string;
  source: {
    name: string;
    provider: string;
    api: string;
    documentation: string;
    documentationArchive: string;
    requestSyntax: string;
    authentication: string;
  };
  isLiveData: false;
  notice: string;
  retrievedAt: string;
  requestedDateRange: { startDate: string; endDate: string };
  timestampConvention: { asReturned: string; derived: string; timezone: string };
  units: typeof MEASUREMENT_UNITS;
  detectorMaterial: Record<string, { value: null; status: string }>;
  instruments: Record<string, InstrumentReport>;
  validation: { status: "valid" | "partial" | "failed"; rule: string };
  scientificLimitations: string[];
  relationToDonki: string;
}

export function overallStatus(reports: InstrumentReport[]): "valid" | "partial" | "failed" {
  if (!reports.length || reports.every((r) => !r.ok)) return "failed";
  if (reports.some((r) => !r.ok || r.rejected.length > 0 || r.duplicates.conflicting.length > 0)) return "partial";
  return "valid";
}

export function buildMetadata(args: {
  retrievedAt: string;
  startDate: string;
  endDate: string;
  instruments: Record<string, InstrumentReport>;
}): RadLabMetadata {
  const ids = Object.keys(args.instruments);
  return {
    schemaVersion: 1,
    dataVersion: RADLAB_DATA_VERSION,
    source: {
      name: "NASA OSDR RadLab",
      provider: "NASA Open Science Data Repository (OSDR), NASA Ames Research Center",
      api: RADLAB_API_BASE,
      documentation: RADLAB_DOCS_URL,
      documentationArchive: RADLAB_DOCS_ARCHIVE_URL,
      requestSyntax: "GET key-value syntax: instrument_id=<id>&timestamp>=<start>&timestamp<<end+1 day>&<fields>&format=json (pandas 'split' JSON)",
      authentication: "none (public API, no key)",
    },
    isLiveData: false,
    notice:
      "Historical NASA RadLab measurements cached for offline use (not live). CRaTER-D1D2 = lunar orbit (not the lunar surface); BPD = heliocentric orbit at 1 AU. Absorbed dose in the detector, not a biological dose.",
    retrievedAt: args.retrievedAt,
    requestedDateRange: { startDate: args.startDate, endDate: args.endDate },
    timestampConvention: {
      asReturned: "timestamp: exactly as returned by RadLab, e.g. 2024-05-10T00:59:58 (no timezone designator)",
      derived: "timestampUtcAssumed: the same value read as UTC",
      timezone: "UNCONFIRMED. RadLab does not state the timezone; UTC is assumed for the derived field only.",
    },
    units: MEASUREMENT_UNITS,
    detectorMaterial: Object.fromEntries(
      ids.map((id) => [id, { value: null, status: "unknown: not stated by the RadLab API; RadLab knowledgebase unavailable (HTTP 500) at retrieval" }]),
    ),
    instruments: args.instruments,
    validation: {
      status: overallStatus(Object.values(args.instruments)),
      rule: "valid = every instrument retrieved with no rejected rows and no conflicting duplicates; partial = some failure or rejection; failed = nothing retrieved",
    },
    scientificLimitations: SCIENTIFIC_LIMITATIONS,
    relationToDonki:
      "Separate source dataset (public/data/donki/). Raw records are never combined. Any future temporal association must be labelled as correlation, not causation.",
  };
}

/** File names for an instrument's normalized records and its raw responses. */
export function datasetFileNames(instrumentId: string): { records: string; raw: string } {
  const slug = instrumentId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return { records: `${slug}.json`, raw: `raw/${slug}.raw.json` };
}
