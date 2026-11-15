// V6.1 — DONKI validation tests. The records below are TEST FIXTURES shaped like the documented DONKI responses;
// they are not shipped and are not NASA data.
import { describe, expect, it, vi } from "vitest";
import {
  buildMetadata,
  fetchDonki,
  FIELD_PROVENANCE,
  maskKey,
  mergeEvents,
  missingFieldSummary,
  normalizeBatch,
  normalizeEvent,
  parseDonkiTime,
  typeDatasetSummary,
  typeFileName,
  validationStatus,
  type DONKIEventType,
  type TypeReport,
} from "./donki";

const AT = "2026-11-15T10:00:00.000Z";

const CME = {
  activityID: "2024-05-10T06:36:00-CME-001",
  catalog: "M2M_CATALOG",
  startTime: "2024-05-10T06:36Z",
  sourceLocation: "S17W33",
  activeRegionNum: 13664,
  link: "https://webtools.ccmc.gsfc.nasa.gov/DONKI/view/CME/00001/-1",
  note: "fixture",
  instruments: [{ displayName: "SOHO: LASCO/C2" }, { displayName: "SOHO: LASCO/C3" }],
  cmeAnalyses: [
    { isMostAccurate: false, speed: 900, type: "C" },
    { isMostAccurate: true, time21_5: "2024-05-10T08:20Z", latitude: -15, longitude: 25, halfAngle: 45, speed: 1200, type: "O" },
  ],
  linkedEvents: [{ activityID: "2024-05-10T06:27:00-FLR-001" }],
  submissionTime: "2024-05-10T09:00Z",
  versionId: 1,
};
const FLR = {
  flrID: "2024-05-10T06:27:00-FLR-001",
  instruments: [{ displayName: "GOES-P: EXIS 1.0-8.0" }],
  beginTime: "2024-05-10T06:27Z",
  peakTime: "2024-05-10T06:54Z",
  endTime: "2024-05-10T07:06Z",
  classType: "X3.9",
  sourceLocation: "S17W29",
  activeRegionNum: 13664,
  link: "https://webtools.ccmc.gsfc.nasa.gov/DONKI/view/FLR/00002/-1",
  submissionTime: "2024-05-10T07:30Z",
  versionId: 1,
};
const SEP = {
  sepID: "2024-05-11T02:25:00-SEP-001",
  eventTime: "2024-05-11T02:25Z",
  instruments: [{ displayName: "GOES-P: SEISS >10MeV" }],
  link: "https://webtools.ccmc.gsfc.nasa.gov/DONKI/view/SEP/00003/-1",
  linkedEvents: [{ activityID: "2024-05-10T06:36:00-CME-001" }],
  submissionTime: "2024-05-11T03:00Z",
  versionId: 2,
};

const okEvent = (t: DONKIEventType, raw: unknown) => {
  const r = normalizeEvent(t, raw, AT);
  if (!r.ok) throw new Error(r.rejected.reason);
  return r.event;
};

describe("V6.1 — valid records are normalized and traceable", () => {
  it("CME: id, original timestamp, location, instruments, link and the most-accurate analysis are kept as reported", () => {
    const e = okEvent("CME", CME);
    expect(e).toMatchObject({
      id: CME.activityID,
      eventType: "CME",
      eventDate: "2024-05-10T06:36Z",
      sourceLocation: "S17W33",
      instruments: ["SOHO: LASCO/C2", "SOHO: LASCO/C3"],
      sourceUrl: CME.link,
      retrievedAt: AT,
      derived: { eventDateUtc: "2024-05-10T06:36:00.000Z" },
    });
    expect(e.observed.mostAccurateAnalysis).toEqual({ time21_5: "2024-05-10T08:20Z", latitude: -15, longitude: 25, halfAngle: 45, speed: 1200, type: "O" });
    expect(e.observed.linkedEventIds).toEqual(["2024-05-10T06:27:00-FLR-001"]);
    expect(e.rawEvent).toBe(CME); // original payload preserved
    expect(e.dataQuality.level).toBe("complete");
  });
  it("FLR: class and times are copied, not converted into anything else", () => {
    const e = okEvent("FLR", FLR);
    expect(e.id).toBe(FLR.flrID);
    expect(e.eventDate).toBe("2024-05-10T06:27Z");
    expect(e.observed).toMatchObject({ classType: "X3.9", peakTime: "2024-05-10T06:54Z", endTime: "2024-05-10T07:06Z" });
    // no dose or derived physics is ever produced
    expect(Object.keys(e.derived)).toEqual(["eventDateUtc"]);
    expect(JSON.stringify(e)).not.toMatch(/dose|sievert|gray|mSv/i);
  });
  it("SEP: no source location in DONKI → null, flagged as missing (never invented)", () => {
    const e = okEvent("SEP", SEP);
    expect(e.id).toBe(SEP.sepID);
    expect(e.sourceLocation).toBeNull();
    expect(e.eventDate).toBe("2024-05-11T02:25Z");
    expect(e.dataQuality.level).toBe("complete"); // location is not an expected SEP field
  });
});

describe("V6.1 — model-based records are not presented as measurements", () => {
  it("flags MODEL: sources", () => {
    expect(okEvent("SEP", SEP).dataQuality.basis).toBe("instrument");
    const model = okEvent("SEP", { ...SEP, instruments: [{ displayName: "MODEL: REleASE:ACE/EPAM 15.8-39.8 MeV" }] });
    expect(model.dataQuality.basis).toBe("model");
    expect(model.dataQuality.notes.join(" ")).toMatch(/not a direct instrument measurement/);
    const mixed = okEvent("SEP", { ...SEP, instruments: [{ displayName: "GOES-P: SEISS >10MeV" }, { displayName: "MODEL: SEPMOD" }] });
    expect(mixed.dataQuality.basis).toBe("mixed");
    expect(okEvent("FLR", { flrID: "a", beginTime: "2024-05-12T00:00Z" }).dataQuality.basis).toBe("unknown");
  });
});

describe("V6.1 — missing optional fields", () => {
  it("are left empty and listed, never filled in", () => {
    const bare = { flrID: "2024-05-12T00:00:00-FLR-009", beginTime: "2024-05-12T00:00Z" };
    const e = okEvent("FLR", bare);
    expect(e.sourceLocation).toBeNull();
    expect(e.instruments).toEqual([]);
    expect(e.sourceUrl).toBeNull();
    expect(e.observed.classType).toBeUndefined();
    expect(e.dataQuality.level).toBe("partial");
    expect(e.dataQuality.missingOptionalFields).toEqual(expect.arrayContaining(["sourceLocation", "instruments", "link", "classType", "peakTime", "endTime"]));
  });
  it("empty strings and empty lists count as missing; a non-http link is not used as a source URL", () => {
    const e = okEvent("CME", { ...CME, sourceLocation: "  ", instruments: [], link: "javascript:alert(1)" });
    expect(e.sourceLocation).toBeNull();
    expect(e.sourceUrl).toBeNull();
    expect(e.dataQuality.missingOptionalFields).toEqual(expect.arrayContaining(["sourceLocation", "instruments"]));
  });
});

describe("V6.1 — invalid timestamps and malformed records are rejected with a reason", () => {
  it("rejects bad or missing times", () => {
    for (const bad of ["2024-13-10T06:36Z", "2024-02-30T06:36Z", "2024-05-10 06:36", "2024-05-10T25:00Z", "yesterday", "", null, 1715322960]) {
      const r = normalizeEvent("CME", { ...CME, startTime: bad }, AT);
      expect(r.ok, String(bad)).toBe(false);
      if (!r.ok) expect(r.rejected.reason).toMatch(/startTime/);
    }
    const noTime = normalizeEvent("SEP", { sepID: "x" }, AT);
    expect(noTime.ok).toBe(false);
  });
  it("accepts the DONKI forms with and without seconds", () => {
    expect(parseDonkiTime("2024-05-10T06:36Z")).toBe("2024-05-10T06:36:00.000Z");
    expect(parseDonkiTime("2024-05-10T06:36:15Z")).toBe("2024-05-10T06:36:15.000Z");
    expect(parseDonkiTime("2024-05-10T06:36:15.5Z")).toBe("2024-05-10T06:36:15.000Z");
  });
  it("rejects records without the NASA id or that are not objects", () => {
    const { activityID: _drop, ...noId } = CME;
    void _drop;
    expect(normalizeEvent("CME", noId, AT)).toMatchObject({ ok: false, rejected: { reason: expect.stringMatching(/activityID/) } });
    expect(normalizeEvent("FLR", "not an object", AT).ok).toBe(false);
    expect(normalizeEvent("FLR", null, AT).ok).toBe(false);
  });
});

describe("V6.1 — duplicates", () => {
  it("duplicate IDs inside one response are kept once and reported", () => {
    const b = normalizeBatch("FLR", [FLR, { ...FLR }, { flrID: "bad" }], AT);
    expect(b.events).toHaveLength(1);
    expect(b.duplicates).toEqual([FLR.flrID]);
    expect(b.rejected).toHaveLength(1);
  });
  it("merging with stored data never duplicates; a newer NASA revision replaces the old one", () => {
    const v1 = okEvent("SEP", SEP);
    const v1again = okEvent("SEP", { ...SEP });
    const v3 = okEvent("SEP", { ...SEP, versionId: 3, note: "revised" });
    const flr = okEvent("FLR", FLR);
    let m = mergeEvents([v1], [v1again, flr]);
    expect(m.events.map((e) => e.id)).toEqual([FLR.flrID, SEP.sepID]); // sorted by time
    expect(m).toMatchObject({ added: 1, replaced: 0 });
    m = mergeEvents(m.events, [v3]);
    expect(m.events).toHaveLength(2);
    expect(m.replaced).toBe(1);
    expect(m.events.find((e) => e.id === SEP.sepID)!.rawEvent.versionId).toBe(3);
  });
});

describe("V6.1 — fetching: empty responses and failures", () => {
  const res = (status: number, body: string) => ({ ok: status >= 200 && status < 300, status, text: async () => body }) as unknown as Response;
  const fake = (r: Response | Error) => vi.fn(async () => (r instanceof Error ? Promise.reject(r) : r)) as unknown as typeof fetch;

  it("valid response → records", async () => {
    const f = fake(res(200, JSON.stringify([CME])));
    const r = await fetchDonki("CME", "2024-05-01", "2024-05-31", { apiKey: "SECRET123", fetchImpl: f });
    expect(r).toMatchObject({ ok: true, httpStatus: 200 });
    if (r.ok) expect(r.records).toHaveLength(1);
    expect(r.url).toBe("https://api.nasa.gov/DONKI/CME?startDate=2024-05-01&endDate=2024-05-31&api_key=***");
    expect((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain("api_key=SECRET123");
  });
  it("empty body or [] → zero events (not an error)", async () => {
    for (const body of ["", "  ", "[]"]) {
      const r = await fetchDonki("SEP", "2024-05-01", "2024-05-02", { apiKey: "k", fetchImpl: fake(res(200, body)) });
      expect(r).toMatchObject({ ok: true, records: [] });
    }
  });
  it("HTTP errors, rate limits, network errors and timeouts are reported, never thrown", async () => {
    expect(await fetchDonki("FLR", "2024-05-01", "2024-05-02", { apiKey: "k", fetchImpl: fake(res(429, "OVER_RATE_LIMIT")) })).toMatchObject({ ok: false, httpStatus: 429, error: expect.stringMatching(/429/) });
    expect(await fetchDonki("FLR", "2024-05-01", "2024-05-02", { apiKey: "k", fetchImpl: fake(res(500, "oops")) })).toMatchObject({ ok: false, httpStatus: 500 });
    expect(await fetchDonki("FLR", "2024-05-01", "2024-05-02", { apiKey: "k", fetchImpl: fake(new TypeError("fetch failed")) })).toMatchObject({ ok: false, httpStatus: null, error: expect.stringMatching(/network/) });
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    expect(await fetchDonki("FLR", "2024-05-01", "2024-05-02", { apiKey: "k", timeoutMs: 5, fetchImpl: fake(abort) })).toMatchObject({ ok: false, error: expect.stringMatching(/timeout/) });
  });
  it("malformed JSON and unexpected shapes are reported", async () => {
    expect(await fetchDonki("CME", "2024-05-01", "2024-05-02", { apiKey: "k", fetchImpl: fake(res(200, "[{oops")) })).toMatchObject({ ok: false, error: "malformed JSON in response" });
    expect(await fetchDonki("CME", "2024-05-01", "2024-05-02", { apiKey: "k", fetchImpl: fake(res(200, '{"error":"x"}')) })).toMatchObject({ ok: false, error: expect.stringMatching(/array/) });
  });
  it("invalid date ranges are refused before any request", async () => {
    const f = fake(res(200, "[]"));
    expect(await fetchDonki("CME", "2024-02-30", "2024-03-01", { apiKey: "k", fetchImpl: f })).toMatchObject({ ok: false });
    expect(await fetchDonki("CME", "2024-05-10", "2024-05-01", { apiKey: "k", fetchImpl: f })).toMatchObject({ ok: false, error: expect.stringMatching(/after/) });
    expect(f).not.toHaveBeenCalled();
  });
  it("the API key is masked in anything stored", () => {
    expect(maskKey("https://api.nasa.gov/DONKI/FLR?startDate=a&api_key=abc123&x=1")).toBe("https://api.nasa.gov/DONKI/FLR?startDate=a&api_key=***&x=1");
  });
});

describe("V6.1 — metadata", () => {
  const report = (ok: boolean, rejected = 0): TypeReport => ({
    requestUrl: "u",
    ok,
    httpStatus: ok ? 200 : 503,
    error: ok ? null : "HTTP 503",
    received: 2,
    accepted: 2 - rejected,
    duplicatesInResponse: 0,
    rejected: Array.from({ length: rejected }, () => ({ eventType: "CME" as const, id: null, reason: "x" })),
  });
  it("identifies the source, range, retrieval time, counts and validation; never claims to be live", () => {
    const events = [okEvent("CME", CME), okEvent("FLR", FLR), okEvent("SEP", SEP)];
    const m = buildMetadata({ retrievedAt: AT, startDate: "2024-05-01", endDate: "2024-05-31", events, perType: { CME: report(true), FLR: report(true), SEP: report(true) }, apiKeyType: "DEMO_KEY" });
    expect(m.source.endpoints).toEqual({ CME: "https://api.nasa.gov/DONKI/CME", FLR: "https://api.nasa.gov/DONKI/FLR", SEP: "https://api.nasa.gov/DONKI/SEP" });
    expect(m).toMatchObject({ isLiveData: false, retrievedAt: AT, requestedDateRange: { startDate: "2024-05-01", endDate: "2024-05-31" }, counts: { CME: 1, FLR: 1, SEP: 1, total: 3 }, supportedEventTypes: ["CME", "FLR", "SEP"] });
    expect(m.validation.status).toBe("valid");
    expect(m.notice).toMatch(/not live/);
    expect(m.fieldProvenance).toBe(FIELD_PROVENANCE);
    expect(JSON.stringify(m)).not.toMatch(/api_key=(?!\*\*\*)/);
  });
  it("status: valid / partial (a failure or a rejected record) / failed (all failed)", () => {
    expect(validationStatus({ CME: report(true), FLR: report(true), SEP: report(true) })).toBe("valid");
    expect(validationStatus({ CME: report(true), FLR: report(false), SEP: report(true) })).toBe("partial");
    expect(validationStatus({ CME: report(true, 1), FLR: report(true), SEP: report(true) })).toBe("partial");
    expect(validationStatus({ CME: report(false), FLR: report(false), SEP: report(false) })).toBe("failed");
  });
});

describe("V6.1 — SEP download: rate limits, key safety and per-type datasets", () => {
  const withHeaders = (status: number, body: string, headers: Record<string, string>) =>
    ({ ok: status >= 200 && status < 300, status, text: async () => body, headers: new Headers(headers) }) as unknown as Response;
  const fake = (r: Response | Error) => vi.fn(async () => (r instanceof Error ? Promise.reject(r) : r)) as unknown as typeof fetch;

  it("reads NASA's rate-limit headers (remaining requests, Retry-After on 429)", async () => {
    const ok = await fetchDonki("SEP", "2024-05-01", "2024-05-31", { apiKey: "k", fetchImpl: fake(withHeaders(200, "[]", { "X-RateLimit-Remaining": "998" })) });
    expect(ok.rateLimit).toEqual({ remaining: 998, retryAfterSec: null });
    const limited = await fetchDonki("SEP", "2024-05-01", "2024-05-31", { apiKey: "k", fetchImpl: fake(withHeaders(429, "OVER_RATE_LIMIT", { "Retry-After": "3600", "X-RateLimit-Remaining": "0" })) });
    expect(limited).toMatchObject({ ok: false, httpStatus: 429, rateLimit: { remaining: 0, retryAfterSec: 3600 } });
  });
  it("never leaks the key through an error message", async () => {
    const key = "MY-PERSONAL-KEY-123";
    const echo = await fetchDonki("SEP", "2024-05-01", "2024-05-31", { apiKey: key, fetchImpl: fake(withHeaders(403, `bad key ${key}`, {})) });
    const net = await fetchDonki("SEP", "2024-05-01", "2024-05-31", { apiKey: key, fetchImpl: fake(new TypeError(`connect failed for ?api_key=${key}`)) });
    for (const r of [echo, net]) {
      expect(JSON.stringify(r)).not.toContain(key);
      expect(r.url).toContain("api_key=***");
    }
  });
  it("per-type summary: file, endpoint, retrieval date, range, count and missing fields (nothing filled in)", () => {
    const noInstr = { ...SEP, sepID: "2024-05-11T02:00:00-SEP-002", eventTime: "2024-05-11T02:00Z", instruments: undefined, link: undefined };
    const events = [okEvent("SEP", SEP), okEvent("SEP", noInstr)];
    const d = typeDatasetSummary("SEP", events, AT, "2024-05-01", "2024-05-31");
    expect(typeFileName("SEP")).toBe("sep.json");
    expect(d).toMatchObject({
      file: "public/data/donki/sep.json",
      endpoint: "https://api.nasa.gov/DONKI/SEP",
      retrievedAt: AT,
      requestedDateRange: { startDate: "2024-05-01", endDate: "2024-05-31" },
      count: 2,
    });
    expect(d.missingOptionalFields).toEqual(missingFieldSummary(events));
    expect(d.missingOptionalFields.instruments).toBe(1);
    expect(events[1].instruments).toEqual([]);
    expect(events[1].sourceUrl).toBeNull();
  });
  it("metadata keeps the datasets it is given", () => {
    const d = typeDatasetSummary("SEP", [okEvent("SEP", SEP)], AT, "2024-05-01", "2024-05-31");
    const ok: TypeReport = { requestUrl: "u", ok: true, httpStatus: 200, error: null, received: 1, accepted: 1, duplicatesInResponse: 0, rejected: [] };
    const m = buildMetadata({ retrievedAt: AT, startDate: "2024-05-01", endDate: "2024-05-31", events: [okEvent("SEP", SEP)], perType: { CME: ok, FLR: ok, SEP: ok }, apiKeyType: "NASA_API_KEY", datasets: { SEP: d } });
    expect(m.datasets.SEP?.count).toBe(1);
    expect(m.apiKeyType).toBe("NASA_API_KEY");
  });
});
