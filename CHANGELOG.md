# Changelog

**Live:** https://space-commander-theta.vercel.app

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
