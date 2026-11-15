// WP06.3 — RadLab adapter tests. The rows below are TEST FIXTURES shaped like RadLab's pandas "split" JSON;
// they are not shipped and are not NASA measurements.
import { describe, expect, it, vi } from "vitest";
import {
  buildMetadata,
  buildRadLabUrl,
  dateChunks,
  datasetFileNames,
  fetchRadLab,
  fieldStats,
  medianCadenceSec,
  nextDay,
  overallStatus,
  parseRadLabTimestamp,
  parseSplitJson,
  RADLAB_SOURCES,
  SCIENTIFIC_LIMITATIONS,
  validateRow,
  validateRows,
  type InstrumentReport,
} from "./radlab";

const COLS = ["timestamp", "instrument_id", "absorbed_dose_rate", "celestial_body", "dose_equivalent_rate", "flux", "spacecraft", "trajectory"];
const crater = (ts: string, dose: number | null, extra: Partial<Record<string, unknown>> = {}) => ({
  timestamp: ts,
  instrument_id: "CRaTER-D1D2",
  absorbed_dose_rate: dose,
  celestial_body: "Moon",
  dose_equivalent_rate: null,
  flux: null,
  spacecraft: "LRO",
  trajectory: "Lunar orbit",
  ...extra,
});
const split = (rows: Record<string, unknown>[], cols = COLS) => JSON.stringify({ columns: cols, index: rows.map((_, i) => i), data: rows.map((r) => cols.map((c) => r[c])) });
const S = "2024-05-01";
const E = "2024-05-31";

describe("WP06.3 — pandas split JSON parsing", () => {
  it("maps rows to columns without changing any value", () => {
    const r = parseSplitJson(split([crater("2024-05-10T00:59:58", 19.075000000000003)]));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.table.columns).toEqual(COLS);
      expect(r.table.rows[0]).toEqual(crater("2024-05-10T00:59:58", 19.075000000000003));
    }
  });
  it("an empty result is a valid, empty table", () => {
    const r = parseSplitJson('{"columns":["timestamp","instrument_id","absorbed_dose_rate"],"index":[],"data":[]}');
    expect(r).toMatchObject({ ok: true, table: { rows: [] } });
  });
  it("rejects malformed JSON and wrong shapes with a reason", () => {
    expect(parseSplitJson("{not json")).toEqual({ ok: false, error: "malformed JSON in response" });
    expect(parseSplitJson("[1,2]")).toMatchObject({ ok: false, error: expect.stringMatching(/object/) });
    expect(parseSplitJson('{"data":[]}')).toMatchObject({ ok: false, error: expect.stringMatching(/columns/) });
    expect(parseSplitJson('{"columns":["a"]}')).toMatchObject({ ok: false, error: expect.stringMatching(/data/) });
    expect(parseSplitJson('{"columns":["a","b"],"index":[0],"data":[[1]]}')).toMatchObject({ ok: false, error: expect.stringMatching(/one value per column/) });
    expect(parseSplitJson('{"columns":["a"],"index":[0,1],"data":[[1]]}')).toMatchObject({ ok: false, error: expect.stringMatching(/index/) });
    expect(parseSplitJson('{"columns":["a","a"],"data":[]}')).toMatchObject({ ok: false, error: expect.stringMatching(/duplicate/) });
  });
});

describe("WP06.3 — timestamps", () => {
  it("accepts RadLab's format, keeps the original, and only ASSUMES UTC in the derived field", () => {
    expect(parseRadLabTimestamp("2024-05-10T00:59:58")).toEqual({ original: "2024-05-10T00:59:58", utcAssumed: "2024-05-10T00:59:58.000Z" });
    expect(parseRadLabTimestamp("2024-05-10T00:59")?.utcAssumed).toBe("2024-05-10T00:59:00.000Z");
  });
  it("rejects other formats, impossible calendar times and timezone-bearing values", () => {
    for (const bad of ["2024-02-30T00:00:00", "2024-05-10T24:00:00", "2024-05-10 00:00:00", "2024-05-10t00:00:00", "2024-05-10T00:00:00Z", "2024-05-10T00:00:00+02:00", "", null, 1715299198])
      expect(parseRadLabTimestamp(bad)).toBeNull();
  });
});

describe("WP06.3 — row validation", () => {
  it("keeps values, instrument ID and timestamp exactly; nulls stay null", () => {
    const r = validateRow(crater("2024-05-10T00:59:58", 19.075000000000003), "CRaTER-D1D2", S, E);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.record).toMatchObject({ instrumentId: "CRaTER-D1D2", timestamp: "2024-05-10T00:59:58", absorbed_dose_rate: 19.075000000000003, dose_equivalent_rate: null, flux: null });
      expect(r.record.notReturned).toEqual([]);
      expect(r.record.qualityFlags).toEqual(["timezone_assumed_utc"]);
      expect(r.record.context).toMatchObject({ spacecraft: "LRO", trajectory: "Lunar orbit", celestial_body: "Moon" });
    }
  });
  it("never derives equivalent dose: a missing dose_equivalent_rate stays null", () => {
    const r = validateRow(crater("2024-05-10T01:00:00", 25), "CRaTER-D1D2", S, E);
    if (r.ok) expect(r.record.dose_equivalent_rate).toBeNull();
  });
  it("a column RadLab did not return is null AND listed as not returned (not confused with a NASA null)", () => {
    const row = crater("2024-05-10T01:00:00", 25);
    delete (row as Record<string, unknown>).flux;
    const r = validateRow(row, "CRaTER-D1D2", S, E);
    if (r.ok) {
      expect(r.record.flux).toBeNull();
      expect(r.record.notReturned).toEqual(["flux"]);
    }
  });
  it("a zero reading is kept as 0 and flagged — never treated as 'no radiation'", () => {
    const r = validateRow({ timestamp: "2024-05-10T00:00:00", instrument_id: "BPD", absorbed_dose_rate: 0, spacecraft: "BioSentinel", trajectory: "Heliocentric orbit at 1 AU" }, "BPD", S, E);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.record.absorbed_dose_rate).toBe(0);
      expect(r.record.qualityFlags).toContain("zero_value");
    }
  });
  it("rejects (with the raw row and a reason) bad IDs, provenance, numbers and ranges", () => {
    const cases: [Record<string, unknown>, RegExp][] = [
      [crater("2024-05-10T00:00:00", 5, { instrument_id: undefined }), /missing instrument_id/],
      [crater("2024-05-10T00:00:00", 5, { instrument_id: "crater-d1d2" }), /unexpected instrument_id/], // IDs are case-sensitive
      [crater("2024-05-10T00:00:00", 5, { instrument_id: "BPD" }), /unexpected instrument_id/],
      [crater("not-a-time", 5), /invalid timestamp/],
      [crater("2024-06-01T00:00:00", 5), /outside the requested range/],
      [crater("2024-05-10T00:00:00", "5" as unknown as number), /non-numeric/],
      [crater("2024-05-10T00:00:00", Number.NaN), /non-numeric/],
      [crater("2024-05-10T00:00:00", -1), /negative/],
      [crater("2024-05-10T00:00:00", 5, { trajectory: "Moon surface" }), /trajectory/], // never relabel orbit as surface
      [crater("2024-05-10T00:00:00", 5, { spacecraft: "ISS" }), /spacecraft/], // never accept ISS rows as lunar
      [crater("2024-05-10T00:00:00", 5, { spacecraft: 7 }), /non-text/],
    ];
    for (const [row, reason] of cases) {
      const r = validateRow(row, "CRaTER-D1D2", S, E);
      expect(r.ok, String(reason)).toBe(false);
      if (!r.ok) {
        expect(r.rejected.reason).toMatch(reason);
        expect(r.rejected.raw).toBe(row);
      }
    }
  });
});

describe("WP06.3 — duplicates", () => {
  it("identical repeats are kept once; conflicting repeats keep the first and record the dropped raw row", () => {
    const a = crater("2024-05-10T01:00:00", 20);
    const b = crater("2024-05-10T00:00:00", 10);
    const conflict = crater("2024-05-10T01:00:00", 99);
    const batch = validateRows([a, b, { ...a }, conflict], "CRaTER-D1D2", S, E);
    expect(batch.records.map((r) => [r.timestamp, r.absorbed_dose_rate])).toEqual([
      ["2024-05-10T00:00:00", 10],
      ["2024-05-10T01:00:00", 20],
    ]);
    expect(batch.duplicates.filter((d) => d.kind === "identical")).toHaveLength(1);
    const c = batch.duplicates.find((d) => d.kind === "conflicting");
    expect(c?.dropped).toBe(conflict);
  });
});

describe("WP06.3 — requests", () => {
  it("builds a read-only key-value query with an inclusive end date", () => {
    const u = buildRadLabUrl("CRaTER-D1D2", "2024-05-01", "2024-05-07");
    expect(u).toBe(
      "https://visualization.osdr.nasa.gov/radlab/api/?instrument_id=CRaTER-D1D2&timestamp%3E=2024-05-01&timestamp%3C2024-05-08" +
        "&absorbed_dose_rate&dose_equivalent_rate&flux&spacecraft&trajectory&celestial_body&instrument&instrument_family&format=json",
    );
    expect(u).not.toMatch(/api_key/);
    expect(nextDay("2024-05-31")).toBe("2024-06-01");
    expect(nextDay("2024-02-28")).toBe("2024-02-29");
  });
  it("splits a range into inclusive chunks that cover every day exactly once", () => {
    expect(dateChunks("2024-05-01", "2024-05-31", 7)).toEqual([
      { startDate: "2024-05-01", endDate: "2024-05-07" },
      { startDate: "2024-05-08", endDate: "2024-05-14" },
      { startDate: "2024-05-15", endDate: "2024-05-21" },
      { startDate: "2024-05-22", endDate: "2024-05-28" },
      { startDate: "2024-05-29", endDate: "2024-05-31" },
    ]);
    expect(dateChunks("2024-05-10", "2024-05-10", 7)).toEqual([{ startDate: "2024-05-10", endDate: "2024-05-10" }]);
  });

  const res = (status: number, body: string) => ({ ok: status >= 200 && status < 300, status, text: async () => body }) as unknown as Response;
  const fake = (r: Response | Error) => vi.fn(async () => (r instanceof Error ? Promise.reject(r) : r)) as unknown as typeof fetch;

  it("successful response → parsed table plus the exact raw text", async () => {
    const body = split([crater("2024-05-10T00:59:58", 19.075000000000003)]);
    const r = await fetchRadLab("CRaTER-D1D2", S, E, { fetchImpl: fake(res(200, body)) });
    expect(r).toMatchObject({ ok: true, httpStatus: 200 });
    if (r.ok) {
      expect(r.rawText).toBe(body);
      expect(r.table.rows).toHaveLength(1);
    }
  });
  it("failed requests are reported, never thrown (RadLab HTML errors, network, timeout, malformed body, bad range)", async () => {
    const html = "<h3>500: Something Went Wrong</h3><pre><b>Error:</b> No columns specified</pre>";
    expect(await fetchRadLab("BPD", S, E, { fetchImpl: fake(res(500, html)) })).toMatchObject({ ok: false, httpStatus: 500, error: "HTTP 500: 500: Something Went Wrong Error: No columns specified" });
    expect(await fetchRadLab("BPD", S, E, { fetchImpl: fake(res(404, "nope")) })).toMatchObject({ ok: false, httpStatus: 404 });
    expect(await fetchRadLab("BPD", S, E, { fetchImpl: fake(new TypeError("fetch failed")) })).toMatchObject({ ok: false, httpStatus: null, error: expect.stringMatching(/network/) });
    expect(await fetchRadLab("BPD", S, E, { fetchImpl: fake(res(200, "<html>oops</html>")) })).toMatchObject({ ok: false, error: "malformed JSON in response" });
    expect(await fetchRadLab("BPD", S, E, { fetchImpl: fake(res(200, '{"columns":["a"],"data":[[1,2]]}')) })).toMatchObject({ ok: false, error: expect.stringMatching(/one value per column/) });
    const never = vi.fn((_u: string, init?: RequestInit) => new Promise<Response>((_, rej) => init?.signal?.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))))) as unknown as typeof fetch;
    expect(await fetchRadLab("BPD", S, E, { fetchImpl: never, timeoutMs: 5 })).toMatchObject({ ok: false, error: "timeout after 5 ms" });
    const f = fake(res(200, "{}"));
    expect(await fetchRadLab("BPD", "2024-05-31", "2024-05-01", { fetchImpl: f })).toMatchObject({ ok: false, error: expect.stringMatching(/after/) });
    expect(await fetchRadLab("BPD", "2024-13-01", E, { fetchImpl: f })).toMatchObject({ ok: false, error: expect.stringMatching(/invalid date/) });
    expect(f).not.toHaveBeenCalled();
  });
});

describe("WP06.3 — statistics are descriptive only", () => {
  it("counts nulls, not-returned columns and zeros separately; no fills", () => {
    const rows = [
      crater("2024-05-10T00:00:00", 0),
      crater("2024-05-10T01:00:00", null),
      crater("2024-05-10T02:00:00", 30),
    ];
    const recs = validateRows(rows, "CRaTER-D1D2", S, E).records;
    const s = fieldStats(recs);
    expect(s.absorbed_dose_rate).toEqual({ nonNull: 2, nulls: 1, notReturned: 0, zeros: 1, min: 0, max: 30 });
    expect(s.flux).toMatchObject({ nonNull: 0, nulls: 3 });
    expect(medianCadenceSec(recs)).toBe(3600);
  });
});

describe("WP06.3 — sources and metadata", () => {
  it("approves exactly CRaTER-D1D2 (lunar ORBIT) and BPD (heliocentric 1 AU)", () => {
    expect(Object.keys(RADLAB_SOURCES)).toEqual(["CRaTER-D1D2", "BPD"]);
    expect(RADLAB_SOURCES["CRaTER-D1D2"]).toMatchObject({ spacecraft: "LRO", trajectory: "Lunar orbit", role: "primary" });
    expect(RADLAB_SOURCES.BPD).toMatchObject({ spacecraft: "BioSentinel", trajectory: "Heliocentric orbit at 1 AU", role: "secondary" });
    expect(datasetFileNames("CRaTER-D1D2")).toEqual({ records: "crater-d1d2.json", raw: "raw/crater-d1d2.raw.json" });
  });

  const report = (ok: boolean, extra: Partial<InstrumentReport> = {}): InstrumentReport => ({
    instrumentId: "CRaTER-D1D2",
    spacecraft: "LRO",
    trajectory: "Lunar orbit",
    role: "primary",
    ok,
    written: ok,
    error: ok ? null : "x",
    requests: [],
    received: 0,
    accepted: 0,
    rejected: [],
    duplicates: { identical: 0, conflicting: [] },
    firstTimestamp: null,
    lastTimestamp: null,
    medianCadenceSec: null,
    fields: null,
    files: null,
    keptPrevious: null,
    ...extra,
  });

  it("status: valid / partial / failed", () => {
    expect(overallStatus([report(true), report(true)])).toBe("valid");
    expect(overallStatus([report(true), report(false)])).toBe("partial");
    expect(overallStatus([report(true, { rejected: [{ instrumentId: null, timestamp: null, reason: "x", raw: {} }] })])).toBe("partial");
    expect(overallStatus([report(false), report(false)])).toBe("failed");
    expect(overallStatus([])).toBe("failed");
  });
  it("metadata states source, retrieval time, range, units, uncertainty and limits; never claims live data", () => {
    const m = buildMetadata({ retrievedAt: "2026-11-15T12:00:00.000Z", startDate: S, endDate: E, instruments: { "CRaTER-D1D2": report(true) } });
    expect(m).toMatchObject({ isLiveData: false, retrievedAt: "2026-11-15T12:00:00.000Z", requestedDateRange: { startDate: S, endDate: E } });
    expect(m.source.api).toBe("https://visualization.osdr.nasa.gov/radlab/api/");
    expect(m.source.authentication).toMatch(/no key/);
    expect(m.units.absorbed_dose_rate.unit).toBe("μGy/hour");
    expect(m.timestampConvention.timezone).toMatch(/UNCONFIRMED/);
    expect(m.detectorMaterial["CRaTER-D1D2"]).toMatchObject({ value: null, status: expect.stringMatching(/unknown/) });
    expect(m.relationToDonki).toMatch(/correlation, not causation/);
    const lim = SCIENTIFIC_LIMITATIONS.join(" ");
    expect(lim).toMatch(/not lunar-surface/);
    expect(lim).toMatch(/not an astronaut/);
    expect(lim).toMatch(/No equivalent dose is derived/);
    expect(lim).toMatch(/never interpreted as zero radiation/);
    expect(m.notice).toMatch(/not live/);
  });
});
