# Scientific Scenario Engine (WP06.4)

**Status:** educational data layer (WP06.4), **shown in the game since WP06.5** (see [In the game](#in-the-game-wp065)). The simulation
engine, resource calculations, decision mechanics, the What If engine and SUHAIL's design are unchanged; lessons never change the mission.

The engine turns the cached NASA datasets into structured, traceable, bilingual (AR/EN) **educational scenarios**. Every number in a scenario
is copied from an identified NASA record. Nothing is computed into a new physical quantity, converted, filled in or invented.

## Architecture
```
public/data/donki/events.json + metadata.json ──► donkiScenarios.ts  ──┐  (DONKI only)
public/data/radlab/crater-d1d2.json            ──► radlabScenarios.ts ──┤  (RadLab only)
public/data/radlab/bpd.json                    ──┘                      ├─► engine.ts: generateScenarios() ─► validateScenarioSet()
                                                    suhailLessons.ts ◄──┘           │
                                                                                    ▼
                                                     scripts/nasa/build-scenarios.ts ─► public/data/scenarios/scenarios.json
```
| File (`src/lib/nasa/scenarios/`) | Role |
|---|---|
| `types.ts` | `ScientificScenario`, `SuhailLesson`, `ScenarioSet`, and the category → dataset rule |
| `donkiScenarios.ts` | CME / SEP / FLR scenarios, from DONKI records only |
| `radlabScenarios.ts` | lunar-orbit (CRaTER-D1D2) and deep-space (BioSentinel BPD) scenarios, from RadLab records only |
| `suhailLessons.ts` | the three featured SUHAIL lessons, built on generated scenarios |
| `common.ts` | shared bilingual limitations, the "no invented confidence" rule, What If hooks |
| `engine.ts` | `generateScenarios()` (pure, deterministic) and the scientific-rule validator |
| `scenarios.test.ts` | 34 tests, mostly on the real offline data |

- **Pure and deterministic:** no clock, no randomness, no network. The same inputs produce byte-identical output in any input order.
- **Separate datasets:** a scenario uses only DONKI **or** only RadLab records. The validator rejects any mix. Raw datasets are read and
  never modified.
- **Offline:** generation reads only the local files. The game never calls NASA.

## Running it
```bash
npm run build:scenarios   # writes public/data/scenarios/scenarios.json only if every rule passes; otherwise the old file is kept
npm test                  # includes a check that the committed scenarios.json matches a fresh generation
```
If DONKI or RadLab data is re-synced (`npm run sync:donki`, `npm run sync:radlab`), run `npm run build:scenarios` again.

## Scenario fields
Each `ScientificScenario` has:

- **Identity:** `id` (unique), `category`, `title`, `description` (AR/EN).
- **Classification and context:** `classification`, `observationContext` and `contextDescription`.
- **Provenance:** `source` (dataset, provider, endpoint, offline file, `retrievedAt`, data version) and `sourceRecords`. Each source record
  has the NASA id or `instrument@timestamp`, its timestamp and URL, and whether it is stored offline.
- **Timing:** `observationDate`, and `observationWindow` for multi-record scenarios.
- **Values:** `measurements` (value, **unit**, unit source, record id, derivation) and `missingMeasurements` (name plus the reason it is
  missing).
- **Quality:** `dataQuality` contains the source indicators copied from NASA, `confidence: null` with a note, and the uncertainties.
- **Education:** `limitations`, `educationalObjective`, `decisionOptions` (2–3, each with an educational consequence only),
  `expectedLearningOutcome`.
- **Links:** `whatIf` hook and `relations`.

**Classification:**

| Value | Meaning |
|---|---|
| `historical-observation` | a NASA record from instruments |
| `historical-model-output` | a historical NASA record whose source is a forecast model (e.g. `MODEL: REleASE`) |
| `historical-reference-only` | NASA references the record by id, but its details are not available offline |
| `simulated` | reserved for invented game content. Generated scenarios may **never** use it; the validator enforces this |

**Derivation of values:**
- `as-recorded`: the record's own value.
- `selected-daily-maximum`: the largest value of one day, **copied from one identified record**. This is not an average and not a
  computation.

## Scenarios generated (from the datasets retrieved 2026-11-15)
| Category | Count | Source records | How they are chosen |
|---|---|---|---|
| SEP | 14 | 14 DONKI SEP records (10 instrument, 4 model) | every stored SEP record |
| CME | 8 | 8 DONKI CME records | the CMEs that **NASA DONKI itself links** to an SEP event |
| FLR | 1 | 52 FLR ids referenced in DONKI linked-event lists | the FLR endpoint returned HTTP 404, so this scenario is about **missing data**: no flare values exist here |
| Lunar orbit radiation | 2 | CRaTER-D1D2: quiet day 2024-05-05, busiest day 2024-05-14 | day with the lowest daily maximum / day with the dataset's highest value |
| Deep-space comparison | 2 | BioSentinel BPD: busiest day 2024-05-13, quiet day 2024-05-20 | same rule |
| **Total** | **27** | **78 distinct NASA records** | |

**SUHAIL lessons (3):**
1. **Solar particle alert.** Based on SEP `2024-05-10T13:35:00-SEP-001` (GOES-P SEISS >10 MeV). The lesson: a detection near Earth is not a
   measurement on the Moon.
2. **Above the Moon or on it?** Based on CRaTER's busiest-day reading. The lesson: lunar orbit is not the lunar surface, and a detector
   reading is not a human dose.
3. **They happened together; did one cause the other?** Based on the CRaTER and BioSentinel peaks plus the SEP events of May 2024. The
   lesson: correlation is not causation. Its relation is labelled `temporal-correlation-only`.

Each lesson has:
- a SUHAIL introduction and a child-friendly explanation
- a challenge, and 2–3 choices, each with an educational consequence
- a learning objective
- the NASA records it quotes, and its limitations

SUHAIL keeps its existing identity and expressions (`src/lib/game/companion.ts`). It explains and encourages, and never chooses for the child.

## Scientific safety rules (enforced by `validateScenarioSet` and the tests)
1. **CRaTER is lunar ORBIT:** `observationContext: "lunar-orbit"`, and every CRaTER scenario carries the limitation "not on the surface".
2. **BioSentinel is never lunar:** `heliocentric-1au`, and the text states it is not at or near the Moon.
3. **Detector dose ≠ biological dose:** any sentence mentioning a human, astronaut or body together with "dose" must be explicitly negated.
   Every radiation scenario states the reading is not a dose in an astronaut's body. No equivalent dose is derived.
4. **Correlation ≠ causation:**
   - Causal wording ("caused", "due to", …) is rejected unless it is negated.
   - Temporal relations must deny causation.
   - DONKI's own linked events are stored separately, as `nasa-linked-events`, copied as NASA gives them.
5. **Missing stays missing:** absent values are listed in `missingMeasurements` with a reason, never filled. A value cannot be both measured
   and missing.
6. **Historical ≠ simulated:** generated scenarios are always historical. Model-based SEP records are marked `historical-model-output`.
7. **No resource penalties:** `whatIf.resourceEffects` is always `null`. Radiation is never converted into oxygen, water, food or energy
   effects.
8. **No invented confidence:** `confidence` is always `null`, because neither DONKI nor RadLab provides one. Source quality indicators are
   copied as given.
9. **Uncertainty is preserved:** the unconfirmed RadLab timezone, the unknown detector material, zero readings (not "zero radiation") and
   unfilled gaps are stated.

The validator also checks:
- unique ids
- a valid source block and record types per category
- finite values, with a unit and unit source, pointing at a referenced record
- no negative rates, speeds or angular widths (coordinates may be negative)
- Arabic and English text present
- no frightening words
- sentences of at most 40 words in lessons
- `isLiveData: false`

## Units
- **RadLab `absorbed_dose_rate`:** `μGy/hour`, copied from the dataset. Its source is the RadLab Data API documentation (archived
  2024-05-22).
- **DONKI CME analysis:** speed in `km/s`; latitude, longitude and half-angle in `deg`. These follow the NASA CCMC DONKI convention
  (https://ccmc.gsfc.nasa.gov/tools/DONKI/). The API response itself carries no units, so each value cites this source.
- **DONKI SEP:** no measured value. The energy channel (e.g. ">10 MeV") is part of the instrument name and is kept as text.

## What If compatibility
Each scenario has a `whatIf` hook:
- a qualitative question
- `linkedDecisionId: "d3-emergency"` (the game's existing solar-particle decision)
- `predictionDirections` using the What If Lab's own `Prediction` type
- `resourceEffects: null`

The What If engine and decision mechanics are **not modified**; only their public types are referenced.

## In the game (WP06.5)
**How players reach the lessons**
- Start menu → **🔭 SUHAIL's Science Lessons** (`data-menu-item="lessons"`, right after "About the Science")
- Commander Report (end of the mission) → **🔭 SUHAIL's Science Lessons**

The lessons open as an overlay like "About the Science", so the mission underneath keeps its place.

**Guided path** (`src/components/screens/ScienceLessons.tsx`):

1. **Home:**
   - SUHAIL's welcome.
   - The **three featured lessons**, with the next one highlighted and ✓ on finished ones.
   - "x / 3 lessons done".
   - An optional **Science archive** with all 27 scenarios grouped by category, each expandable.
2. **Lesson, step 1:** SUHAIL's introduction, with his expression from the lesson data.
3. **Step 2:**
   - The child-friendly explanation.
   - The **NASA source** panel: classification badge, dataset, observation date, where it was measured, the recorded value with
     its unit (or "No measured value in this record"), NASA record ids (DONKI ids link to the DONKI page) and the scientific limits.
4. **Step 3:**
   - The challenge and 2–3 choices.
   - On a choice, SUHAIL gives **educational feedback**. The child may try the other choices.
   - The learning objective follows, with "This lesson does not change your base's resources or decisions".
5. **What If connection:**
   - It shows the game's Mission 03 storm as **🎮 Simulated: a game training scenario** next to the lesson's **🛰 Historical NASA
     record**, then the scenario's qualitative What If question.
   - If this session's mission is finished, it also shows the child's real choice for *The Final Signal* (`d3-emergency`) and a
     button that opens the existing **What If Lab** with the unchanged decision history. Otherwise it asks the child to finish
     the mission first.
   - No numbers are compared or invented.

**Logic** (`src/lib/game/scienceLessons.ts`, pure):
- lesson progress under its own key `space-commander-science-lessons` (never `space-commander-progress`), with sanitised parsing
- classification and dataset labels
- `whatIfConnection()`
- `isolateLtr()`, which keeps NASA ids, ISO dates, instrument names and units readable inside Arabic sentences (Unicode
  directional isolates; the visible characters are unchanged)

The scenario file is loaded with a code-split `import()` from `public/data/scenarios/scenarios.json`. This is a local static
file, not a NASA request, and the first-load JavaScript is unchanged.

**Tests:**
- `src/lib/game/scienceLessons.test.ts`
- `src/components/screens/ScienceLessons.test.tsx`
- `src/components/ScienceLessons.game.test.tsx`

They cover navigation, rendering, attribution, labels, choices, feedback, the What If hand-off, save/load, Arabic and the
responsive layout. The start-menu test now expects the new `lessons` item.

## Limitations
- The What If connection is qualitative. The What If engine does not simulate NASA events, and radiation never becomes a resource
  effect.
- May 2024 is a historical period. It is **not** the game's mission week (2026-05-29) and must never be presented as a forecast.
- FLR details are unavailable until NASA's FLR endpoint works again.
- The "quiet" and "busiest" days are relative to May 2024 in each dataset only.
