# 🚀 SPACE COMMANDER — Operation Moonlight

**NASA Space Apps Challenge 2026 · Team SUHAIL (فريق سهيل) · Challenge: Build a Junior Astronaut Mission Trainer**

> Think like an astronaut. Lead like a commander.

**▶ Play it live: https://space-commander-theta.vercel.app**

SPACE COMMANDER is a bilingual (Arabic / English) web game for kids aged 9–12. The child commands the fictional
lunar base **SELENE-1** near the Moon's south pole for seven days, guided by the robot **SUHAIL**. Power, water,
oxygen and food are linked systems: a choice on Day 2 changes which options exist on Day 3 and Day 5. At the end, the
**What If Lab** lets the child predict, then replay an earlier decision and compare two timelines.

## How NASA data is used

Every day of the mission, the solar power available to the base comes from **NASA's day-by-day simulation of sunlight
and shadow at the Moon's south pole**. Both sources describe the same site (89.475°S, 222.557°E, on the ridge next to
Shackleton crater):

| | Daily light (drives gameplay) | Long-term average (context and fallback) |
|---|---|---|
| Source | **NASA SVS 4930**, *Illumination at the Moon's South Pole, 2023 to 2030*: https://svs.gsfc.nasa.gov/4930/ (companion of [SVS 5027](https://svs.gsfc.nasa.gov/5027/)) | `AVGVISIB_85S_060M_201608`, NASA GSFC PGDA product 69: https://pgda.gsfc.nasa.gov/products/69 |
| Made from | LRO LOLA terrain + JPL DE421 Sun positions, rendered every 2 h (E. Wright, N. Petro, NASA SVS) | LRO LOLA terrain, Mazarico et al. (2011), *Icarus* 211, doi:10.1016/j.icarus.2010.10.030 |
| What we use | Share of each 2026 day the site is sunlit (4,380 frames measured by script) | 0.8844 = share of time sunlit over ~18.6 years |
| Check | 2026: **91.3 %** sunlit · Shackleton floor control: 0 % | 88.4 % (agrees with the 2026 measurement) |

```
Energy (kWh/day) = 10 kW × 24 h × sunlit fraction of that day (NASA) × 0.85
```

The 7 mission days are mapped to the real week of **29 May – 4 June 2026**. Sunlight there fades from 58 % to 50 % to 33 %
and then returns, so the panels make 119, 102, 68, 170, 204, 187 and 85 kWh. The sunlit fraction is NASA-derived. Panel
size, efficiency, loads and the choice of week are labelled game assumptions. In-game, **About the Science** shows the
whole year, compares the mission week with the brightest and darkest real weeks of 2026, and lists sources and
simplifications. Missing data falls back to the labelled LOLA average. Nothing is invented.

Details: [docs/nasa-data-sources.md](docs/nasa-data-sources.md) · [docs/solar-energy-model.md](docs/solar-energy-model.md).

## SUHAIL's NASA science lessons

From the **start menu → 🔭 SUHAIL's Science Lessons** (and from the Commander Report at the end of a mission), the child
can take three short guided lessons built on **real NASA records from May 2024**:

1. **The solar particle alert:** a NASA DONKI detection by GOES. *Where was it detected?*
2. **Above the Moon or on it?:** LRO/CRaTER radiation in lunar **orbit**. *Orbit is not the surface; a detector is not a person.*
3. **They happened together; did one cause the other?:** CRaTER, BioSentinel and the SEP events. *Correlation, not causation.*

Each lesson follows the same steps:
- SUHAIL introduces it.
- A child-friendly explanation follows, with the **NASA source**: dataset, observation date, record ids and where the
  measurement was taken.
- A clear **Historical NASA record / Simulated** label marks what is real data.
- A challenge with 2–3 choices gets SUHAIL's feedback.
- A link to the **What If Lab** compares ideas qualitatively; it never changes numbers.

An optional **Science archive** lists all 27 scenarios. Lessons never change resources, decisions, the day, the ending or the
saved mission; their own progress is saved separately on the device.
Details: [docs/nasa/SCIENTIFIC-SCENARIO-ENGINE.md](docs/nasa/SCIENTIFIC-SCENARIO-ENGINE.md#in-the-game-wp065).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # simulation, NASA adapter and What If tests
npm run build      # production build
```

Re-extract the NASA data (Python 3):

```bash
# daily light from NASA SVS 4930 frames (standard library only; ~20 min, ~150 MB of HTTP range reads instead of ~7 GB of frames)
python -I scripts/extract_svs_illumination.py
# offline: raw CSV -> src/data/nasa/svs-4930-selene1-2026.json
python -I scripts/build_svs_dataset.py
# long-term LOLA average (needs: pip install rasterio numpy)
python -I scripts/extract_illumination.py src/data/nasa/lunar-illumination.json
```

Offline space-weather and radiation data, plus the educational scenarios built from it (not used by gameplay yet):

```bash
npm run sync:donki       # NASA DONKI events -> public/data/donki/   (optional NASA_API_KEY in .env.local)
npm run sync:radlab      # NASA OSDR RadLab (LRO/CRaTER, BioSentinel) -> public/data/radlab/
npm run build:scenarios  # offline, deterministic -> public/data/scenarios/scenarios.json
```
See [docs/nasa/SCIENTIFIC-SCENARIO-ENGINE.md](docs/nasa/SCIENTIFIC-SCENARIO-ENGINE.md).

## Tech

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Vitest · Python/rasterio for data extraction.
No backend, no accounts. The game needs no API keys (only the optional DONKI sync uses one, from a git-ignored `.env.local`).

## Project structure

```
src/lib/nasa/        NASA data adapter + solar energy model (pure TS); donki/, radlab/, scenarios/ (offline data + scenario engine)
src/lib/game/        simulation engine, decisions, What If Lab logic, tests
src/components/      UI: HUD, lunar base (SVG), SUHAIL, screens (incl. screens/ScienceLessons.tsx)
src/data/nasa/       versioned extracted NASA datasets (JSON)
data/svs4930/        raw per-frame luminance from NASA SVS 4930 (CSV, reproducible)
scripts/             reproducible NASA data extraction
docs/                data provenance and model documentation
```

## Use of AI

The team used AI coding assistants (Claude Code) to scaffold the project, write the simulation engine,
UI and tests from the team's PRD, story and visual-identity documents. Every number from NASA was extracted by a script
and verified, not generated by AI.

## Team

**Team SUHAIL (فريق سهيل)**

- Reem Abdulrahman Alkishan
- Renad Ismael Mohammed Noor
- Manar Smeer Aboyusuf
- Mahmmoud Mohamed Khadim
- Mohammed Mahmmoud Zeino
- Majdah Mohammed Shaiba
