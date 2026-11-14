# Solar energy model (V0.5)

```
SolarEnergy_kWh(day) = RatedPower_kW × 24 h × SunlitFraction(day) × PerformanceFactor
```

| Input | Value | Kind |
|---|---|---|
| SunlitFraction(day) | The NASA value for the real 2026 date of that mission day (0.583, 0.500, 0.333, 0.833, 1.000, 0.917, 0.417) | **NASA-derived** (SVS 4930, see `nasa-data-sources.md`) |
| Fallback SunlitFraction | 0.8844, used only if a day is missing; flagged `fallback-lola-average` | **NASA-derived** (LOLA 18.6-year average) |
| Mission day → date | Day 1 = 2026-05-29 (`MISSION_CALENDAR`) | game design choice |
| RatedPower_kW | 10 kW whenever the Sun is visible | game assumption |
| PerformanceFactor | 0.85 (0.95 after the player inspects and cleans the panels) | game assumption |
| Duration_h | 24 | per game day |

**Meaning in plain words:** the panels make power only during the share of the day that the site is in sunlight. A fully
sunlit day gives 10 × 24 × 1 × 0.85 = **204 kWh**. On mission day 3 (2026-05-31), the site is lit for 4 of 12 frames:
10 × 24 × 0.333 × 0.85 = **68 kWh**.

**How the scenario changes the energy available** (About the Science screen, same formula):

| Real week of 2026 | Mean sunlit | Energy over 7 days | Days below the 180 kWh "full operations" need |
|---|---|---|---|
| Mission week (from 05-29) | 66 % | 935 kWh | 5 of 7 |
| Brightest week (from 01-01) | 100 % | 1,428 kWh | 0 of 7 |
| Darkest week (from 06-07) | 33 % | 476 kWh | 6 of 7 |

Loads (game assumptions, kWh/day): life support 70 (never shed) · recycler 25 (+20 boost) · greenhouse 55/25/10 ·
research 30 · shelter 15 on storm days. When the battery would go negative, the engine automatically sheds research,
then the greenhouse, then the recycler boost, and reports this to the player.

Removed in V0.5: the fictional `SCENARIO_LIGHT_FACTOR` story curve. The day-to-day variation now comes from NASA data.

Code: `src/lib/nasa/energyModel.ts` (formula) · `src/lib/nasa/NASADataAdapter.ts` (data) · `src/lib/game/engine.ts`
(`missionDayLight`, `solarForDay`, `runDay`). Tests: `src/lib/nasa/NASADataAdapter.test.ts`, `src/lib/game/engine.test.ts`.
