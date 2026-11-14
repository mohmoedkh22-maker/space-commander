# progress.md

## 2026-11-14 · V0.5 (prompt label): NASA Science Integration
Comes after the V3 release (cinematic gameplay). The game version number has not been changed yet.

**Done**
- **Source reviewed: NASA SVS 5027** (primary candidate). It offers movies, frames and images, but no numeric files. Its frames
  are feasible to sample, but the printed "Shackleton" label covers our base site (and the scale is about 0.57 km/px). Documented
  decision: we measured the companion product **NASA SVS 4930** instead (same team, method and inputs: LOLA DEM + DE421;
  no labels; about 0.11 km/px)
- `scripts/extract_svs_illumination.py`: reads all 4,380 frames of 2026 (every 2 h) with HTTP Range requests (TIFF directory + the
  few LZW rows around the site; the decoder was checked byte-for-byte against Pillow), fits the map geometry (88°S ring, Shackleton
  check), and samples the site and a permanent-shadow control. The time axis was checked against the time printed on frames 1, 2000 and 4380
- `scripts/build_svs_dataset.py` (offline) → `src/data/nasa/svs-4930-selene1-2026.json`: 365 daily sunlit fractions + provenance,
  method, validation, limitations. Raw per-frame values are kept in `data/svs4930/selene1_luminance_2026.csv`
- Validation: 2026 **91.3 %** sunlit vs LOLA 18.6-year **88.4 %** at the same site; the Shackleton floor control is **0 %** in all frames.
  Threshold fixed after review: shadow renders exactly black, so dim low-angle sunlight counts as lit. The cut-off sensitivity is documented
- **`src/lib/nasa/NASADataAdapter.ts`**: schema validation, date validation, day/window lookups, brightest/darkest real weeks,
  and **missing-data fallback** to the labelled LOLA average (per day, or for the whole file if it fails validation). Static data, works offline
- **Engine connected:** `missionDayLight(day)` → `solarForDay` → `runDay`. Mission days map to the real week 2026-05-29 … 06-04
  (`MISSION_CALENDAR`, a design choice). Panels now make 119 / 102 / 68 / 170 / 204 / 187 / 85 kWh. The fictional
  `SCENARIO_LIGHT_FACTOR` was removed. The day log records `lightDate`, `sunlitFraction` and `lightSource`
- NASA values are now shown in the energy warning, the "Read the light forecast" clue, the day explanations and the decision card, each with its date
- **About the Science** screen rebuilt: the whole year as a chart, a scenario selector (mission week / brightest / darkest real week) showing
  energy per day against the 180 kWh need, the formula with NASA inputs and game assumptions colour-coded, checks, simplifications and sources
- Balance: all three endings are still reachable. Farming at full power never reaches *Accomplished*; saving energy keeps more options open
- Tests: **67 passing** (15 new in `NASADataAdapter.test.ts`: loading, schema, input validation, calculations, missing data, reproducibility).
  tsc, eslint and build pass. Checked in the browser at desktop and 375 px

**Not done / limits**
- No live NASA API: SVS has none for this. The app uses the verified static extract, attributed in the app
- Values are measured from rendered frames (binary lit/dark per 2 h, ~330 m sample), not from a published numeric product
- The player cannot yet choose the mission week for gameplay. The scenario selector is in About the Science only, to keep the tested balance

## 2026-11-14 · V0.5: Cinematic gameplay experience
**New flow for every mission:** cinematic intro → interactive base (investigate) → decision → consequences in the world → mission debrief → next mission.

**Implemented and tested in the browser (desktop 1440 px and mobile 375 px)**
- **Mission intros** (`experience/MissionIntro.tsx`): an atmosphere layer per mission (fading Sun / water alarm and falling drops / storm streaks
  and red alarm), title reveal, multi-speaker dialogue with crew portraits (`ScriptDialogue`: typed subtitles, Continue / Replay / Skip), objective, Start; Skip at any time
- **Interactive base** (`experience/BaseHub.tsx`): live base map from the engine (battery gauge on the power station,
  greenhouse light follows its condition, pulsing beacon on the facility with the emergency); 5 inspectable facilities
  with condition, resource values, owner's report, SUHAIL's explanation and **equipment inspections that reveal clues**;
  crew comms that react to events; "To the decision room" unlocks after enough clues (2/2/1) and, in Mission 03, the 4 engine safety steps
- **Data-driven events** (`lib/game/experience.ts`): ENERGY_WARNING (solar forecast, Mission 01), WATER_WARNING (actual recycler fault),
  SPACE_WEATHER (critical, Mission 03), LOW_RESERVE (energy below 150 after Mission 01), CROP_DELAY. Each has a trigger, title, description,
  map facility, character dialogue, interaction and consequence
- **Decision screen**: the investigation notes found by the player, and each option's real daily cost (energy used vs. panel output) computed by the engine
- **Visible consequences**: the base map switches from "Before your decision" to "Base now" (battery gauge, greenhouse light and
  facility statuses animate), resource tiles count to their new values, and facility changes are listed
- **Mission debrief** (`experience/MissionResult.tsx`): status, the decision and its consequences, animated start→end resources,
  facility conditions, crew safety, **which next-mission options will be locked or open** (computed in the exact state the player will face), and SUHAIL's closing line
- Polish: press feedback on buttons, alert pulses, clue toasts, count-up numbers; everything respects Reduce Motion
- Replaced the old FaultEvent / StormEvent / SafetyScreen in the flow (the components still exist); engine and endings unchanged
- Tests: **52 passing** (12 new in `experience.test.ts`: event triggers, inspection conditions, clues, option costs from the engine, carried locks)

**Not done / limits**
- Character expressions are portrait art with pulses and mood badges; eyes and mouths are not animated (no layered art)
- Clues are not saved with session progress (resuming keeps decisions, not clues)

## 2026-11-14 · V0.4 (revised spec): Decision & simulation engine
**Done**
- GameState restructured to the spec: `resources{energy,water,oxygen,food}`, `facilities{powerStation,waterRecycling,greenhouse,lifeSupport,shelter}`,
  `crewSafety`, `safetyChecks`, `decisionHistory`, `activeMissionId`, `missionResults`, `missionStatus`
  (IN_PROGRESS → MISSION_ACCOMPLISHED / SAFE_BUT_LIMITED / MISSION_INTERRUPTED)
- Resource limits in `RESOURCE_LIMITS`; NaN and Infinity are rejected (`sanitizeResources`, `applyResourceEffects`)
- Decision options are now pure data: id, title, description, prerequisites, policy, resource effects, facility effects,
  consequences and explanation. The engine interprets them (`lockReason`, `applyDecision`, `tryApplyDecision`)
- Mission 01 has exactly 3 options (Prioritize greenhouse / Conserve energy / Balance loads); Mission 02 has 3 (Increase recycling,
  which needs ≥ 150 kWh / Reduce greenhouse water / Inspect & repair); Mission 03 has 3, each requiring the 4 safety checks
- `safety.ts`: the 4 safety steps run through the engine and cannot be bypassed; `isMissionAvailable` gates each chapter
- `dialogue.ts`: SUHAIL's data-driven rules (LOW_ENERGY, LOW_WATER, LOW_GREENHOUSE, GOOD_ENERGY, SAFETY_WARNING, OPTIONS_LIMITED)
- `whatif.ts`: `replayFromState` replays from the exact saved state; the original timeline is never mutated
- UI: the engine validates every confirm; options show their description; the result screen lists the stored consequences,
  the science behind them and SUHAIL's reaction; the safety screen uses the engine's checks
- Tests: 40 passing (the 12 required cases plus the NASA, energy-model and shape tests)
- Removed: "inspect the power station" (Mission 01) and "rationing" (Mission 02), to match the 3-option spec

### Earlier V0.4 pass
- `GameState` now holds day, energy, water, oxygen, food, **facility conditions**, **crew safety**, **decision history**,
  **active mission** and **mission outcome** (`src/lib/game/types.ts`)
- Named types: `Mission`, `Decision`, `DecisionOption`, `ResourceEffect`, `Consequence`, `GameEvent`, `MissionResult`
- Data-driven chapters and events in `missions.ts` (Mission 01 Energy, Mission 02 Water & Food, Mission 03 Safety); decisions stay in `decisions.ts`
- Engine: pure, immutable transitions; validation rejects unknown, locked or repeated decisions; resources clamped to limits;
  detailed day log (light, load breakdown, recovery, crop growth)
- `consequences.ts`: `explainDay` ("why did this happen?"), `explainFacilities`, state-aware `guidanceFor` (SUHAIL), `missionResult` (reasons for the ending)
- UI: "Why did this happen?" panel on results, days and the ending; SUHAIL guidance follows the state; the base map reflects facility conditions
- Optional progress saved on the device (`persistence.ts`, validated) with "Continue my mission" on the start screen
- `docs/simulation-assumptions.md`: every constant is labelled as an educational assumption, pending review by the NASA Data Lead
- Tests: **42 passing** (22 new: state shape, immutability with frozen state, determinism, limits, invalid decisions,
  one Day-2 choice → resources, facility, options, guidance and outcome, explanations, persistence)
- Checked in the browser: explanations, guidance changes, save, reload and resume, then a full run to the ending

**Success criteria**
Every option leads to a different state ✓ · an early choice changes later events ✓ · different choices give different results ✓ ·
the same choices give the same results ✓ · tests and build pass ✓

## 2026-11-14 · Release v0.2: Cinematic introduction
- 7-scene cinematic (`src/components/cinematic/`), procedural audio (`src/lib/audio.ts`), bilingual script (`src/lib/cinematicScript.ts`)
- Onboarding saved in settings (`introDone`); Skip, Esc and Replay intro; Sound and Music toggles
- Tested: full sequence, dialogue Continue and Replay, Skip, returning player, Arabic and English, desktop 1440 px and mobile 375 px, no console errors
- Release notes: see `CHANGELOG.md`. Git tags: `v0.1` (previous version, 3dbcdff) and `v0.2` (this version)

## 2026-11-14 · Illustrated decision cards (from the team mockups)
- New `src/components/mission/DecisionCards.tsx`: decision and result screens redesigned after the team's two mockups
  - Step indicator Investigate → Decide → Result; centred title with orange flourishes; the problem as the subtitle
  - SUHAIL on the side with his hint bubble; reports, the NASA or science moment and the decision timeline stay in the side column
  - Option cards: illustration (`OptionArt`: team art scene + glowing action icon), A–D letter, benefit/cost and a selection circle;
    the selected card glows orange; locked cards are greyed out and show the reason; large orange "Confirm choice"
  - Result: green badge with the choice, SUHAIL's explanation, 4 resource tiles with the change (e.g. −108 kWh, +15%), the crew line with portrait, and the day's energy
- `public/art/greenhouse.png` cropped from the decision mockup
- Old decision and consequence screens removed from `screens/Mission.tsx`
- Checked: full playthrough to an ending (locks on Day 3 and Day 5 shown correctly), desktop 1440 px and mobile 375 px, no console errors

## 2026-11-14 · Team art integrated (Cosmic Discovery)
- Cropped from the team's visual identity board (column B, the recommended direction) into `public/art/`:
  hero, SUHAIL, Layan, Adam, Mira, Rashid, SELENE-1 base. The crop script is in the session scratchpad; the art source is the team board image
- Start screen: hero art (young commander + SUHAIL + SELENE-1) replaces the vector title; orange glowing START MISSION
- SUHAIL everywhere now uses the board art in a glowing ring, with a mood badge (? curious, … thinking, ! warning, ★ happy)
- Crew cards and crew lines use the portraits (`Portrait` component) with identity-colour rings
- Briefing step 1 shows the SELENE-1 base art; primary buttons use the orange pill style from the mockups
- Limitation: crops come from a 1536 px board, so they are low resolution. Replace the files in `public/art/` with the designer's originals (same names) for sharp art

## 2026-11-14 · V0.3: Lunar base & mission briefing
**Done**
- `MissionBriefing`: 4 steps with a step indicator (Mission → Commander → Crew → Resources → Base) introducing Operation Moonlight,
  SELENE-1, the child as commander, the 7 fictional days and 3 missions, the 4 astronauts and the 4 resources
- `LunarBaseScreen`: isometric 2.5D base with 6 selectable facilities. A tap/click on a building, or the keyboard-friendly
  button list (48 px targets), opens a `FacilityCard` showing what it does, who runs it, which resources it uses and makes, and a SUHAIL question.
  "Begin Day 1" unlocks after 3 facilities are visited
- `SuhailDialogue`: SUHAIL asks a question first and the child reveals the explanation, so SUHAIL never decides
- `ResourceIndicator` (HUD bar + large tile like the approved results mockup), `MissionHUD`, `CrewCard`, `Stepper`; orange `solar` CTA button from the mockups
- Crew identities: Layan cyan, Adam orange, Mira green, Rashid coral (renamed from "Rashed" to match the spec)
- Shared typed content in `src/lib/mission.ts` (resources, facilities) reading from the existing typed `GameState` (`src/lib/game/types.ts`)
- Starting resource values are labelled on screen as illustrative game values, not NASA measurements
- Tests: 20 passing (4 new for mission content) · tsc ✓ · eslint ✓ · build ✓ · checked in browser at desktop and 375 px mobile, no console errors

**Notes**
- The team's mockups (decision and results screens) were used as style reference: step indicator, glowing cards, orange CTA, resource tiles.
  Their illustrated SUHAIL and base art can replace the SVG placeholders once delivered as separate files

## 2026-11-14 · V0.2: Visual shell & start menu
**Done**
- Cinematic responsive start screen: SELENE-1 lunar horizon (low Sun, polar shadows, Earth, lit base kept clear of buttons),
  Orbit Star logo area, SPACE COMMANDER title, OPERATION MOONLIGHT subtitle, tagline, large START MISSION button
- Secondary navigation: Story (modal), Science Guide, Settings (modal), Language (AR/EN toggle)
- Settings modal: language, sound, reduce motion, larger text (persisted per viewer); also opened from the in-game toolbar
- SUHAIL restyled to the brief: floating white glossy rounded body, dark glossy face, cyan eyes, orange antenna/ear/chest accents, 5 expressions
- Reusable components: `Button` (md/lg), `Card`, `Panel`, `Modal` (native `<dialog>`: focus trap, Esc, focus return),
  `Heading`, `Kicker`, `Switch`, `PlaceholderTag`, `ScreenTitle`; brand: `OrbitStarLogo`, `LunarHorizon`
- Temporary artwork is labelled on screen ("Temporary artwork — final logo & characters by the design team")
- START MISSION → Mission Briefing (existing). All existing gameplay is unchanged
- Static export (`output: "export"`) for hosting
- Checks: tsc ✓ · eslint ✓ · 16 tests ✓ · build ✓ · verified in browser at 1280×800 and 375×812 (no horizontal scroll, no console errors)

**Known limitations**
- Logo and SUHAIL are vector placeholders until the designer's approved files arrive (swap in `src/components/Brand.tsx` / `Suhail.tsx`)

**Live:** https://space-commander-theta.vercel.app (Vercel project `space-commander`, team raqeeb). V0.2 was deployed on 2026-11-14.
**Repo:** https://github.com/mohmoedkh22-maker/space-commander (public)
Redeploy with: `npm run build`, then `cd out` and `npx vercel deploy --prod --yes --name space-commander`

## 2026-11-14 (Day 1)
**Done**
- WP01 foundation: Next.js + TS + Tailwind project, PRD/AGENTS/DESIGN/README docs
- WP04 V4.1–V4.3: NASA LOLA illumination extracted (0.8844), validated, documented, wired into the energy model
- WP03: deterministic engine, 3 data-driven decisions, butterfly locks, automatic load shedding, 3 endings
- WP05: What If Lab (replay with one change, prediction, chart and table comparison, forced-change notes)
- WP02 (code side): SVG isometric base with facility states, SUHAIL with 5 expressions, HUD, AR/EN with RTL/LTR
- Tests: 16 passing (NASA adapter, energy model, engine, branching, endings reachable, What If immutability)
- Checks: `tsc`, `eslint`, `next build` all pass

**Open / next**
- Create the public GitHub repo and deploy to Vercel (needs team accounts)
- Designer assets (logo, character art) can replace the SVG placeholders in `src/components/`
- Record a 30-second backup demo video
- Add team member names to README
- Optional: sound effects polish and session save
