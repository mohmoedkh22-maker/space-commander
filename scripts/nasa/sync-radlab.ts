// WP06.3 — offline NASA OSDR RadLab sync (read-only GET requests). Run BEFORE building; the game never calls RadLab at runtime.
//
//   npm run sync:radlab                                   (defaults: 2024-05-01 → 2024-05-31, CRaTER-D1D2 and BPD)
//   npm run sync:radlab -- --start=2024-05-01 --end=2024-05-31
//   npm run sync:radlab -- --instruments=CRaTER-D1D2      (only approved instruments are accepted)
//   --chunk-days=7   days per request (keeps each response small)
//   --pause=2000     ms between requests (courtesy to the public server)
//   --timeout=120000 ms per request
//
// No API key is needed. Output (static files, bundled with the app, never loaded by gameplay):
//   public/data/radlab/<instrument>.json          validated records (columnar) + units, provenance and limitations
//   public/data/radlab/raw/<instrument>.raw.json  every RadLab response exactly as received (pandas split JSON)
//   public/data/radlab/metadata.json              source, retrieval time, range, counts, validation report
//
// Safety: an instrument's files are rewritten ONLY when every request for it succeeded and at least one row validated.
// Otherwise its previous files are left untouched. If no instrument succeeds, nothing is written at all.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildMetadata,
  dateChunks,
  datasetFileNames,
  fetchRadLab,
  fieldStats,
  isValidDate,
  MEASUREMENT_FIELDS,
  MEASUREMENT_UNITS,
  medianCadenceSec,
  RADLAB_DATA_VERSION,
  RADLAB_SOURCES,
  SCIENTIFIC_LIMITATIONS,
  validateRows,
  type InstrumentReport,
  type RadLabMetadata,
} from "../../src/lib/nasa/radlab/radlab.ts";

const OUT_DIR = path.join(process.cwd(), "public", "data", "radlab");
const META_FILE = path.join(OUT_DIR, "metadata.json");

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

/** temp file + rename: an interrupted run never leaves a half-written dataset */
async function writeAtomic(file: string, text: string) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await writeFile(tmp, text);
  await rename(tmp, file);
}

async function main(): Promise<number> {
  const startDate = arg("start") ?? "2024-05-01";
  const endDate = arg("end") ?? "2024-05-31";
  const chunkDays = Number(arg("chunk-days") ?? 7);
  const pauseMs = Math.max(0, Number(arg("pause") ?? 2000));
  const timeoutMs = Number(arg("timeout") ?? 120000);
  const ids = (arg("instruments") ?? Object.keys(RADLAB_SOURCES).join(",")).split(",").map((s) => s.trim()).filter(Boolean);

  if (!isValidDate(startDate) || !isValidDate(endDate) || startDate > endDate) {
    console.error(`Invalid date range ${startDate} → ${endDate} (use --start=YYYY-MM-DD --end=YYYY-MM-DD)`);
    return 2;
  }
  const unapproved = ids.filter((id) => !RADLAB_SOURCES[id]);
  if (unapproved.length || !ids.length) {
    console.error(`Not an approved RadLab instrument: ${unapproved.join(", ") || "(none given)"}. Approved: ${Object.keys(RADLAB_SOURCES).join(", ")}`);
    return 2;
  }

  console.log(`NASA OSDR RadLab sync · ${startDate} → ${endDate} · ${ids.join(", ")} · no API key needed`);
  const retrievedAt = new Date().toISOString();
  const prevMeta = await readJson<RadLabMetadata>(META_FILE);
  const reports: Record<string, InstrumentReport> = { ...(prevMeta?.instruments ?? {}) };
  const toWrite: { file: string; text: string }[] = [];
  let anySuccess = false;
  let firstRequest = true;

  for (const id of ids) {
    const src = RADLAB_SOURCES[id];
    const files = datasetFileNames(id);
    const prev = prevMeta?.instruments?.[id];
    const report: InstrumentReport = {
      instrumentId: id,
      spacecraft: src.spacecraft,
      trajectory: src.trajectory,
      role: src.role,
      ok: false,
      written: false,
      error: null,
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
    };
    const rows: Record<string, unknown>[] = [];
    const rawResponses: { url: string; startDate: string; endDate: string; httpStatus: number; response: unknown }[] = [];

    for (const chunk of dateChunks(startDate, endDate, chunkDays)) {
      if (!firstRequest && pauseMs) await sleep(pauseMs);
      firstRequest = false;
      const res = await fetchRadLab(id, chunk.startDate, chunk.endDate, { timeoutMs });
      report.requests.push({ url: res.url, ...chunk, httpStatus: res.httpStatus, rows: res.ok ? res.table.rows.length : null, error: res.ok ? null : res.error });
      if (!res.ok) {
        report.error = `${chunk.startDate} → ${chunk.endDate}: ${res.error}`;
        console.error(`  ${id} ${chunk.startDate}→${chunk.endDate}: FAILED — ${res.error}`);
        break;
      }
      console.log(`  ${id} ${chunk.startDate}→${chunk.endDate}: HTTP ${res.httpStatus} · ${res.table.rows.length} rows`);
      rows.push(...res.table.rows);
      rawResponses.push({ url: res.url, ...chunk, httpStatus: res.httpStatus, response: JSON.parse(res.rawText) });
    }

    if (!report.error) {
      const batch = validateRows(rows, id, startDate, endDate);
      report.received = rows.length;
      report.accepted = batch.records.length;
      report.rejected = batch.rejected;
      report.duplicates = { identical: batch.duplicates.filter((d) => d.kind === "identical").length, conflicting: batch.duplicates.filter((d) => d.kind === "conflicting") };
      for (const r of batch.rejected.slice(0, 5)) console.warn(`    rejected ${String(r.timestamp)}: ${r.reason}`);
      if (batch.records.length === 0) {
        report.error = rows.length ? "every received row failed validation" : "no rows returned for the requested range";
      } else {
        const recs = batch.records;
        report.ok = true;
        report.written = true;
        report.firstTimestamp = recs[0].timestamp;
        report.lastTimestamp = recs[recs.length - 1].timestamp;
        report.medianCadenceSec = medianCadenceSec(recs);
        report.fields = fieldStats(recs);
        report.files = { records: `public/data/radlab/${files.records}`, raw: `public/data/radlab/${files.raw}` };
        const notReturned = MEASUREMENT_FIELDS.filter((f) => recs.some((r) => r.notReturned.includes(f)));
        const context = recs[0].context;
        const columns = ["timestamp", "timestampUtcAssumed", ...MEASUREMENT_FIELDS, "qualityFlags"] as const;
        const dataset = {
          schemaVersion: 1,
          dataVersion: RADLAB_DATA_VERSION,
          instrumentId: id,
          spacecraft: src.spacecraft,
          trajectory: src.trajectory,
          celestialBody: src.celestialBody,
          role: src.role,
          description: src.description,
          isLiveData: false,
          retrievedAt,
          requestedDateRange: { startDate, endDate },
          source: { api: "https://visualization.osdr.nasa.gov/radlab/api/", requests: report.requests.map((r) => r.url), rawFile: report.files.raw },
          contextAsReturned: context,
          units: MEASUREMENT_UNITS,
          detectorMaterial: { value: null, status: "unknown: not stated by the RadLab API; knowledgebase unavailable (HTTP 500) at retrieval" },
          timestampNote: "timestamp is exactly as returned (no timezone). timestampUtcAssumed reads it as UTC: an ASSUMPTION, unconfirmed by RadLab.",
          fieldsNotReturned: notReturned,
          scientificLimitations: SCIENTIFIC_LIMITATIONS,
          count: recs.length,
          columns,
          records: recs.map((r) => [r.timestamp, r.timestampUtcAssumed, ...MEASUREMENT_FIELDS.map((f) => r[f]), r.qualityFlags.filter((q) => q !== "timezone_assumed_utc")]),
        };
        toWrite.push({ file: path.join(OUT_DIR, files.records), text: JSON.stringify(dataset) + "\n" });
        toWrite.push({
          file: path.join(OUT_DIR, files.raw),
          text: JSON.stringify({ schemaVersion: 1, instrumentId: id, retrievedAt, note: "RadLab responses exactly as received (pandas split JSON), one per request", responses: rawResponses }) + "\n",
        });
        anySuccess = true;
        const fs = report.fields;
        console.log(
          `  ${id}: received ${report.received} · accepted ${report.accepted} · rejected ${report.rejected.length} · duplicates ${report.duplicates.identical}+${report.duplicates.conflicting.length} conflicting · ` +
            `absorbed_dose_rate non-null ${fs.absorbed_dose_rate.nonNull}, null ${fs.absorbed_dose_rate.nulls}, zero ${fs.absorbed_dose_rate.zeros}`,
        );
      }
    }
    if (!report.ok) {
      if (prev?.ok && prev.files) {
        report.files = prev.files;
        report.keptPrevious = { retrievedAt: prevMeta!.retrievedAt, accepted: prev.accepted, requestedDateRange: prevMeta!.requestedDateRange };
        console.warn(`  ${id}: ${report.error} — previous dataset (${prev.accepted} records) left unchanged`);
      } else console.error(`  ${id}: ${report.error} — nothing written`);
    }
    reports[id] = report;
  }

  if (!anySuccess) {
    console.error("✖ No instrument produced a valid dataset. Existing files were left unchanged.");
    return 1;
  }
  for (const w of toWrite) await writeAtomic(w.file, w.text);
  const meta = buildMetadata({ retrievedAt, startDate, endDate, instruments: reports });
  await writeAtomic(META_FILE, JSON.stringify(meta, null, 2) + "\n");
  for (const w of toWrite) console.log(`  wrote ${path.relative(process.cwd(), w.file)} (${(Buffer.byteLength(w.text) / 1024).toFixed(0)} KB)`);
  console.log(`✔ metadata · validation: ${meta.validation.status}`);
  return ids.every((id) => reports[id].ok) ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error("✖ Unexpected error:", e);
    process.exit(1);
  },
);
