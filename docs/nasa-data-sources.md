# NASA data sources

The game uses two NASA sources. Both describe sunlight at the **same site** near Shackleton crater
(89.4749°S, 222.557°E), where the fictional base SELENE-1 is placed.

| | Source A: daily light (gameplay) | Source B: long-term average (context + fallback) |
|---|---|---|
| Product | NASA SVS 4930 | `AVGVISIB_85S_060M_201608` |
| What it is | Ray-traced light/shadow every 2 h, 2023–2030 | Average fraction of time the Sun is visible, ~18.6 years |
| Used for | Each mission day's sunlit fraction → solar energy | Comparison, validation, and the value used if a day is missing |
| File in the app | `src/data/nasa/svs-4930-selene1-2026.json` | `src/data/nasa/lunar-illumination.json` |
| Read only by | `src/lib/nasa/NASADataAdapter.ts` | `src/lib/nasa/illumination.ts` |

---

## Source A: NASA Scientific Visualization Studio 4930 (V0.5)

| Field | Value |
|---|---|
| Official name | *Illumination at the Moon's South Pole, 2023 to 2030* |
| Source URL | https://svs.gsfc.nasa.gov/4930/ |
| Frames used | https://svs.gsfc.nasa.gov/vis/a000000/a004900/a004930/frames/1920x1080_16x9_30p/2026/ (`sp_illum.0001.tif` … `sp_illum.4380.tif`) |
| Provenance | NASA's Scientific Visualization Studio, Goddard Space Flight Center. Visualizer: Ernie Wright (STC). Scientist: Noah Petro (NASA/GSFC). Technical support: Laurence Schuler, Ian Jones (ADNET Systems). Released 2022-10-05, page updated 2025-02-18 |
| Inputs of the visualization | LRO LOLA digital elevation model (SVS dataset 653) and JPL DE421 planetary ephemerides (SVS dataset 752) |
| Observation / model context | **Model-based visualization, not a photograph.** Sunlight and shadow are computed over measured LOLA terrain for the Sun positions from DE421. For 2026 it is a prediction |
| Spatial location | Field of view south of 88°S. Sampled site 89.4749°S, 222.557°E (the LOLA best-lit pixel near Shackleton, on the Shackleton–de Gerlache ridge) |
| Time period | 2026-01-01 00:00 UT to 2026-12-31 22:00 UT, every 2 hours (4,380 frames) |
| Access date | 2026-11-14 |
| Relevant variable (ours) | `sunlitFraction` = share of a UTC day's twelve 2-hour frames in which the site is rendered sunlit (0, 1/12, …, 1) |

### Primary candidate reviewed: SVS 5027
*Illumination at the Moon's South Pole to 80°S, 2025 to 2028*, https://svs.gsfc.nasa.gov/5027/. It has the same team, method and inputs (LOLA DEM 653 and DE421), but a wider view.
- **Feasible to sample?** Technically yes, since it has the same 2-hour frames. But the frames print crater names and outlines over the map, and the **"Shackleton" label lies exactly over the SELENE-1 site**. Pixels there would measure the label text, not the light.
- **Resolution:** about 0.57 km per pixel, compared with about 0.11 km in SVS 4930.
- **Decision:** we use SVS 4930, the companion product made by the same team for the area within 2° of the pole. It is unlabelled and about 5 times sharper.
- **No numeric files:** neither page offers CSV or numeric data, only movies, frames and images. We therefore measure the frames ourselves (below).

### Extraction: `scripts/extract_svs_illumination.py` (network) → `scripts/build_svs_dataset.py` (offline)
1. **Download only what is needed.** Each frame is an LZW-compressed TIFF with one row per strip. HTTP Range requests fetch the TIFF directory and the few rows around the site, about 25 KB per frame instead of 1.6 MB. The LZW decoder was checked byte-for-byte against Pillow on a full frame.
2. **Geometry.** The view is orthographic and centred on the pole, at the image centre (960, 540) where the graticule lines cross. The 88°S ring is measured at a radius of 539.5 px, which gives ≈ 269.8 px per degree (≈ 0.11 km per px). Check: Shackleton crater's centre (89.67°S, 129.78°E) is predicted at (1028, 597), the centre of the crater rim in the frame.
3. **Time axis.** Frame *n* = 2026-01-01T00:00Z + (n−1) × 2 h. Checked against the time printed on the frames: frame 1 reads 01 Jan 2026 00:00 UT, frame 2000 reads 16 Jun 2026 14:00 UT, and frame 4380 reads 31 Dec 2026 22:00 UT.
4. **Sampling.** We take the median luminance (0–255) of a 3 × 3 pixel block (≈ 330 m). It counts as *lit* when it is **not black** (> 0.5). The renderer has no ambient light, so a cast shadow is exactly 0. Sunlit ground is shaded by the Sun's angle, so low-angle sunlight is dim but never 0. A first try with a cut-off of 25 wrongly counted dim, low-angle sunlight as shadow (61.6 % lit). The sensitivity table below keeps that visible. The raw luminance of every frame is kept in `data/svs4930/selene1_luminance_2026.csv`.
5. **Daily aggregation.** For each UTC day, we count the lit frames out of 12.
6. **Control site.** The Shackleton crater floor, a permanently shadowed region, is sampled the same way and must read 0 %.

### Result and validation
File: `src/data/nasa/svs-4930-selene1-2026.json` (365 daily values plus provenance, method, validation and limitations).

| Check | Result |
|---|---|
| Site sunlit during 2026 (SVS 4930, our measurement) | **91.3 %** of 2-hour frames |
| Same site, 18.6-year average (LOLA, independent product) | 88.4 %, consistent with the measurement above |
| Control: Shackleton crater floor (permanent shadow) | **0 %** (exactly black in all 4,380 frames) |
| Longest continuous shadow at the site in 2026 | 98 h |
| Pattern through the year | Sunlit all day from August to February. Shadow periods from late March to July: 44 partly lit days and 10 fully dark days |
| Sensitivity of the annual value to the cut-off | > 0.5: 91.3 % · > 5: 82.8 % · > 10: 78.5 % · > 25: 61.6 % |

**Mission week** (`MISSION_CALENDAR.startDate = 2026-05-29`, a game design choice):

| Mission day | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| Date (2026) | 05-29 | 05-30 | 05-31 | 06-01 | 06-02 | 06-03 | 06-04 |
| Sunlit fraction (NASA SVS 4930) | 0.583 | 0.500 | 0.333 | 0.833 | 1.000 | 0.917 | 0.417 |
| Solar energy in game (kWh) | 119 | 102 | 68 | 170 | 204 | 187 | 85 |

Why this week: the light fades for three days and then returns, which fits "The Vanishing Sun" story. It was chosen from the
real 2026 windows with a script that compares the game's outcomes. With it, all three endings stay reachable. Farming at full
power on day 1 never reaches *Mission Accomplished*, and saving energy keeps more options open. The light values themselves
were not adjusted.

### Limitations
- The values come from rendered visualization frames, not from a published numeric data product.
- Lit or shadow is binary per 2-hour frame. Partial Sun-disc visibility and shadow edges are not resolved.
- One pixel is about 110 m, coarser than the 60 m LOLA map. A 3 × 3 block (about 330 m) is sampled.
- Only the Sun is modelled. Earthshine, panel height above the ground and panel orientation are ignored.
- The sunlit fraction is not electrical power. Converting it to kWh uses game assumptions (see `solar-energy-model.md`).
- Mapping the 7 mission days onto a real 2026 week is a **game design choice** (`MISSION_CALENDAR` in `src/lib/game/config.ts`). The light on each of those days is NASA-derived.

### Offline and missing-data behaviour
- No live API is called. The dataset is a small, verified, attributed static file bundled with the app, so the game works offline.
- If a day is missing (`null`), outside 2026, or the whole file fails schema validation, `NASADataAdapter` returns the LOLA long-term average for that day. The result is labelled `source: "fallback-lola-average"` in the day log, the consequence text and the Science screen. No value is ever invented.

---

## Source B: LOLA average illumination (since v0.1)
- **Product:** `AVGVISIB_85S_060M_201608`, Lunar Polar Illumination, average solar illumination, 85°S–90°S, 60 m/px
- **Organisation:** NASA Goddard Space Flight Center, Planetary Geodesy Data Archive (PGDA), product 69
- **Page:** https://pgda.gsfc.nasa.gov/products/69
- **File read:** http://imbrium.mit.edu/EXTRAS/ILLUMINATION/IMG/AVGVISIB_85S_060M_201608.LBL (+ .IMG), the PDS3 version
  linked from the PGDA page. On 2026-11-14 the PGDA COG link returned an HTML page instead of the GeoTIFF.
- **Instrument:** LRO / LOLA topography (`LDEM_85S_060M`)
- **Citation:** Mazarico, E., Neumann, G.A., Smith, D.E., Zuber, M.T., Torrence, M.H. (2011). Illumination conditions of the
  lunar polar regions using LOLA topography. *Icarus* 211, 1066–1081. doi:10.1016/j.icarus.2010.10.030
- **Accessed:** 2026-11-14

### Product facts (from the PDS label)
- Polar stereographic, centre −90°, sphere R = 1737.4 km, 5058 × 5058 px, 60 m/px
- INT16, `SCALING_FACTOR = 0.00004`, `OFFSET = 0`, `DERIVED_MAXIMUM = 22111` (→ 0.8844)
- Value = fraction of hourly timesteps (over ~18.6 years) when any part of the solar disc is visible. 0 means permanent shadow.

### Extraction (`scripts/extract_illumination.py`)
1. Open the PDS product via GDAL `/vsicurl/` (HTTP range reads, no full download).
2. Cross-check our manual polar-stereographic projection against GDAL's CRS. They must agree within 1 m.
3. Read a 20 km radius window around Shackleton crater centre (89.67°S, 129.78°E).
4. Convert DN × 0.00004 and validate that every value is in [0, 1].
5. Pick the best-lit pixel and record window statistics.

### Result (`src/data/nasa/lunar-illumination.json`)
| | |
|---|---|
| Selected pixel | 89.4749°S, 222.557°E (x = −10770 m, y = −11730 m) |
| Illumination fraction | **0.8844** (equals the product's global maximum, on the Shackleton–de Gerlache connecting ridge) |
| Shackleton centre | 0.0 (permanent shadow), which confirms the orientation is correct |
| Mean within 20 km | 0.1997 · 21 % of pixels permanently shadowed |

### Limitations
- This is a long-term average, **not** a daily time series. Since V0.5 the daily values come from Source A.
- Illumination fraction is not electrical power. See `docs/solar-energy-model.md`.
- SELENE-1 is fictional. Only its location and the sunlight values come from NASA data.

---

## Offline-only datasets (not used by gameplay)
These are cached by manual pre-build scripts. The game, the simulation engine and the resource calculations do **not** read them, and the game
never calls these APIs. Each is a separate dataset with its own documentation.

| Dataset | Source | Files | Documentation |
|---|---|---|---|
| Space-weather events (CME, SEP; FLR unavailable) | NASA DONKI (api.nasa.gov) | `public/data/donki/` | `docs/nasa/DONKI-DATA.md` |
| Radiation measurements: LRO/CRaTER-D1D2 (**lunar orbit**) and BioSentinel/BPD (**heliocentric, 1 AU**) | NASA OSDR RadLab | `public/data/radlab/` | `docs/nasa/RADLAB-DATA.md` |

The RadLab values are detector absorbed-dose rates in orbit. They are **not** lunar-surface values and **not** biological doses. A temporal link
with DONKI events would be a correlation, not causation.
