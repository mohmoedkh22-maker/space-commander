# DESIGN.md

Direction: **Cinematic sci-fi + stylized realism + educational adventure**. A friendly mission-control look for kids.

## Colours (tokens in `src/app/globals.css`)
| Token | Hex | Use |
|---|---|---|
| space | #0B1026 | background |
| midnight | #151F3D | cards |
| cosmic | #326BFF | primary buttons |
| holo | #50E3F0 | SUHAIL, data, original timeline |
| lunar | #F3F6FC | main text |
| moon | #AAB6CA | secondary text |
| solar | #FFAD4D | energy, warnings |
| mint | #43D9A3 | stable / greenhouse |
| coral | #FF6B6B | critical only |
| violet | #8C78FF | What If Lab, alternative timeline |

Status is never shown by colour alone. It always has a word or symbol as well (`!`, ✓, 🔒, ▲/▼).

## Type
Arabic: IBM Plex Sans Arabic · English, numbers and titles: Space Grotesk.

## Screens
Splash → Briefing → Base tour → Day 1 → Decision (problem, NASA/science moment, reports, options with benefit/cost,
hint) → Consequence (crew line, deltas, day energy, SUHAIL) → … → Water alert → Storm alert → Safety checklist →
Emergency decision (with timeline) → Days 5–7 → Outcome → What If Lab → Commander report. About the Science is
reachable from every screen.

## Motion
Short rise and float animations. The "Reduce motion" toggle and `prefers-reduced-motion` turn all animation off. No flashing.

## Layout
Single column on phones, two columns from `lg`. Buttons are at least 48 px tall.
