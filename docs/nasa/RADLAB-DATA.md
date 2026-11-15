# NASA OSDR RadLab offline data (WP06.3)

**Status:** data stage only. **No gameplay, simulation or resource calculation uses this data yet.** The game never calls RadLab.

## Source
**RadLab** is the space-radiation portal of NASA's **Open Science Data Repository (OSDR)**. It is a public API and needs no key.

- API: `https://visualization.osdr.nasa.gov/radlab/api/`
- Documentation: https://visualization.osdr.nasa.gov/radlab/gui/data-api/. It answered **HTTP 500** when this stage was built, so the request
  syntax and units were read from the archived copy dated 2024-05-22:
  http://web.archive.org/web/20240522074550/https://visualization.osdr.nasa.gov/radlab/gui/data-api/
- The instrument inventory came from the portal's own coverage endpoint (`/api/aux/?kind=scaled_timestamps`), which is not documented.

## Approved instruments
| Instrument ID (unchanged) | Spacecraft | Where the measurement was taken | Role |
|---|---|---|---|
| `CRaTER-D1D2` | LRO (Lunar Reconnaissance Orbiter) | **Lunar orbit**: **not** the lunar surface, **not** the fictional SELENE-1 base | primary |
| `BPD` | BioSentinel | **Heliocentric orbit at about 1 AU**: deep space, **not** near the Moon | secondary (comparison) |

No other RadLab instrument is used. ISS instruments in particular are excluded: the ISS is in low Earth orbit, inside Earth's magnetosphere.

## Request
Read-only `GET`, using RadLab's key-value syntax. The end date is inclusive and is sent as `timestamp<next day`:
```
https://visualization.osdr.nasa.gov/radlab/api/?instrument_id=CRaTER-D1D2&timestamp%3E=2024-05-01&timestamp%3C2024-05-08
  &absorbed_dose_rate&dose_equivalent_rate&flux&spacecraft&trajectory&celestial_body&instrument&instrument_family&format=json
```
The response is pandas **"split" JSON**: `{"columns":[…],"index":[…],"data":[[…]]}`. The range is fetched in 7-day chunks, with a 2-second pause
between requests.

## How to sync
```bash
npm run sync:radlab                                    # defaults: 2024-05-01 → 2024-05-31, both instruments
npm run sync:radlab -- --start=2024-05-01 --end=2024-05-31
npm run sync:radlab -- --instruments=CRaTER-D1D2       # only approved IDs are accepted
npm run sync:radlab -- --chunk-days=7 --pause=2000 --timeout=120000
```
This is a manual pre-build step: `npm run build` does not run it. It needs no API key and no extra dependencies (Node ≥ 22.18).

## Offline storage (`public/data/radlab/`)
| File | Content |
|---|---|
| `crater-d1d2.json`, `bpd.json` | validated records in columnar form: `columns` + `records` rows `[timestamp, timestampUtcAssumed, absorbed_dose_rate, dose_equivalent_rate, flux, qualityFlags]`, plus provenance (`contextAsReturned`), units, detector-material status, the timestamp note, the request URLs and the scientific limitations |
| `raw/crater-d1d2.raw.json`, `raw/bpd.raw.json` | **every RadLab response exactly as received**, one per request, with its URL, range and HTTP status |
| `metadata.json` | source, API and documentation links, `retrievedAt`, `requestedDateRange`, units, timestamp convention, detector-material status. Per instrument: requests, received / accepted / rejected rows (each rejection with its reason and raw row), duplicates, first and last timestamp, median cadence, null / zero counts per field. Also `validation.status`, `scientificLimitations`, `isLiveData: false` |

**RadLab and DONKI are separate datasets** (`public/data/radlab/` vs `public/data/donki/`). Their raw records are never combined.

**Failed syncs never destroy data:**
- An instrument's files are rewritten **only** if every request for it succeeded and at least one row validated.
- Files are written through a temp file and a rename.
- If no instrument succeeds, nothing is written at all.
- A failed instrument keeps its previous files, and the metadata records this in `keptPrevious`.

## Units (from the RadLab documentation; the API response carries none)
| Field | Unit | Meaning |
|---|---|---|
| `absorbed_dose_rate` | μGy/hour | Absorbed dose rate **as reported by the detector** |
| `dose_equivalent_rate` | μSv/hour | Dose-equivalent rate, **only where the instrument reports it** |
| `flux` | cm⁻² sr⁻¹ s⁻¹ | Particle flux, only where the instrument reports it |

## Validation rules
- **Required:**
  - `instrument_id` must equal the requested ID exactly (IDs are case-sensitive in RadLab).
  - `timestamp` must be `YYYY-MM-DDTHH:MM[:SS]` with no timezone, a real calendar time, inside the requested range.
- **Measurements:** a finite number ≥ 0, or `null`. Non-numeric, `NaN` and negative values are **rejected**, with the raw row and a reason.
  Nothing is repaired.
- **Provenance:** if `spacecraft` or `trajectory` differs from the approved source (e.g. `Moon surface`, `ISS`), the row is rejected, so a
  measurement can never be relabelled.
- **Duplicates on (instrument, timestamp):**
  - An identical repeat is kept once and counted.
  - A conflicting repeat keeps the first occurrence and records the dropped raw row.
- **Nulls** stay `null`. A column RadLab did not return is listed in `fieldsNotReturned`, so it is not confused with a NASA null.
- **Zero readings** are kept as `0` and flagged `zero_value`.

## Current dataset (retrieved 2026-11-15, range 2024-05-01 → 2024-05-31)
| | CRaTER-D1D2 (lunar orbit) | BPD (heliocentric, 1 AU) |
|---|---|---|
| Records (received = accepted) | **744** | **44,130** |
| Rejected / duplicates | 0 / 0 | 0 / 0 |
| First → last timestamp | 2024-05-01T00:59:59 → 2024-05-31T23:59:59 | 2024-05-01T00:00:00 → 2024-05-31T23:59:00 |
| Median spacing | 3600 s (hourly) | 60 s |
| Gaps (not filled) | none | 315 gaps longer than 1.5× the spacing; the longest is 5 min |
| `absorbed_dose_rate` range | 4.56 → 3,151.75 μGy/h | 0 → 652.67 μGy/h |
| `absorbed_dose_rate` = 0 | 0 | **131** (flagged) |
| `dose_equivalent_rate` | null in every record (not reported) | null in every record (not reported) |
| `flux` | null in every record (not reported) | null in every record (not reported) |
| Validation | valid | valid |

**What the data shows:** both instruments record strongly raised absorbed-dose rates around 10–15 May 2024. In the same period, NASA DONKI lists
solar energetic particle events in `public/data/donki/sep.json`. This is a **temporal coincidence only**. This dataset does not establish
causation, and no association is stored.

## Scientific limitations (must stay true in later stages)
1. CRaTER-D1D2 values are **lunar-orbit** measurements aboard LRO. They are **not lunar-surface values**, and no surface value is derived from
   them.
2. BPD values come from **heliocentric orbit at about 1 AU**. They are not measurements near the Moon.
3. `absorbed_dose_rate` is the **detector's** absorbed dose rate. It is **not an astronaut, tissue or biological dose**, and no conversion is
   applied.
4. **No equivalent dose is inferred** from absorbed dose. `dose_equivalent_rate` is stored only as RadLab returns it (here: always null).
5. **Detector materials are unknown.** The API does not state them, and the RadLab knowledgebase answered HTTP 500 at retrieval. They are
   recorded as `null` / unknown, not assumed.
6. **Timezone is unconfirmed.** Timestamps are stored exactly as returned, with no timezone. `timestampUtcAssumed` is a convenience field that
   reads them as UTC. This is an **assumption**.
7. **Zero readings** may be real low readings, dropouts or processing artefacts. They are never interpreted as zero radiation.
8. **Gaps and nulls are preserved.** Nothing is interpolated or filled.
9. **Shielding is not comparable.** Each detector sits inside its own spacecraft and housing. Its values do not describe a habitat's
   radiation environment.
10. **Historical and cached:** never present this data as current or live space weather (`isLiveData: false`).
11. **DONKI:** any future association with DONKI events must be labelled as **correlation, not causation**.

## Code and tests
- `src/lib/nasa/radlab/radlab.ts`: approved sources, units, split-JSON parser, timestamp and row validation, de-duplication, request builder,
  read-only fetch (injectable `fetch`, timeout, never throws), descriptive statistics, metadata builder
- `scripts/nasa/sync-radlab.ts`: CLI that writes the files above (`npm run sync:radlab`)
- `src/lib/nasa/radlab/radlab.test.ts`: **19 tests**. They cover:
  - parsing, including malformed and wrong-shape responses
  - timestamps
  - validation: IDs, provenance, numeric values, ranges
  - missing and null values, and zero readings
  - duplicates
  - failed requests: RadLab HTML errors, HTTP errors, network errors, timeouts, malformed bodies
  - URL and chunk building, statistics, metadata

  The test rows are **fixtures shaped like RadLab responses**, not NASA data.
