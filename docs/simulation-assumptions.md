# Simulation assumptions (educational, configurable)

> **Status:** these are **educational game assumptions**, not NASA measurements, until they are reviewed by the team's NASA Data Lead.
> The only NASA-derived input is the illumination fraction **0.8844** (see `docs/nasa-data-sources.md`).
> Every value below lives in `src/lib/game/config.ts`. Change it there and the engine, explanations and tests use it automatically.

## Architecture
| Module | Role |
|---|---|
| `src/lib/game/types.ts` | Typed model: `GameState`, `Mission`, `Decision`, `DecisionOption`, `ResourceEffect`, `Consequence`, `GameEvent`, `MissionResult` |
| `src/lib/game/config.ts` | All tunable numbers (this document) |
| `src/lib/game/missions.ts` | Data: the 3 mission chapters and the story events |
| `src/lib/game/decisions.ts` | Data: decisions, options, lock rules, SUHAIL and crew lines (AR/EN) |
| `src/lib/game/engine.ts` | Pure, immutable state transitions: `runDay`, `applyEvent`, `applyDecision`, `simulate`, `computeEnding` |
| `src/lib/game/consequences.ts` | Explanations: `explainDay`, `explainFacilities`, `guidanceFor`, `missionResult` |
| `src/lib/game/persistence.ts` | Optional on-device progress (`serializeProgress` and `parseProgress`, validated) |

No React and no randomness in these modules: the same choices always produce the same results.

## Resources and limits
| Constant | Value | Meaning |
|---|---|---|
| `BATTERY_CAP_KWH` | 300 | battery capacity (kWh) |
| `START.batteryKWh` | 240 | starting battery |
| `WATER_CAP_L` / `START.waterL` | 600 / 400 | water tank and starting water (L) |
| `START.oxygenPct` | 98 | starting oxygen index (%) |
| `START.cropPct` | 20 | starting crop growth (%) |
| `SOLAR_RATED_KW` | 10 | solar array size |
| `START.performanceFactor` | 0.85 (0.95 after inspection) | dust, temperature and wiring losses |

## Daily loads (kWh)
Life support 70 (**never shed**) · recycler 25 (+20 boost) · greenhouse 55 / 25 / 10 (full / reduced / minimal) · research 30 · shelter 15 on storm days · inspection 10 · repair 35.
When the battery would go negative, the engine sheds in this order: research → greenhouse → recycler boost. A remaining shortfall strains life support (oxygen −6), and the crew is still protected.

## Water (L/day, crew of 4)
Crew use 40 (30 with rationing); recovery 90 % normal, 60 % after the fault, +15 % with boost (max 95 %), 90 % after repair. Greenhouse net use 15 / 8 / 3.

## Story light curve (fictional)
Day factors applied to NASA's 88.44 % average: 1.0 · 0.4 · 0.55 · 0.75 · 0.7 · 0.7 · 0.85. NASA provides a long-term average, not a daily forecast.

## Endings
- **Mission Interrupted (C):** conservation mode chosen, or more than 1 shortfall day, or water < 150 L
- **Mission Accomplished (A):** research still running at the end, ≥ 4 research days, crops ≥ 60 %, battery ≥ 40 kWh, water ≥ 250 L
- **Safe but Limited (B):** everything else
The crew is safe in every ending.

## The connected decision chain (tested in `v04.test.ts`)
Choosing **"keep the greenhouse at full power"** on Day 2:
1. lowers the battery for the following days (future resources),
2. keeps the greenhouse "thriving" while the battery drains (facility condition),
3. locks **"run the recycler harder"** on Day 3 and **"continue most mission goals"** on Day 5 (later options),
4. changes SUHAIL's guidance at the water alert and the emergency,
5. with the same later choices, ends in **Safe but Limited** instead of **Mission Accomplished** (final outcome).
