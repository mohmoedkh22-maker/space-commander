# Simulation assumptions (educational, configurable)

> **Status:** these are **educational game assumptions**, not NASA measurements, until they are reviewed by the team's NASA Data Lead.
> The only NASA-derived inputs are the **daily sunlit fraction** of each mission day (NASA SVS 4930) and the long-term
> fraction **0.8844** (NASA LOLA, context and fallback). See `docs/nasa-data-sources.md`.
> Every value below lives in `src/lib/game/config.ts`. Change it there and the engine, explanations and tests use it automatically.

## Architecture
| Module | Role |
|---|---|
| `src/lib/game/types.ts` | Typed model: `GameState` (resources, facilities, crewSafety, safetyChecks, decisionHistory, activeMissionId, missionResults, missionStatus), `Mission`, `Decision`, `DecisionOption` (declarative: prerequisites, policy, resource and facility effects, consequences, explanation), `ResourceEffect`, `Consequence`, `GameEvent`, `MissionResult` |
| `src/lib/game/config.ts` | All tunable numbers (this document) |
| `src/lib/game/missions.ts` | Data: the 3 mission chapters and the story events |
| `src/lib/game/decisions.ts` | Data: decisions, options, lock rules, SUHAIL and crew lines (AR/EN) |
| `src/lib/game/engine.ts` | Pure, immutable state transitions: `runDay`, `applyEvent`, `applyDecision`, `simulate`, `computeEnding` |
| `src/lib/game/safety.ts` | The four Mission 03 safety steps (`completeSafetyCheck`); every Mission 03 option requires them |
| `src/lib/game/dialogue.ts` | SUHAIL's data-driven dialogue rules (`DIALOGUE_RULES`, `suhailLines`) evaluated on the real state |
| `src/lib/game/consequences.ts` | Explanations: `explainDay`, `explainFacilities`, `guidanceFor`, `missionResult` |
| `src/lib/game/whatif.ts` | `replayFromState` (replay from an exact saved state), `runWhatIf` |
| `src/lib/game/persistence.ts` | Optional on-device progress (`serializeProgress` and `parseProgress`, validated) |

No React and no randomness in these modules: the same choices always produce the same results.

## Resources and limits
| Constant | Value | Meaning |
|---|---|---|
| `BATTERY_CAP_KWH` | 300 | battery capacity (kWh) |
| `START.resources.energy` | 240 | starting battery (kWh) |
| `WATER_CAP_L` / `START.resources.water` | 600 / 400 | water tank and starting water (L) |
| `START.resources.oxygen` | 98 | starting oxygen index (%) |
| `START.resources.food` | 20 | starting crop growth / food supply (%) |
| `SOLAR_RATED_KW` | 10 | solar array size |
| `START.performanceFactor` | 0.85 | dust, temperature and wiring losses |
| `RESOURCE_LIMITS` | energy 0–300, water 0–600, oxygen 0–100, food 0–100 | hard limits; NaN and Infinity are rejected |
| `THRESHOLDS` | boost ≥ 150 kWh, repair ≥ 100 kWh, continue goals ≥ 150 kWh and ≥ 300 L, low reserve < 150 kWh | prerequisites, facility conditions, dialogue |

## Daily loads (kWh)
Life support 70 (**never shed**) · recycler 25 (+20 boost) · greenhouse 55 / 25 / 10 (full / moderate / minimum) · research 30 · shelter 15 on storm days · repair 35.
When the battery would go negative, the engine sheds in this order: research → greenhouse → recycler boost. A remaining shortfall strains life support (oxygen −6), and the crew is still protected.

## Water (L/day, crew of 4)
Crew use 40 (30 with rationing); recovery 90 % normal, 60 % after the fault, +15 % with boost (max 95 %), 90 % after repair. Greenhouse net use 15 / 8 / 3.

## Daily light (V0.5: NASA data, no longer fictional)
`MISSION_CALENDAR.startDate = "2026-05-29"` maps mission days 1–7 to real dates. **The choice of week is the assumption.**
The light on those days is read from NASA SVS 4930 through `NASADataAdapter`: 0.583 · 0.500 · 0.333 · 0.833 · 1.000 · 0.917 · 0.417.
The old fictional `SCENARIO_LIGHT_FACTOR` curve was removed.

## Endings
- **Mission Interrupted (C):** conservation mode chosen, or more than 1 shortfall day, or water < 150 L
- **Mission Accomplished (A):** research still running at the end, ≥ 4 research days, crops ≥ 60 %, battery ≥ 40 kWh, water ≥ 250 L
- **Safe but Limited (B):** everything else
The crew is safe in every ending.

## The connected decision chain (tested in `v04.test.ts`)
Mission 01 options: **Prioritize the greenhouse** · **Conserve energy** · **Balance energy loads**.
Choosing **Prioritize the greenhouse**:
1. lowers the battery below 150 kWh after Day 2 (conserving keeps it higher), so the Power Station reports a low reserve,
2. keeps the greenhouse "thriving",
3. locks **Increase water recycling** in Mission 02 (prerequisite: energy ≥ 150 kWh) and **Continue most mission goals** in Mission 03,
4. changes SUHAIL's lines (the "options limited" rule fires; the "crop delay" rule does not),
5. with the same later choices (reduce greenhouse water → continue goals), ends in **SAFE_BUT_LIMITED**; conserving energy ends in **MISSION_ACCOMPLISHED**.

## Outcomes are computed, never chosen
`computeEnding` reads only the final state: research still running, research days, food, energy, water and shortfall days.
No randomness, and no outcome is tied directly to an option's name.