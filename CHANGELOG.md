# Changelog

**Live:** https://space-commander-theta.vercel.app

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
