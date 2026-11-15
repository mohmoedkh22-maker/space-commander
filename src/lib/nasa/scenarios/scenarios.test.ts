// WP06.4 — Scientific Scenario Engine tests.
// Most tests run on the REAL offline datasets in public/data (read from disk, no network). Synthetic fixtures are used only to
// exercise edge cases (invalid values, missing analyses, rule violations) and are labelled as such.
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DONKIEvent, DONKIMetadata } from "../donki/donki";
import { DECISIONS } from "../../game/decisions";
import { deepFreeze } from "../../game/whatif";
import { cmeScenario, donkiScenarios, referencedFlareIds } from "./donkiScenarios";
import { generateScenarios, validateLesson, validateScenario, validateScenarioSet, type ScenarioInput } from "./engine";
import { dailyStats, radlabScenarios, type RadLabDatasetFile } from "./radlabScenarios";
import { CATEGORY_DATASET, SCENARIO_CATEGORIES, type ScientificScenario } from "./types";

const root = process.cwd();
const json = (rel: string) => JSON.parse(readFileSync(path.join(root, rel), "utf8"));

const events: DONKIEvent[] = json("public/data/donki/events.json").events;
const metadata: DONKIMetadata = json("public/data/donki/metadata.json");
const crater: RadLabDatasetFile = json("public/data/radlab/crater-d1d2.json");
const bpd: RadLabDatasetFile = json("public/data/radlab/bpd.json");
const input = (): ScenarioInput => ({ donki: { events, metadata }, radlab: { "CRaTER-D1D2": crater, BPD: bpd } });
const set = generateScenarios(input());
const byCat = (c: ScientificScenario["category"]) => set.scenarios.filter((s) => s.category === c);
const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));

afterEach(() => vi.unstubAllGlobals());

describe("WP06.4 — scenario creation from the real offline datasets", () => {
  it("creates scenarios in every required category and passes every scientific rule", () => {
    for (const c of SCENARIO_CATEGORIES) expect(byCat(c).length, c).toBeGreaterThan(0);
    expect(set.counts.total).toBe(set.scenarios.length);
    expect(validateScenarioSet(set)).toEqual([]);
  });
  it("SEP: one scenario per stored SEP record; CME: exactly those NASA links to an SEP event; FLR: the reference-only case", () => {
    expect(byCat("SEP").length).toBe(events.filter((e) => e.eventType === "SEP").length);
    const sepLinked = new Set(events.filter((e) => e.eventType === "SEP").flatMap((e) => (e.observed.linkedEventIds as string[]) ?? []));
    for (const s of byCat("CME")) expect(sepLinked.has(s.sourceRecords[0].id)).toBe(true);
    const flr = byCat("FLR");
    expect(flr).toHaveLength(1);
    expect(flr[0].classification).toBe("historical-reference-only");
    expect(flr[0].sourceRecords.every((r) => r.recordType === "FLR" && !r.availableOffline)).toBe(true);
    expect(flr[0].sourceRecords.map((r) => r.id)).toEqual(referencedFlareIds(events));
  });
  it("radiation: a quiet day and the busiest day for each approved instrument", () => {
    expect(byCat("LUNAR_ORBIT_RADIATION").map((s) => s.id)).toEqual(expect.arrayContaining([expect.stringMatching(/quiet-CRaTER-D1D2/), expect.stringMatching(/peak-CRaTER-D1D2/)]));
    expect(byCat("DEEP_SPACE_COMPARISON").map((s) => s.id)).toEqual(expect.arrayContaining([expect.stringMatching(/quiet-BPD/), expect.stringMatching(/peak-BPD/)]));
  });
  it("every scenario has every required field", () => {
    for (const s of set.scenarios) {
      expect(s.id).toBeTruthy();
      for (const k of ["title", "description", "educationalObjective", "expectedLearningOutcome", "contextDescription"] as const) {
        expect(s[k].ar.length, `${s.id}.${k}`).toBeGreaterThan(0);
        expect(s[k].en.length, `${s.id}.${k}`).toBeGreaterThan(0);
      }
      expect(s.observationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.sourceRecords.length).toBeGreaterThan(0);
      expect(s.limitations.length).toBeGreaterThan(0);
      expect(s.decisionOptions.length).toBeGreaterThanOrEqual(2);
      expect(s.decisionOptions.length).toBeLessThanOrEqual(3);
      expect(s.dataQuality.sourceIndicators).toBeTypeOf("object");
    }
  });
});

describe("WP06.4 — unique IDs", () => {
  it("scenario and lesson ids are unique, and duplicates are reported", () => {
    const ids = set.scenarios.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(set.lessons.map((l) => l.id)).size).toBe(set.lessons.length);
    const bad = clone(set);
    bad.scenarios.push(clone(bad.scenarios[0]));
    expect(validateScenarioSet(bad)).toEqual(expect.arrayContaining([expect.stringMatching(/duplicate scenario ids/)]));
  });
});

describe("WP06.4 — NASA source references are real and traceable", () => {
  const donkiIds = new Set(events.map((e) => e.id));
  const allLinked = new Set(events.flatMap((e) => (e.observed.linkedEventIds as string[]) ?? []));
  it("every DONKI record reference exists in the offline DONKI file (or, for FLR, in NASA's own linked-event lists)", () => {
    for (const s of set.scenarios.filter((x) => x.source.dataset === "DONKI"))
      for (const r of s.sourceRecords) expect(r.availableOffline ? donkiIds.has(r.id) : allLinked.has(r.id), `${s.id} → ${r.id}`).toBe(true);
  });
  it("every RadLab measurement is copied from an identified record with the same timestamp and value", () => {
    for (const [ds, cat] of [
      [crater, "LUNAR_ORBIT_RADIATION"],
      [bpd, "DEEP_SPACE_COMPARISON"],
    ] as const) {
      const ti = ds.columns.indexOf("timestamp");
      const vi = ds.columns.indexOf("absorbed_dose_rate");
      for (const s of byCat(cat)) {
        const m = s.measurements[0];
        const ts = m.recordId.split("@")[1];
        expect(m.recordId.startsWith(`${ds.instrumentId}@`)).toBe(true);
        expect(ds.records.find((r) => r[ti] === ts)?.[vi]).toBe(m.value);
        // and it really is that day's maximum (selection, not computation)
        const dayVals = ds.records.filter((r) => String(r[ti]).startsWith(s.observationDate)).map((r) => r[vi] as number);
        expect(m.value).toBe(Math.max(...dayVals));
      }
    }
  });
  it("source blocks name the endpoint, the offline file and the retrieval time", () => {
    for (const s of set.scenarios) {
      expect(s.source.endpoint).toMatch(/^https:\/\/(api\.nasa\.gov\/DONKI\/|visualization\.osdr\.nasa\.gov\/radlab\/api\/)/);
      expect(s.source.file).toMatch(/^public\/data\/(donki|radlab)\//);
      expect(s.source.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });
});

describe("WP06.4 — DONKI and RadLab stay separate", () => {
  it("each category uses only its own dataset and record types", () => {
    for (const s of set.scenarios) {
      expect(s.source.dataset).toBe(CATEGORY_DATASET[s.category]);
      const want = CATEGORY_DATASET[s.category] === "RADLAB" ? "RADLAB_MEASUREMENT" : s.category;
      for (const r of s.sourceRecords) expect(r.recordType).toBe(want);
    }
  });
  it("mixing sources is rejected by validation", () => {
    const s = clone(byCat("LUNAR_ORBIT_RADIATION")[0]);
    s.sourceRecords.push({ id: "2024-05-10T13:35:00-SEP-001", recordType: "SEP", timestamp: null, url: null, availableOffline: true });
    expect(validateScenario(s)).toEqual(expect.arrayContaining([expect.stringMatching(/does not belong/)]));
    const d = clone(byCat("SEP")[0]);
    d.source.dataset = "RADLAB";
    expect(validateScenario(d)).toEqual(expect.arrayContaining([expect.stringMatching(/must use DONKI/)]));
  });
  it("the generators never receive the other dataset", () => {
    expect(() => donkiScenarios(events, metadata)).not.toThrow();
    expect(radlabScenarios(crater).every((s) => s.source.dataset === "RADLAB")).toBe(true);
    expect(donkiScenarios(events, metadata).every((s) => s.source.dataset === "DONKI")).toBe(true);
  });
});

describe("WP06.4 — missing values stay missing", () => {
  it("SEP has no flux value, RadLab has no dose-equivalent or flux, FLR details are unavailable", () => {
    for (const s of byCat("SEP")) {
      expect(s.measurements).toEqual([]);
      expect(s.missingMeasurements.map((m) => m.name)).toContain("particle_flux");
    }
    for (const s of [...byCat("LUNAR_ORBIT_RADIATION"), ...byCat("DEEP_SPACE_COMPARISON")]) {
      expect(s.measurements.map((m) => m.name)).toEqual(["absorbed_dose_rate"]);
      expect(s.missingMeasurements.map((m) => m.name)).toEqual(["dose_equivalent_rate", "flux"]);
    }
    expect(byCat("FLR")[0].missingMeasurements.map((m) => m.name)).toEqual(expect.arrayContaining(["flare_class", "peak_time"]));
  });
  it("a CME without a most-accurate analysis lists every value as missing instead of inventing one (fixture)", () => {
    const e = clone(events.find((x) => x.eventType === "CME")!);
    delete (e.observed as Record<string, unknown>).mostAccurateAnalysis;
    const s = cmeScenario(e, metadata);
    expect(s.measurements).toEqual([]);
    expect(s.missingMeasurements.map((m) => m.name)).toEqual(["cme_speed", "cme_half_angle", "cme_latitude", "cme_longitude"]);
    expect(s.description.en).toMatch(/not available/);
  });
  it("a value that is both measured and missing is reported", () => {
    const s = clone(byCat("CME")[0]);
    s.missingMeasurements.push({ name: "cme_speed", reason: { ar: "س", en: "x" } });
    expect(validateScenario(s)).toEqual(expect.arrayContaining([expect.stringMatching(/both measured and missing/)]));
  });
});

describe("WP06.4 — invalid measurements", () => {
  const fixture = (vals: unknown[]): RadLabDatasetFile => ({
    ...crater,
    records: vals.map((v, i) => [`2024-05-0${1 + Math.floor(i / 3)}T0${i % 3}:00:00`, `2024-05-0${1 + Math.floor(i / 3)}T0${i % 3}:00:00.000Z`, v, null, null, v === 0 ? ["zero_value"] : []]),
  });
  it("non-numeric, NaN and negative values are excluded and counted; nulls are counted; zeros are flagged, not removed (fixture)", () => {
    const d = dailyStats(fixture(["7", Number.NaN, -3, null, 0, 4]));
    expect(d[0]).toMatchObject({ day: "2024-05-01", records: 3, validValues: 0, invalidValues: 3, maxValue: null });
    expect(d[1]).toMatchObject({ day: "2024-05-02", records: 3, validValues: 2, nullValues: 1, zeroFlagged: 1, maxValue: 4 });
  });
  it("validation rejects non-finite, negative-rate and unitless measurements; signed coordinates are allowed", () => {
    const base = byCat("CME")[0];
    const mk = (patch: Partial<ScientificScenario["measurements"][0]>) => {
      const s = clone(base);
      s.measurements[0] = { ...s.measurements[0], ...patch };
      return validateScenario(s);
    };
    expect(mk({ value: Number.NaN })).toEqual(expect.arrayContaining([expect.stringMatching(/not a finite number/)]));
    expect(mk({ value: -5 })).toEqual(expect.arrayContaining([expect.stringMatching(/negative/)])); // cme_speed
    expect(mk({ unit: "" })).toEqual(expect.arrayContaining([expect.stringMatching(/no unit/)]));
    expect(mk({ recordId: "unknown" })).toEqual(expect.arrayContaining([expect.stringMatching(/not referenced/)]));
    const lat = base.measurements.find((m) => m.name === "cme_latitude")!;
    expect(lat.value).toBeLessThan(0); // the real record is south of the solar equator
    expect(validateScenario(base)).toEqual([]);
  });
});

describe("WP06.4 — units are preserved", () => {
  it("RadLab units are copied exactly from the dataset with their documentation source", () => {
    for (const [ds, cat] of [
      [crater, "LUNAR_ORBIT_RADIATION"],
      [bpd, "DEEP_SPACE_COMPARISON"],
    ] as const)
      for (const s of byCat(cat)) {
        expect(s.measurements[0].unit).toBe(ds.units.absorbed_dose_rate.unit);
        expect(s.measurements[0].unit).toBe("μGy/hour");
        expect(s.measurements[0].unitSource).toBe(ds.units.absorbed_dose_rate.source);
      }
  });
  it("CME values keep DONKI's documented units and cite the source", () => {
    for (const s of byCat("CME"))
      for (const m of s.measurements) {
        expect(m.unit).toBe(m.name === "cme_speed" ? "km/s" : "deg");
        expect(m.unitSource).toMatch(/ccmc\.gsfc\.nasa\.gov/);
        expect(m.derivation).toBe("as-recorded");
      }
  });
  it("a dataset without a unit is refused rather than given a guessed unit (fixture)", () => {
    const noUnit = { ...crater, units: {} };
    expect(() => radlabScenarios(noUnit)).toThrow(/unit missing/);
  });
});

describe("WP06.4 — historical vs simulated classification", () => {
  it("generated scenarios are historical; model-based SEP records are marked as model output", () => {
    expect(set.scenarios.every((s) => s.classification !== "simulated")).toBe(true);
    for (const s of byCat("SEP")) {
      const e = events.find((x) => x.id === s.sourceRecords[0].id)!;
      expect(s.classification).toBe(e.dataQuality.basis === "model" ? "historical-model-output" : "historical-observation");
    }
    expect(byCat("SEP").some((s) => s.classification === "historical-model-output")).toBe(true);
  });
  it("a scenario marked simulated is rejected", () => {
    const s = clone(byCat("CME")[0]);
    s.classification = "simulated";
    expect(validateScenario(s)).toEqual(expect.arrayContaining([expect.stringMatching(/never simulated/)]));
  });
  it("the scenario set never claims to be live data", () => {
    expect(set.isLiveData).toBe(false);
    expect(set.notice.en).toMatch(/Not current space weather/);
  });
});

describe("WP06.4 — scientific limitation fields and safety rules", () => {
  const radiation = () => [...byCat("LUNAR_ORBIT_RADIATION"), ...byCat("DEEP_SPACE_COMPARISON")];
  it("CRaTER is lunar ORBIT, never the surface; BioSentinel is never lunar", () => {
    for (const s of byCat("LUNAR_ORBIT_RADIATION")) {
      expect(s.observationContext).toBe("lunar-orbit");
      expect(s.description.en).toMatch(/not on the Moon's surface/);
      expect(s.limitations.map((l) => l.en)).toContain("A measurement in lunar orbit, not on the surface.");
    }
    for (const s of byCat("DEEP_SPACE_COMPARISON")) {
      expect(s.observationContext).toBe("heliocentric-1au");
      expect(`${s.description.en} ${s.contextDescription.en}`).toMatch(/not (a reading )?(at|near) the Moon/);
    }
  });
  it("detector dose is never an astronaut dose; no equivalent dose is derived; zero is not zero radiation", () => {
    for (const s of radiation()) {
      const lim = s.limitations.map((l) => l.en).join(" ");
      expect(lim).toMatch(/not a dose in an astronaut's body/);
      expect(lim).toMatch(/No equivalent dose is calculated/);
      expect(lim).toMatch(/does not mean no radiation/);
      expect(lim).toMatch(/not turned into oxygen, water, food or energy penalties/);
    }
  });
  it("no confidence score is invented; uncertainty is stated", () => {
    for (const s of set.scenarios) {
      expect(s.dataQuality.confidence).toBeNull();
      expect(s.dataQuality.confidenceNote.en).toMatch(/no numeric confidence/);
    }
    for (const s of radiation()) expect(s.dataQuality.uncertainties.map((u) => u.en).join(" ")).toMatch(/timezone is unconfirmed/);
  });
  it("rule checks catch unsafe wording (fixtures)", () => {
    const s = clone(byCat("LUNAR_ORBIT_RADIATION")[0]);
    s.description.en = "This is the dose an astronaut received on the Moon.";
    expect(validateScenario(s)).toEqual(expect.arrayContaining([expect.stringMatching(/biological-dose claim/)]));
    const c = clone(byCat("SEP")[0]);
    c.description.en = "The CME caused the particle event.";
    expect(validateScenario(c)).toEqual(expect.arrayContaining([expect.stringMatching(/causation claim/)]));
    const r = clone(byCat("LUNAR_ORBIT_RADIATION")[0]);
    r.limitations = r.limitations.filter((l) => !/not on the surface/.test(l.en));
    expect(validateScenario(r)).toEqual(expect.arrayContaining([expect.stringMatching(/orbit-not-surface/)]));
    const q = clone(byCat("CME")[0]);
    (q.dataQuality as { confidence: unknown }).confidence = 0.9;
    expect(validateScenario(q)).toEqual(expect.arrayContaining([expect.stringMatching(/confidence must be null/)]));
  });
  it("temporal links are labelled correlation-only and deny causation", () => {
    const rel = set.lessons.flatMap((l) => l.relations);
    expect(rel.length).toBeGreaterThan(0);
    for (const r of rel) {
      expect(r.kind).toBe("temporal-correlation-only");
      expect(r.statement.en).toMatch(/not claimed/);
    }
    for (const s of [...byCat("SEP"), ...byCat("CME")]) for (const r of s.relations) expect(r.kind).toBe("nasa-linked-events");
  });
});

describe("WP06.4 — What If compatibility (engine untouched)", () => {
  it("hooks are qualitative, link to an existing decision and carry no resource effects", () => {
    for (const s of set.scenarios) {
      expect(s.whatIf.resourceEffects).toBeNull();
      expect(s.whatIf.linkedDecisionId === null || s.whatIf.linkedDecisionId in DECISIONS).toBe(true);
      for (const d of s.whatIf.predictionDirections) expect(["more", "same", "less"]).toContain(d);
    }
    const bad = clone(byCat("SEP")[0]);
    (bad.whatIf as { resourceEffects: unknown }).resourceEffects = { oxygen: -5 };
    expect(validateScenario(bad)).toEqual(expect.arrayContaining([expect.stringMatching(/resource effects/)]));
  });
});

describe("WP06.4 — offline and deterministic", () => {
  it("generation makes no network request", () => {
    const f = vi.fn(() => {
      throw new Error("network used");
    });
    vi.stubGlobal("fetch", f);
    expect(() => generateScenarios(input())).not.toThrow();
    expect(f).not.toHaveBeenCalled();
  });
  it("the same input always gives the same output, regardless of input order, and inputs are not modified", () => {
    const shuffled = [...events].reverse();
    const a = generateScenarios(input());
    const b = generateScenarios({ ...input(), donki: { events: shuffled, metadata } });
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    const frozen = deepFreeze(clone(input()));
    expect(() => generateScenarios(frozen)).not.toThrow();
  });
  it("the committed public/data/scenarios/scenarios.json matches a fresh generation", () => {
    expect(json("public/data/scenarios/scenarios.json")).toEqual(clone(set));
  });
});

describe("WP06.4 — SUHAIL lessons are child-friendly and grounded in NASA data", () => {
  it("three lessons, each with intro, explanation, challenge, 2–3 choices with consequences, and an objective", () => {
    expect(set.lessons.map((l) => l.id)).toEqual(["lesson-suhail-solar-alert", "lesson-suhail-orbit-not-surface", "lesson-suhail-same-time-not-cause"]);
    for (const l of set.lessons) {
      for (const f of [l.suhailIntro, l.childExplanation, l.challenge, l.learningObjective]) {
        expect(f.ar).toMatch(/[؀-ۿ]/);
        expect(f.en.length).toBeGreaterThan(10);
      }
      expect(l.choices.length).toBeGreaterThanOrEqual(2);
      expect(l.choices.length).toBeLessThanOrEqual(3);
      for (const c of l.choices) expect(c.educationalConsequence.en.length).toBeGreaterThan(10);
      expect(["idle", "curious", "thinking", "explaining", "warning", "happy", "encouraging", "concerned"]).toContain(l.expression);
    }
    const ids = new Set(set.scenarios.map((s) => s.id));
    for (const l of set.lessons) expect(validateLesson(l, ids)).toEqual([]);
  });
  it("numbers quoted by SUHAIL come from the scenarios", () => {
    const orbit = set.lessons.find((l) => l.id === "lesson-suhail-orbit-not-surface")!;
    const peak = set.scenarios.find((s) => s.id === orbit.basedOnScenarioIds[0])!;
    expect(orbit.suhailIntro.en).toContain(String(Math.round(peak.measurements[0].value * 100) / 100));
    expect(orbit.suhailIntro.en).toContain(peak.measurements[0].unit);
  });
  it("short sentences and no frightening words; violations are caught (fixture)", () => {
    const l = clone(set.lessons[0]);
    l.childExplanation.en = "The radiation could kill the crew.";
    expect(validateLesson(l, new Set(set.scenarios.map((s) => s.id)))).toEqual(expect.arrayContaining([expect.stringMatching(/frightening/)]));
    const long = clone(set.lessons[0]);
    long.challenge.en = Array.from({ length: 45 }, () => "word").join(" ") + ".";
    expect(validateLesson(long, new Set(set.scenarios.map((s) => s.id)))).toEqual(expect.arrayContaining([expect.stringMatching(/too long/)]));
  });
});
