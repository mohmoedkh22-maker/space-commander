# Changelog

**Live:** https://space-commander-theta.vercel.app

## V8 — 2026-11-15 · NASA Science Data in the Game (tag `V8`)

V8 connects real NASA space-weather and radiation data to the website and to the game, fully offline. The game never calls
NASA while it is played; the data is downloaded once, validated, and published with the site.

### Where the NASA data is
| What | NASA source | In the repository | On the website |
|---|---|---|---|
| Solar events, May 2024: 144 CMEs, 14 SEPs (FLR unavailable: NASA HTTP 404) | NASA DONKI (api.nasa.gov) | `public/data/donki/` (`events.json`, `sep.json`, `metadata.json`) | `/data/donki/…` |
| Radiation, May 2024: LRO/CRaTER in **lunar orbit** (744 hourly records) and BioSentinel in deep space (44,130 records) | NASA OSDR RadLab | `public/data/radlab/` (+ raw responses in `raw/`) | `/data/radlab/…` |
| 27 educational scenarios + 3 SUHAIL lessons built from these records | generated offline from the two datasets | `public/data/scenarios/scenarios.json` | `/data/scenarios/scenarios.json` |

**In the game**
- **Start menu → 🔭 SUHAIL's Science Lessons**, and also a button on the Commander Report at the end of a mission.
- Three guided lessons:
  - *the solar particle alert* (NASA DONKI, GOES)
  - *above the Moon or on it?* (CRaTER in lunar orbit)
  - *they happened together — did one cause the other?* (correlation, not causation)
- Every lesson shows its **NASA source**: dataset, observation date, record ids (linked to NASA's DONKI pages), where it was
  measured, the value with its unit, and the scientific limits.
- Labels separate **🛰 Historical NASA record** from **🎮 Simulated (game training scenario)**.
- An optional **Science archive** lists all 27 scenarios.
- A link to the **What If Lab** compares ideas qualitatively.

The lessons never change resources, decisions, the day, the ending or the saved mission.

**In the code**
- `src/lib/nasa/donki/`, `src/lib/nasa/radlab/`: validation and offline sync.
- `src/lib/nasa/scenarios/`: the scenario engine and its scientific-rule validator.
- `src/components/screens/ScienceLessons.tsx` and `src/lib/game/scienceLessons.ts`: the in-game lessons.
- Commands: `npm run sync:donki`, `npm run sync:radlab`, `npm run build:scenarios`.
- Documentation: `docs/nasa/DONKI-DATA.md`, `docs/nasa/RADLAB-DATA.md`, `docs/nasa/SCIENTIFIC-SCENARIO-ENGINE.md`.

### Scientific rules (enforced by tests)
- **Lunar orbit and the surface:** CRaTER readings are lunar-**orbit** measurements, not lunar-surface values.
- **Detector dose:** a detector's absorbed dose is not an astronaut's dose, and no equivalent dose is derived.
- **BioSentinel** is never presented as a lunar measurement.
- **Correlation is not causation:** a timing link is never presented as a cause.
- **Missing data:** missing values stay missing, and zero readings are flagged rather than read as "no radiation".
- **No invented values:** no confidence score is invented.
- **No game effects:** radiation never changes oxygen, water, food or energy.

### Also
- `vercel.json` sets explicit build settings: `npm ci` → `npm run build` → `out/`.
- 249 automated tests (103 new since V7).

## V7 — 2026-11-15 · Cinematic Game Experience (tag `V7`)

### Added
- **Cinematic opening** (6 scenes) that starts on the first launch: deep space → approaching SELENE-1 → mission alert from
  Mission Control → SUHAIL → the crew → the commander moment ("Start Mission" / "Discover the story"). It can be skipped
  (button or Esc), honours Reduce Motion, and plays no sound before the first tap
- **Expressive SUHAIL**: an animated vector version of the approved character with 8 expressions (idle, curious, thinking,
  explaining, warning, happy, encouraging, concerned) that react to the real game state, using the brief's lines; he never chooses for the child
- **Cinematic start menu** over a living lunar scene. SUHAIL explains each item; arrow-key navigation; Continue for a saved mission;
  a confirmation before a new mission replaces it; a 🏠 Menu button inside the game
- **Gameplay feedback**: resource ▲/▼ flashes and a critical pulse; mission notifications (energy low, water critical, faults,
  storm, safety); honest decision feedback ("Well-chosen!" / "A decision with a cost" / "The base struggled"); the base map dims with the day's NASA sunlight
- **Audio**: a mixer with music and effects volumes plus Mute everything, a menu theme and calm base ambience, and new cues
  (confirm, success, warning, notify, transition). All original, generated in the browser
- **Responsive**: compact sticky top bar with a ☰ menu on phones; main buttons pinned at the bottom on phones and tablets;
  no sticky bars on short landscape screens; 44 px targets
- **QA**: golden-path end-to-end test; a neutral boot frame (no flash of the wrong screen or language); QA report in `docs/qa-report.md`
- 146 automated tests

## V6 — 2026-11-15 · Complete Mission Experience (tag `V6`)

### Added
- One connected journey: Start → cinematic (first visit) → Mission Briefing → Lunar Base → 3 chapters (Mission Control,
  Challenge, Consequences, Transition; chapter 3 is the Emergency Sequence) → Outcome → What If Lab → Commander Report
- Lunar base visual states driven by the game state: Normal, Warning, Critical, Recovery, Mission complete
- State-based reports from all four crew members, and new SUHAIL lines for recovery, sheltering and chapter endings
- Chapter tracker and base-status chip in the HUD. Gentle scene transitions (off with Reduce Motion)
- Outcome screen shows all three outcome categories. The Commander Report adds outcome reasons, resource changes, decision
  consequences and the science concept behind each decision
- 97 automated tests, including 3 end-to-end journeys that click through the real game (EN and AR, one per outcome)

## V5 — 2026-11-15 · What If Lab (tag `V5`)

### Added
- SUHAIL asks for a prediction before any result is shown: the child picks a target (battery, water, oxygen, food or outcome),
  a direction, and can add their own words
- Replay from the exact frozen state saved before the chosen decision. Earlier decisions stay unchanged
- Documented policy for later choices that become locked: "keep, else one step more careful" (`CAUTION_LADDER`)
- Side-by-side comparison: four resource cards, facility conditions, mission outcome. Cyan ● = original, purple ■ = alternative
- A branching timeline that marks where the paths split, plus "What changed? / What happened afterward? / Why?" explanations
- Clear messages for invalid branches. 82 automated tests (15 new for the lab)

## V4 — 2026-11-14 · NASA Science Integration (tag `V4`)

### Added
- Daily sunlight from **NASA SVS 4930** (*Illumination at the Moon's South Pole, 2023 to 2030*): every 2-hour frame of 2026
  measured at the SELENE-1 site with a reproducible script (`scripts/extract_svs_illumination.py`, `scripts/build_svs_dataset.py`).
  Site sunlit 91.3 % of 2026, versus the LOLA 18.6-year average of 88.4 %. The Shackleton floor control reads 0 %
- `NASADataAdapter`: schema and date validation, real-week lookups, and a labelled LOLA fallback for missing data. Static data, works offline
- Engine: each mission day uses the NASA value for its real date (week of 29 May 2026). The fictional light curve was removed
- About the Science screen: the whole year as a chart, a mission/brightest/darkest real-week scenario selector with energy per day,
  model inputs colour-coded (NASA vs game assumptions), checks, simplifications and sources
- SVS 5027 reviewed and documented (its labels cover the site, so the companion product SVS 4930 is sampled)
- 67 automated tests (15 new for the NASA data)

## V3 — 2026-11-14 · Cinematic Gameplay Experience (tag `V3`)

### Added
- Cinematic intro for each mission: atmosphere, title reveal, crew and SUHAIL dialogue, objective, Skip
- Interactive base: live facility conditions from the engine, a battery gauge, an emergency beacon,
  facility inspection with crew reports and equipment checks that reveal clues; the decision room unlocks after investigating
- Data-driven emergency events: solar-forecast energy warning, water-system fault, space weather (critical), low reserve, crop delay
- Decisions show the player's investigation notes and each option's real daily energy cost (computed by the engine)
- Visible consequences: the base map animates from "before" to "now"; resource numbers count to their new values; facility changes are listed
- Mission debrief after each chapter: status, decision, resource changes, facilities, crew safety, and which next-mission options are locked or open
- Decision & simulation engine (V0.4): authoritative GameState, 3 data-driven options per mission, engine-enforced safety steps, SUHAIL dialogue rules
- 52 automated tests

## v0.2 — 2026-11-14 · Cinematic Introduction (tag `v0.2`)

### Added
- **Cinematic introduction (7 scenes):** deep space → SELENE-1 lunar base → command center → meet SUHAIL →
  become the commander → explore your base → Mission Day 1 / Systems Online
- Reusable `DialogueBox` (typed subtitles, Continue, Replay, line counter) and `SceneTransition` (fade from black, camera push)
- Original procedural audio (WebAudio): space ambience, radio static, building music, screen and facility sounds.
  Separate Sound and Music toggles; everything works with audio off
- Skip (button or Esc), Replay intro from the main menu, onboarding saved so returning players go straight to the mission
- Version number shown on the start screen

## v0.1 — 2026-11-14 · First playable version (tag `v0.1`, commit 3dbcdff)

- Deterministic simulation: 3 missions, butterfly-effect locks, 3 endings, What If Lab, Commander Report
- Solar power from real NASA LRO/LOLA south-pole illumination data (88.44 % at the Shackleton ridge)
- Cinematic start menu, Settings modal, bilingual Arabic/English
- Mission briefing, explorable lunar base, crew and facility cards
- Team character art (Cosmic Discovery): hero on the start screen, SUHAIL with mood badges, crew portraits
- Illustrated decision cards and result screen, after the team's mockups

### Quality
- 20 automated tests, type check, lint and production build pass; checked at desktop and mobile sizes
