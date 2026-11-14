# NASA data sources

## Primary (used in calculations)
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
- This is a long-term average, **not** a daily time series. The game's day-by-day light curve is fictional and labelled so.
- Illumination fraction is not electrical power. See `docs/solar-energy-model.md`.
- SELENE-1 is fictional. Only its location and illumination value come from NASA data.

## Secondary (context / visuals)
- NASA SVS 5027, *Illumination at the Moon's South Pole to 80°S, 2025 to 2028*, https://svs.gsfc.nasa.gov/5027/
  (Ernie Wright, Noah Petro; NASA's Scientific Visualization Studio). Used as background reference for the "vanishing sun" story.
