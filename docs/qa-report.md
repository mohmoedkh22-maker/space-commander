# QA report: Cinematic Game Experience (Phases 1–7)

**Date:** 2026-11-15 · **Build:** V6 + Phases 1–7 (not yet pushed or deployed)
**Tested:**
- Automated: Vitest + jsdom
- Production build (`out/`, the files that get deployed) served locally and played in the browser pane
- Development build for layout checks

## Summary
| | Result |
|---|---|
| Automated tests | **146 passing** in 18 files (logic + rendered end-to-end journeys) |
| Type check / lint / production build | pass / pass / pass |
| Full journey on the production build | AR, phone (375 px): first launch → whole opening → briefing → base → 3 chapters → **Mission Accomplished** → What If Lab → report → About the Science → menu |
| Console on the production build | **no messages** (no errors, no hydration warnings) on first launch, the full journey, and a returning player |
| Size | First load JS 194 kB; whole static site 1.8 MB (of which team art 562 KB) |
| Accessibility scan | every control named, every image with alt text, no duplicate ids, all inputs labelled, one h1 per screen, `lang`/`dir` set |

## The 13 success criteria
| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Meaningful cinematic opening | ✅ | Six scenes (space → approach → alert → SUHAIL → crew → commander moment); `CinematicIntro.test.tsx`; played on the production build |
| 2 | Mission understood without long instructions | ✅ | One short transmission + 3 SUHAIL lines + 2 responsibility lines; the long reading page was removed in Phase 1 |
| 3 | SUHAIL is a friendly companion | ✅ | 8 expressions reacting to the real state (`companion.test.ts`, all 27 paths); explains every menu item; never names an option for the child (tested) |
| 4 | Crew introduced naturally | ✅ | One spotlight and one line per crew member in the opening; state-based crew reports with reaction faces in play |
| 5 | The player feels ownership | ✅ | "Are you ready to lead the mission?" choice; SUHAIL only asks; honest decision feedback ("A decision with a cost") |
| 6 | Start Mission enters the existing game | ✅ | Opening → Mission Briefing (at the resources) → base → chapters; golden-path test and production playthrough |
| 7 | Simulation mechanics unchanged | ✅ | Engine, decisions, NASA data and What If Lab tests unchanged and passing; outcome on screen = `computeEnding` (tested) |
| 8 | Resource changes shown visually | ✅ | ▲/▼ flashes, critical pulse, notifications (energy low, **water critical**, faults, storm), map dims with NASA light (`feedback.test.ts`, `Feedback.test.tsx`) |
| 9 | Works on desktop and mobile | ✅ | Measured at 375, 768, 812×375 and 1280 px; no horizontal overflow; compact sticky top bar; main buttons pinned on phones |
| 10 | Skip and Reduce Motion work | ✅ | Skip by button and Esc (tested); Reduce Motion follows the device on a first visit, stops animations, still frames in the opening |
| 11 | Sound controls work | ✅ | Mute everything, effects volume and music volume reach the mixer (tested); no sound before the first tap (no AudioContext is even created; tested) |
| 12 | No critical console errors | ✅ | Production build: zero console messages (first launch, full journey, returning player) |
| 13 | Existing tests pass or failures documented | ✅ | All 146 pass. Two older tests were updated on purpose (new launch order; the briefing starts at the resources after the opening) |

## Problems found in Phase 7 and fixed
| Problem | Fix |
|---|---|
| On first load, the static HTML showed the Arabic start menu for a moment before the opening (even for English players) | A neutral boot frame (space + logo) until the device's settings are read. The static HTML now contains only that frame, and a no-JavaScript message |
| "OPERATION MOONLIGHT" sat over the bright Moon in the first scene and was hard to read | Moved right under the title, with a shadow; the two-beat reveal is kept |
| After a finished mission the menu said "Continue my mission · Day 7" | It now says "My mission result & report", and the new-mission confirmation says it replaces the previous result |

## Problems found and fixed in earlier phases (for the record)
- Hydration mismatch from the lunar dust (`Math.sin` precision): Phase 3
- SUHAIL line shown twice in the debrief; angry-looking warning face; merged hands: Phase 2
- "Well-chosen!" shown for a decision that drained the battery below the reserve: Phase 4
- Top bar too tall or not visible on phones; main buttons 2,000+ px down the page; small targets: Phase 6

## Not verified / limits
- **Sound by ear.** The routing, volumes and timing are tested, but nobody has listened yet. Please try it on real speakers.
- **Real devices.** Phone and tablet were emulated in the browser; try one real phone (iOS Safari + Android Chrome) before judging day.
- **Motion quality.** Most motion was reviewed from stills and measurements; a short look at the full opening at normal speed is worthwhile.
- **SUHAIL's vector design** is our redraw of the approved identity; the team should confirm it.
- **Screen-reader pass.** The structure was checked automatically, but no full screen-reader test was done.

## How to re-run
```bash
npm test          # 146 tests, including the rendered end-to-end journeys
npx tsc --noEmit
npx eslint src
npm run build     # static site in out/
```
