// V6.1 — offline NASA DONKI sync. Run BEFORE building; the game never calls NASA at runtime.
//
//   npm run sync:donki -- --start=2024-05-01 --end=2024-05-31
//   npm run sync:donki -- --days=30            (the last 30 days, UTC)
//   npm run sync:donki -- --start=... --end=... --replace   (start a fresh dataset instead of merging)
//   npm run sync:donki -- --types=SEP --start=2024-05-01 --end=2024-05-31   (only some event types)
//   --pause=1500  ms between requests (rate-limit courtesy); stops early on HTTP 429 or X-RateLimit-Remaining: 0
//
// API key: set NASA_API_KEY in your shell or in .env.local (git-ignored). Without it the public DEMO_KEY is used
// (very low rate limits; for testing only). The key is never written to any output file.
//
// Output (static files, bundled with the app):
//   public/data/donki/events.json    normalized events (+ the original NASA records)
//   public/data/donki/{cme,flr,sep}.json  per-type datasets, rewritten only after a successful, validated download
//   public/data/donki/metadata.json  source, endpoints, retrieval time, date range, counts, validation report
//
// Runs with Node ≥ 22.18 / 24 (built-in TypeScript type stripping) — no extra dependencies.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildMetadata,
  DONKI_DATA_VERSION,
  DONKI_ENDPOINTS,
  DONKI_EVENT_TYPES,
  fetchDonki,
  isValidDate,
  mergeEvents,
  normalizeBatch,
  typeDatasetSummary,
  typeFileName,
  type DONKIEvent,
  type DONKIEventType,
  type DONKIMetadata,
  type TypeDataset,
  type TypeReport,
} from "../../src/lib/nasa/donki/donki.ts";

const OUT_DIR = path.join(process.cwd(), "public", "data", "donki");
const EVENTS_FILE = path.join(OUT_DIR, "events.json");
const META_FILE = path.join(OUT_DIR, "metadata.json");

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : process.argv.includes(`--${name}`) ? "true" : undefined;
}

const day = (d: Date) => d.toISOString().slice(0, 10);

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Write via a temp file + rename, so an interrupted run never leaves a half-written dataset behind. */
async function writeAtomic(file: string, text: string) {
  const tmp = `${file}.tmp`;
  await writeFile(tmp, text);
  await rename(tmp, file);
}

async function main(): Promise<number> {
  const today = new Date();
  const days = Number(arg("days") ?? 30);
  const endDate = arg("end") ?? day(today);
  const startDate = arg("start") ?? day(new Date(Date.parse(`${endDate}T00:00:00Z`) - (Math.max(1, days) - 1) * 86400000));
  const timeoutMs = Number(arg("timeout") ?? 30000);
  const pauseMs = Math.max(0, Number(arg("pause") ?? 1500));
  const replace = arg("replace") === "true";
  const typesArg = arg("types");
  const types = (typesArg && typesArg !== "true" ? typesArg.split(",").map((t) => t.trim().toUpperCase()) : [...DONKI_EVENT_TYPES]) as DONKIEventType[];

  if (!isValidDate(startDate) || !isValidDate(endDate) || startDate > endDate) {
    console.error(`Invalid date range ${startDate} → ${endDate} (use --start=YYYY-MM-DD --end=YYYY-MM-DD)`);
    return 2;
  }
  const unknown = types.filter((t) => !DONKI_EVENT_TYPES.includes(t));
  if (unknown.length || !types.length) {
    console.error(`Unknown event type(s): ${unknown.join(", ") || "(none given)"} — use --types=${DONKI_EVENT_TYPES.join(",")}`);
    return 2;
  }
  const envKey = process.env.NASA_API_KEY?.trim();
  const apiKey = envKey || "DEMO_KEY";
  const apiKeyType = envKey ? "NASA_API_KEY" : "DEMO_KEY";
  if (!envKey) console.warn("⚠ NASA_API_KEY is not set — using DEMO_KEY (low rate limits, testing only).");
  else console.log("Using NASA_API_KEY from the environment (value not shown).");

  console.log(`NASA DONKI sync · ${startDate} → ${endDate} · types: ${types.join(", ")}`);
  const retrievedAt = new Date().toISOString();
  const prevMeta = await readJson<DONKIMetadata>(META_FILE);
  const fresh: DONKIEvent[] = [];
  const perType = {} as Record<DONKIEventType, TypeReport>;
  const succeeded = new Set<DONKIEventType>();
  let rateLimited: string | null = null;

  for (const [i, type] of types.entries()) {
    if (rateLimited) {
      console.warn(`  ${type}: SKIPPED — ${rateLimited}`);
      perType[type] = { requestUrl: "", ok: false, httpStatus: null, error: `skipped: ${rateLimited}`, received: 0, accepted: 0, duplicatesInResponse: 0, rejected: [] };
      continue;
    }
    if (i > 0 && pauseMs) await sleep(pauseMs); // be gentle with the shared api.nasa.gov gateway
    const res = await fetchDonki(type, startDate, endDate, { apiKey, timeoutMs });
    const rl = res.rateLimit;
    if (rl.remaining !== null) console.log(`  (rate limit: ${rl.remaining} requests left)`);
    if (res.httpStatus === 429 || rl.remaining === 0) {
      rateLimited = `NASA rate limit reached${rl.retryAfterSec ? ` (retry after ${Math.ceil(rl.retryAfterSec / 60)} min)` : ""}`;
    }
    if (!res.ok) {
      console.error(`  ${type}: FAILED — ${res.error}`);
      perType[type] = { requestUrl: res.url, ok: false, httpStatus: res.httpStatus, error: res.error, received: 0, accepted: 0, duplicatesInResponse: 0, rejected: [] };
      continue;
    }
    const batch = normalizeBatch(type, res.records, retrievedAt);
    perType[type] = {
      requestUrl: res.url,
      ok: true,
      httpStatus: res.httpStatus,
      error: null,
      received: res.records.length,
      accepted: batch.events.length,
      duplicatesInResponse: batch.duplicates.length,
      rejected: batch.rejected,
    };
    console.log(
      `  ${type}: HTTP ${res.httpStatus} · received ${res.records.length} · accepted ${batch.events.length}` +
        (batch.rejected.length ? ` · rejected ${batch.rejected.length}` : "") +
        (batch.duplicates.length ? ` · duplicates ${batch.duplicates.length}` : ""),
    );
    for (const r of batch.rejected) console.warn(`    rejected ${r.id ?? "(no id)"}: ${r.reason}`);
    // A response whose records were ALL rejected is not a valid dataset: it never replaces stored data.
    if (res.records.length > 0 && batch.events.length === 0) {
      console.error(`  ${type}: every record failed validation — stored ${type} data left unchanged`);
      perType[type] = { ...perType[type], ok: false, error: "every received record failed validation" };
      continue;
    }
    fresh.push(...batch.events);
    succeeded.add(type);
  }

  if (!succeeded.size) {
    console.error("✖ No request produced a valid dataset. Existing files were left unchanged.");
    return 1;
  }

  // Types not requested in this run keep their previous report.
  for (const t of DONKI_EVENT_TYPES) {
    if (!perType[t]) {
      perType[t] = prevMeta?.validation?.perType?.[t] ?? {
        requestUrl: "",
        ok: false,
        httpStatus: null,
        error: "not downloaded yet",
        received: 0,
        accepted: 0,
        duplicatesInResponse: 0,
        rejected: [],
      };
    }
  }

  // Merge with what is already stored (no duplicates; newer NASA revisions win).
  // --replace starts fresh ONLY for the types downloaded successfully in this run: a failed request never deletes stored data.
  const stored = (await readJson<{ events: DONKIEvent[] }>(EVENTS_FILE))?.events ?? [];
  const keep = replace ? stored.filter((e) => !succeeded.has(e.eventType)) : stored;
  const merged = mergeEvents(keep, fresh);

  const datasets: Partial<Record<DONKIEventType, TypeDataset>> = { ...(prevMeta?.datasets ?? {}) };
  for (const t of succeeded) {
    datasets[t] = typeDatasetSummary(t, merged.events.filter((e) => e.eventType === t), retrievedAt, startDate, endDate);
  }
  const meta = buildMetadata({
    retrievedAt,
    startDate,
    endDate,
    events: merged.events,
    perType,
    apiKeyType,
    previousRanges: replace ? undefined : prevMeta?.coveredRanges,
    datasets,
  });

  await mkdir(OUT_DIR, { recursive: true });
  // Per-type files: written ONLY for types that downloaded and validated in this run.
  for (const t of succeeded) {
    const file = path.join(OUT_DIR, typeFileName(t));
    const events = merged.events.filter((e) => e.eventType === t);
    await writeAtomic(
      file,
      JSON.stringify(
        {
          schemaVersion: 1,
          dataVersion: DONKI_DATA_VERSION,
          eventType: t,
          source: DONKI_ENDPOINTS[t],
          retrievedAt,
          requestedDateRange: { startDate, endDate },
          notice: meta.notice,
          count: events.length,
          events,
        },
        null,
        1,
      ) + "\n",
    );
    console.log(`  ${path.relative(process.cwd(), file)} · ${events.length} ${t} events`);
  }
  await writeAtomic(
    EVENTS_FILE,
    JSON.stringify({ schemaVersion: 1, dataVersion: DONKI_DATA_VERSION, generatedAt: retrievedAt, notice: meta.notice, events: merged.events }, null, 1) + "\n",
  );
  await writeAtomic(META_FILE, JSON.stringify(meta, null, 2) + "\n");
  console.log(
    `✔ ${merged.events.length} events stored (${merged.added} new, ${merged.replaced} updated) · CME ${meta.counts.CME} · FLR ${meta.counts.FLR} · SEP ${meta.counts.SEP} · validation: ${meta.validation.status}`,
  );
  for (const t of succeeded) {
    const miss = Object.entries(datasets[t]?.missingOptionalFields ?? {});
    console.log(`  ${t} missing optional fields: ${miss.length ? miss.map(([f, n]) => `${f} ×${n}`).join(", ") : "none"}`);
  }
  console.log(`  ${path.relative(process.cwd(), EVENTS_FILE)}\n  ${path.relative(process.cwd(), META_FILE)}`);
  return types.every((t) => succeeded.has(t)) ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error("✖ Unexpected error:", e);
    process.exit(1);
  },
);
