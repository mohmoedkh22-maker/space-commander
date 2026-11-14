# Solar energy model

```
SolarEnergy_kWh = RatedPower_kW × Duration_h × IlluminationFraction × PerformanceFactor
```

| Input | Value | Kind |
|---|---|---|
| IlluminationFraction | 0.8844 | **NASA-derived** (LOLA, see nasa-data-sources.md) |
| RatedPower_kW | 10 | game assumption |
| PerformanceFactor | 0.85 (0.95 after the player inspects and cleans the panels) | game assumption |
| Duration_h | 24 | per game day |
| Scenario light factor | D1 1.0 · D2 0.4 · D3 0.55 · D4 0.75 · D5–6 0.7 · D7 0.85 | **fictional** story curve |

Sample: 10 × 24 × 0.8844 × 0.85 = **180.4 kWh/day** on a normal day. On Day 2: × 0.4 = 72.2 kWh.

Loads (game assumptions, kWh/day): life support 70 (never shed) · recycler 25 (+20 boost) · greenhouse 55/25/10 ·
research 30 · shelter 15 on storm days. When the battery would go negative, the engine automatically sheds research,
then the greenhouse, then the recycler boost, and reports this to the player.

Code: `src/lib/nasa/energyModel.ts` (pure, validated) · used by `src/lib/game/engine.ts` (`solarForDay`).
Tests: `src/lib/game/engine.test.ts`.
