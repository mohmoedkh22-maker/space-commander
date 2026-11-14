# Changelog

## v1.0.0 — 2026-11-14 · Cinematic Introduction

**Live:** https://space-commander-theta.vercel.app

### Added
- **Cinematic introduction (7 scenes):** deep space → SELENE-1 lunar base → command center → meet SUHAIL →
  become the commander → explore your base → Mission Day 1 / Systems Online
- Reusable `DialogueBox` (typed subtitles, Continue, Replay, line counter) and `SceneTransition` (fade from black, camera push)
- Original procedural audio (WebAudio): space ambience, radio static, building music, screen and facility sounds.
  Separate Sound and Music toggles; everything works with audio off
- Skip (button or Esc), Replay intro from the main menu, onboarding saved so returning players go straight to the mission
- **Illustrated decision cards** and result screen, after the team's mockups (option art, orange glow, resource tiles with changes)
- **Team character art** (Cosmic Discovery): hero on the start screen, SUHAIL with mood badges, crew portraits
- Mission briefing, explorable lunar base, crew and facility cards (V0.3)
- Cinematic start menu, Settings modal, bilingual Arabic/English (V0.2)

### Core (V0.1)
- Deterministic simulation: 3 missions, butterfly-effect locks, 3 endings, What If Lab, Commander Report
- Solar power from real NASA LRO/LOLA south-pole illumination data (88.44 % at the Shackleton ridge)

### Quality
- 20 automated tests, type check, lint and production build pass; checked at desktop and mobile sizes
