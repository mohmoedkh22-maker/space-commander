# NASA DONKI offline data (V6.1)

**Status:** data-fetching stage only. **No gameplay uses this data yet**; that will be a separate, documented stage.

## What DONKI is
DONKI ("Space Weather Database Of Notifications, Knowledge, Information") is NASA's space-weather event database. It is run by
the **Community Coordinated Modeling Center (CCMC)** at NASA Goddard and served publicly through **api.nasa.gov**.

- API catalogue: https://api.nasa.gov/ (section "DONKI")
- CCMC DONKI: https://ccmc.gsfc.nasa.gov/tools/DONKI/

## Endpoints used
| Type | Endpoint | NASA id field | Time that dates the event |
|---|---|---|---|
| CME: Coronal Mass Ejection | `GET https://api.nasa.gov/DONKI/CME?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key=…` | `activityID` | `startTime` |
| FLR: Solar Flare | `GET https://api.nasa.gov/DONKI/FLR?…` | `flrID` | `beginTime` |
| SEP: Solar Energetic Particle | `GET https://api.nasa.gov/DONKI/SEP?…` | `sepID` | `eventTime` |

DONKI returns a JSON array, or an **empty body** when the range has no events (handled as zero events, not an error).

## How to sync
```bash
# 1. (recommended) put your own free key in .env.local — it is git-ignored. Get one at https://api.nasa.gov/
#    NASA_API_KEY=your-key-here
# 2. run the sync (any range; it merges into what is already stored)
npm run sync:donki -- --start=2024-05-01 --end=2024-05-31
npm run sync:donki -- --days=30                      # the last 30 days (UTC)
npm run sync:donki -- --start=... --end=... --replace  # fresh dataset (only for types that downloaded successfully)
npm run sync:donki -- --timeout=60000                # request timeout in ms (default 30000)
npm run sync:donki -- --types=SEP --start=2024-05-01 --end=2024-05-31   # only some event types
npm run sync:donki -- --pause=1500                   # ms between requests (default 1500)
```
- Requires Node ≥ 22.18 (tested on Node 24). TypeScript runs natively, so there are **no extra dependencies**.
- The key is read from `NASA_API_KEY` (shell or `.env.local`). It is **never written** to any file; stored request URLs show `api_key=***`.
- Without a key the script uses the public `DEMO_KEY`. On this network DEMO_KEY allowed only **10 requests per day**, which is enough for about three syncs.
- **Rate limits:** requests are spaced by `--pause`. NASA's `X-RateLimit-Remaining` is logged; on HTTP 429 or 0 remaining, the remaining types are
  skipped (reported as `skipped: NASA rate limit reached`) instead of being retried.
- **Key safety:** the key never appears in logs, stored URLs (`api_key=***`) or error messages (any echo of the key is redacted).
- The sync is a **manual pre-build step**. `npm run build` does not run it, and the game never calls NASA.

## Offline storage
| File | Content |
|---|---|
| `public/data/donki/events.json` | `{ schemaVersion, dataVersion, generatedAt, notice, events: DONKIEvent[] }` |
| `public/data/donki/{cme,flr,sep}.json` | one file per type: `{ schemaVersion, dataVersion, eventType, source, retrievedAt, requestedDateRange, notice, count, events }`. Rewritten **only** after that type downloads and validates; a failed or fully rejected download leaves the previous file untouched (written via temp file + rename) |
| `public/data/donki/metadata.json` | source and endpoints, `retrievedAt`, `requestedDateRange`, `coveredRanges`, counts per type, `supportedEventTypes`, `dataVersion`, `apiKeyType`, `datasets` (per type: file, endpoint, retrievedAt, requested range, count, missing optional fields, basis), `validation` (status + per-type HTTP result, accepted / rejected / duplicates), `fieldProvenance`, `isLiveData: false` |

Both are static files copied into the deployed site (`out/data/donki/…`). They can be read without a network connection to NASA.

## Data model (`src/lib/nasa/donki/donki.ts`)
```ts
interface DONKIEvent {
  id: string;                     // NASA's id, unchanged            — observed
  eventType: "CME" | "FLR" | "SEP";
  eventDate: string;              // NASA's timestamp, unchanged      — observed
  sourceLocation: string | null;  // e.g. "S17W33"; null if absent   — observed
  instruments: string[];          // display names as reported       — observed
  sourceUrl: string | null;       // DONKI page; null if absent      — observed
  retrievedAt: string;            // when our sync downloaded it     — retrieval
  observed: Record<string, unknown>;     // type-specific values copied from NASA (only those present)
  derived: { eventDateUtc: string };     // the same timestamp in full ISO form — the only derived value
  rawEvent: Record<string, unknown>;     // the original NASA object, unmodified
  dataQuality: { level: "complete" | "partial"; missingOptionalFields: string[]; notes: string[];
                 basis: "instrument" | "model" | "mixed" | "unknown" };
}
```
`observed` per type:
- **FLR:** classType, beginTime, peakTime, endTime, activeRegionNum, note
- **CME:** startTime, activeRegionNum, note, catalog, and the analysis NASA flags `isMostAccurate` (time21_5, latitude, longitude, halfAngle, speed, type)
- **SEP:** eventTime, note
- **All types:** `linkedEventIds`, when NASA links events

**Observed vs derived vs assumptions:** see `fieldProvenance` in the metadata. In V6.1 the list of simulation assumptions is **empty**.

## Validation rules
- **Required:** the NASA id and a valid DONKI timestamp (`YYYY-MM-DDTHH:MMZ`, seconds optional, a real calendar time). Otherwise the record is
  **rejected** and listed in the metadata with the reason; it is never repaired.
- **Optional fields** (location, instruments, link, class, …): if absent, they stay `null` / `[]` / not present and are listed in
  `dataQuality.missingOptionalFields`. Nothing is filled in.
- **`basis`:** DONKI sometimes lists *model/forecast* sources (e.g. `MODEL: REleASE …` for SEP). Such records are marked `basis: "model"` or
  `"mixed"` with a note, so they are not presented as direct measurements.
- **Duplicates:** a repeated id inside one response is kept once (and counted). Across syncs, an existing id is replaced only by a newer NASA
  revision (`versionId`, then `submissionTime`).
- **Failures:** HTTP errors (incl. 429 rate limit), network errors, timeouts, malformed JSON and unexpected shapes are reported per type and
  never thrown. If every request fails, the files are left unchanged. A failed type never deletes its stored events.

## Current dataset (retrieved 2026-11-15)
| | |
|---|---|
| Requested range | **2024-05-01 → 2024-05-31**: a historic period of strong solar activity, chosen for educational scenarios |
| CME | **144** events (51 with every optional field, 93 missing an active-region number and/or source location, as NASA reported them) |
| FLR | **0**: `api.nasa.gov/DONKI/FLR` answered **HTTP 404** from NASA's gateway (path `/DONKI-API/get/FLR/`) for every range tried that day; CCMC's own web service was not reachable from the build machine |
| SEP | **14** events in `sep.json` (downloaded with a personal key, HTTP 200, 14 received / 14 accepted / 0 rejected). Every record has instruments, a DONKI link and linked events, so **no optional field is missing**. **10** come from instruments (SOHO COSTEP, GOES-P SEISS, STEREO A IMPACT); **4** are model-based (`MODEL: REleASE …`) and are marked `basis: "model"` |
| Validation status | `partial` (recorded in `metadata.json` with each HTTP result) |

## Scientific limits (must stay true in later stages)
- DONKI events are observed **near Earth or on the Sun** (e.g. coronagraphs on SOHO/STEREO, GOES X-ray and particle sensors) or come from
  forecast models. They are **not measurements at the Moon or at the fictional SELENE-1 base**.
- A CME does **not** automatically threaten a lunar base. A flare class is **not** a radiation dose. No dose, flux at the Moon or lunar
  environmental value is computed or stored here.
- The data is **historical and cached**. The UI must never present it as current or live space weather (`isLiveData: false`).
- Any future gameplay effect must be a separate, documented educational assumption, linked to the NASA ids it is based on.

## Code and tests
- `src/lib/nasa/donki/donki.ts`: types, validation, normalization, merge, fetch (injectable `fetch`, timeout), metadata
- `scripts/nasa/sync-donki.ts`: CLI that writes the two files
- `src/lib/nasa/donki/donki.test.ts`: valid CME/FLR/SEP fixtures, missing optional fields, invalid timestamps, empty responses,
  duplicate ids, failed requests (HTTP 404/429/500, network, timeout), malformed JSON, model-based records, key masking, metadata.
  The test records are **fixtures shaped like DONKI**, not NASA data.
