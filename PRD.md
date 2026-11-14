# PRD: SPACE COMMANDER, Operation Moonlight

## Problem
Kids learn space science as facts to memorise. They rarely experience that energy, water, air and food in a space
habitat are **interdependent** and that decisions have delayed consequences.

## Audience
Children 9–12, Arabic and English, on desktop, tablet and phone. Session length is about 12–15 minutes.

## Solution
An interactive, cinematic decision game. The child is the commander of lunar base SELENE-1. SUHAIL guides but never decides.
Real NASA lunar south-pole illumination data drives the base's solar power.

## MVP scope (built)
| Feature | Success criterion | Status |
|---|---|---|
| Splash, briefing, base tour | Child meets SUHAIL and crew, explores ≥3 facilities | ✅ |
| 3 missions / 7 days | Energy (D2), Water (D3), Emergency (D5) decisions | ✅ |
| Real resource simulation | Each choice changes kWh / L / % via deterministic engine | ✅ |
| Butterfly effect | D2 choice can lock D3 "boost recycler"; D2+D3 can lock D5 "continue goals" | ✅ tested |
| Safety-first step | Must complete all safety steps; SUHAIL explains if skipped | ✅ |
| 3 endings | A Accomplished / B Safe but limited / C Interrupted, all reachable | ✅ tested |
| What If Lab | Pick a decision, choose alternative, predict, compare timelines (chart + table) | ✅ |
| Commander report | Key decisions, butterfly notes, concepts, transfer question | ✅ |
| NASA data layer | Traceable link from LOLA product to the energy calculation | ✅ |
| About the Science | Sources, formula, assumptions, simplifications | ✅ |
| Accessibility | AR/EN + RTL/LTR, keyboard, reduced motion, larger text, status not by colour only, all decisions via lists | ✅ |

## Deferred
Narrated voice-over, character illustrations by the designer, saved progress, teacher dashboard, more missions,
time-series illumination from SVS 5027 frames.

## Non-negotiables
The child decides. Crew safety comes before points. Every NASA value is documented, and simplifications are labelled.
