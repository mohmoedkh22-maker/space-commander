# Changelog

**Live:** https://space-commander-theta.vercel.app

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
