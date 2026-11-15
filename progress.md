# progress.md

## 2026-11-15 · WP06.3: NASA OSDR RadLab offline integration
Data stage only. **Gameplay, the simulation engine, resource calculations and UI are unchanged**; nothing reads the RadLab files yet.
Not committed, pushed or deployed. Details: `docs/nasa/RADLAB-DATA.md`.

**Done**
- `src/lib/nasa/radlab/radlab.ts` (independent of DONKI): approved sources (CRaTER-D1D2 = LRO lunar orbit, BPD = BioSentinel 1 AU), documented
  units, safe pandas-split JSON parser, timestamp / ID / provenance / numeric validation, duplicate handling, read-only fetch, metadata
- `scripts/nasa/sync-radlab.ts` + `npm run sync:radlab` (no key; 7-day chunks; 2 s pause; per-instrument all-or-nothing writes; temp file + rename)
- Retrieved 2024-05-01 → 2024-05-31: **CRaTER-D1D2 744** records (hourly), **BPD 44,130** records (1 min), 0 rejected, 0 duplicates,
  validation `valid`. Raw responses preserved in `public/data/radlab/raw/`
- Tests: **19 new** in `src/lib/nasa/radlab/radlab.test.ts`
- `docs/nasa/RADLAB-DATA.md`; `docs/nasa-data-sources.md` now lists both offline datasets

**Open points**
- Detector materials and the timestamp timezone are not stated by RadLab (documentation and knowledgebase answered HTTP 500). Recorded as unknown / assumed.
- BPD has 131 zero readings (flagged) and 315 short gaps (≤ 5 min, not filled)
- Dataset size: about 8.6 MB under `public/data/radlab/` (mostly BPD 1-minute data + raw copy)

## 2026-11-15 · WP06.2 / V6.1: NASA DONKI offline data fetcher
Data stage only. **Gameplay is unchanged**; the game does not read the DONKI files yet. Nothing pushed or deployed. Details: `docs/nasa/DONKI-DATA.md`.

**Done**
- `src/lib/nasa/donki/donki.ts`: DONKIEvent model (id, eventType, eventDate, sourceLocation, instruments, sourceUrl, retrievedAt, rawEvent,
  dataQuality + `observed` / `derived`), strict timestamp validation, normalization with no fabricated values, model-vs-instrument
  `basis`, de-duplication and revision-aware merge, `fetchDonki` (timeout, HTTP / network / JSON errors, empty-body handling, key masking),
  metadata builder
- `scripts/nasa/sync-donki.ts` + `npm run sync:donki` (Node's built-in TypeScript; no new dependencies). Configurable range (`--start/--end`,
  `--days`), `--replace`, `--timeout`; reads `NASA_API_KEY` from the shell or `.env.local` (git-ignored); DEMO_KEY fallback with a warning.
  A failed type never deletes stored data; if all requests fail, the files are left unchanged
- Output: `public/data/donki/events.json` (144 events, 651 KB) and `public/data/donki/metadata.json`
- `.env.example` documents `NASA_API_KEY=` (no value); `tsconfig.json` allows `.ts` import extensions for the script
- Tests: **19 new** in `src/lib/nasa/donki/donki.test.ts` (all cases in the brief + model-based records + metadata)

**Retrieved (range 2024-05-01 → 2024-05-31, DEMO_KEY)**
- CME **144** ✓
- FLR **0**: NASA gateway answered HTTP 404 (`/DONKI-API/get/FLR/`) every time; CCMC's own service was unreachable
- SEP: **14** in the first run, then lost in a regeneration because of a script bug (`--replace` dropped types that failed). That bug is fixed;
  the re-download was refused with HTTP 429 (DEMO_KEY: 10 requests/day here)
- `metadata.json` records all of this (validation `partial`)

**Pending**
- Re-run with a personal key: put `NASA_API_KEY=…` in `.env.local`, then `npm run sync:donki -- --start=2024-05-01 --end=2024-05-31`.
  SEP should come back. FLR depends on NASA fixing the 404 (or on adding CCMC's own endpoint as a documented fallback, if wanted)
- V6.2 (not started, needs approval): use DONKI events in educational scenarios with documented assumptions

## 2026-11-15 · Cinematic Game Experience: PHASE 7, Quality Assurance
All seven phases are complete. Nothing pushed or deployed. Full report: `docs/qa-report.md`.

- **Golden-path test** (in `Game.e2e.test.tsx`): first launch → the whole opening (no skipping) → briefing → base → 3 chapters
  (checks the emergency state, decision feedback and the energy notification) → outcome = engine result → What If Lab → report →
  Menu → "My mission result & report"
- **Production build played in the browser** (AR, 375 px): full journey to Mission Accomplished, lab, report, science, menu;
  zero console messages; no horizontal overflow
- Accessibility scan on menu, settings, outcome and lab: no unnamed controls, no images without alt text, no duplicate ids,
  no unlabelled inputs, one h1, `lang`/`dir` set
- Size: first-load JS 194 kB; whole site 1.8 MB
- **Fixed in this phase:**
  - A first-load flash of the (Arabic) start menu before the opening → neutral boot frame until settings are read
    (also in the static HTML, with a no-JavaScript message)
  - Hard-to-read "OPERATION MOONLIGHT" over the Moon → moved under the title
  - "Continue my mission · Day 7" for a finished mission → "My mission result & report"
- **All 13 success criteria met** (evidence table in `docs/qa-report.md`). Tests: **146 passing**; tsc, eslint and build pass
- **Still to do by people:** listen to the sound on real speakers; try a real phone and tablet; watch the opening at normal speed;
  the team to confirm the vector SUHAIL design

## 2026-11-15 · Cinematic Game Experience: PHASE 6, Responsive Experience
Builds on Phases 1–5. Phase 7 (QA) is not started. Nothing pushed or deployed.

**Audit (measured in the browser, Arabic):** every screen of the journey at **375×812 (phone)**, plus the main screens at **768×1024
(tablet)**, **812×375 (landscape phone)** and **1280×800 (desktop)**. Each screen was checked for horizontal overflow, controls smaller
than 40 px, text under 12 px, top-bar height and whether the main action is reachable.

**Found**
- No horizontal overflow at any width ✓
- Phone: the top bar was ~200 px and scrolled away, so resource changes were out of sight
- Long screens with the main button far below: decision ~2,800 px (Confirm at 2,725), consequence ~2,560, debrief ~2,400, outcome ~1,800
- Landscape phone: the sticky top bar took 128 of 375 px, and Mission Control's sticky bar took more
- Small items: step markers 36 px (shown as disabled buttons), notification close button 36 px, ☰ 38 px wide; science week labels 10 px
  and art credit 11 px
- Tablet: one-column screens stretched the base map to ~720 px

**Fixed**
- **Phone top bar:** compact and sticky (**93 px**): day, chapter numbers, base status and a **☰** button that folds Menu / Language /
  Sound / Settings / Science (all 44 px when opened). The four resources are one row of icon + number + bar (names stay for screen readers).
  Tablet and desktop keep the full toolbar
- **Short landscape screens (height ≤ 500 px):** the top bar and bottom bars stop sticking, so the game gets the whole screen
- **Main action within reach:** new `StickyAction` pins Confirm choice, Next, Continue, To the next mission / Final outcome and
  Enter the What If Lab to the bottom on phones and tablets. It sits normally in the page on desktop and on short landscape screens
- Base map capped at ~576 px in one-column layouts
- Step markers are plain markers (not disabled buttons); when jumping is allowed they are 44 px buttons
- Notification close button 44 px; small text raised to 12 px

**Files:** `ui.tsx` (`StickyAction`, tag size), `Hud.tsx` (☰), `mission/MissionHUD.tsx`, `mission/ResourceIndicator.tsx`,
`mission/Stepper.tsx`, `mission/DecisionCards.tsx`, `screens/Mission.tsx`, `screens/Outcome.tsx`, `screens/Science.tsx`,
`experience/MissionResult.tsx`, `experience/BaseHub.tsx`, `experience/Journey.tsx`. New test: `Responsive.test.tsx`

**Re-measured after the fixes:** phone top bar 93 px and sticky (224 px with ☰ open); the Confirm bar pinned at the bottom
(723–812 px) once the options are in view; landscape top and bottom bars static; desktop unchanged (full toolbar, nothing pinned);
no horizontal overflow. Seen by eye at 375 px and 1280 px

**Tests:** **145 passing** (4 new): ☰ folds/opens the toolbar; the top bar is sticky except on short screens, with icon-only labels on phones;
`StickyAction` behaviour; step markers vs 44 px buttons. tsc, eslint and build pass

**Known issues / limits**
- jsdom has no layout, so the tests check the responsive rules; the sizes themselves were measured in the browser, not in CI
- Not tested on a real phone or tablet (browser emulation only)
- On the decision screen the Confirm bar appears once the child scrolls to the options (sticky works inside the options section)

## 2026-11-15 · Cinematic Game Experience: PHASE 5, Audio & Animation
Builds on Phases 1–4. Phases 6–7 are not started. Nothing pushed or deployed.

**Found before changing**
- Every sound went straight to the speakers, so there was no music or effects volume and no mute
- Music and ambience existed only in the opening; the base itself was silent
- Only the opening guarded against sound before the first tap
- Reduce Motion did not follow the device setting

**Done** (all audio is original and generated in the browser; no audio files, nothing to license)
- **Mixer** (`src/lib/audio.ts`):
  - master → music bus + effects bus, with smooth gain changes and a perceptual volume curve
  - Only master reaches the speakers
- **No sound before interaction:** one global unlock on the first tap or key press. Before it, no AudioContext is even created
  (checked in a test). The opening keeps its own guard too
- **Soundscapes** (`src/lib/soundscape.ts`):
  - Start menu: the Operation Moonlight theme (deep-space ambience + slow original pad)
  - Inside the base: a calm base ambience (life-support hum, air in the vents, a soft console ping every 7–12 s) and no melody, so children can think
  - The opening keeps its own deep-space soundscape
- **Interface cues**, short and soft:
  - Before: ok, alert, soft, facility, screen, whoosh, radio static
  - New: confirm (decision locked in), success (major chord), warning (attention, not alarm), notify, transition (quiet whoosh between major scenes)
  - Wired: decision confirm → confirm; consequence → success / notify / warning to match the decision feedback; chapter debrief → success;
    notifications → warning / notify / success; screen changes → transition
- **Controls** (Settings):
  - Mute everything
  - Interface sounds on/off + effects volume (with a preview ping)
  - Music & ambience on/off + music volume
  - Every value shows a percentage; sliders are disabled while muted. All saved on the device
- **Motion:** Reduce Motion now follows the device's "reduce motion" setting on a first visit. Inside the game it still stops animations,
  shows text instantly and holds still frames in the opening. Big text unchanged. Skip intro unchanged
- Settings are never overwritten with defaults before the saved ones are read (`ready` guard)

**Tests:** **141 passing** (10 new)
- `audio.test.ts` with a fake AudioContext: mute and volume curve; silent and no AudioContext before the unlock; every cue on the effects bus,
  music on the music bus, only master to the speakers; volume and mute reach the buses, including values set before the unlock;
  soundscape mapping and switching
- `AudioSettings.test.tsx`: sliders and mute saved and sent to the mixer; menu theme → base ambience only after the first tap;
  device reduced-motion → Reduce Motion on
- tsc, eslint and build pass

**Browser:** Settings shows mute, effects + volume, music + volume, and motion in Arabic (RTL sliders fill right-to-left).
No "AudioContext was not allowed to start" warnings with sound and music saved as on.
**Not verified:** how it actually sounds; I can't listen in this environment, so the mix needs a listen on real speakers.

**Known issues / limits**
- Volumes are a perceptual guess; please listen and adjust the defaults (music 60 %, effects 80 %)
- Tablet and phone layout tuning is Phase 6; full journey QA is Phase 7

## 2026-11-15 · Cinematic Game Experience: PHASE 4, Gameplay Polish
Builds on Phases 1–3. Phases 5–7 are not started. Nothing pushed or deployed. Simulation, decisions, NASA data and What If Lab are unchanged.

**Found before changing**
- Resource numbers changed silently
- Nothing told the child when a resource crossed into danger
- The decision result never said how the day actually went
- The base map looked the same on a 100 % and a 33 % sunlight day
- After the opening, the briefing repeated the welcome and crew introductions

**Done** (`src/lib/game/feedback.ts`, pure: the UI only animates what it computes)
- **Animated resource indicators** (top bar):
  - A resource that changed flashes (red ▼ / green ▲) and shows the amount (e.g. "▼ −78")
  - A critical bar pulses
- **Mission notifications:** short stacked cards under the top bar that appear only when something crosses a line:
  - energy below the reserve ("انتبه! مخزون الطاقة بدأ ينخفض.") or critical, and back above the reserve
  - water low or **critical** ("تحذير: الماء منخفض جدًا!")
  - recycler fault / repaired
  - life support strained
  - storm (training scenario); safety steps complete
  - systems switched off to save power
  - They never repeat for the same state, can be closed (✕), leave after ~5 s, play a matching sound (if on) and are read by screen readers
- **Decision feedback** on the consequence screen, judged only on the day the decision shaped:
  - ✨ "قرار موفّق!" ("Well-chosen!"): no shortage
  - ⚖️ "قرار له ثمن" ("A decision with a cost"): the base switched systems off, **or** the battery fell below the reserve
  - ⚠️ "القاعدة واجهت صعوبة" ("The base struggled"): life support was underpowered
  - It appears with a small burst after the base changes from "before" to "now", next to SUHAIL's reaction (Phase 2)
- **Environmental feedback from NASA data:** the base map takes the day's sunlit fraction. Less light means the low Sun dims and sinks and
  the landscape darkens, while the base lights stay on. Used in Mission Control (today's forecast), day screens, the consequence screen
  (yesterday's light → today's) and chapter debriefs
- **Shorter path into play:** after the full cinematic opening, the Mission Briefing starts at "The four resources", because the opening
  already welcomed the child and introduced the crew. Skipping the opening, or "Crew & base" in the menu, still shows the whole briefing

**Fixed while checking:** farming at full power was first labelled "قرار موفّق!" although it drained the battery below the reserve.
It is now "قرار له ثمن" with the reason (e.g. "البطارية نزلت تحت الاحتياطي (101 ك.و.س)")

**Tests:** **131 passing** (11 new)
- `feedback.test.ts`: change thresholds; notifications for energy, water critical, recycler, storm and safety; no repeats; bilingual;
  decision feedback matches the day log on all 27 paths; farm-full is not a "success"
- `Feedback.test.tsx`: the top bar flashes, shows and dismisses the energy notification; the map darkens with less light
- tsc, eslint and build pass

**Browser, seen by eye (AR):** Mission Control at 50 % light (dimmer map, base "Warning", Menu button); after "farm at full power":
the energy notification, ▼/▲ flashes, and the "قرار له ثمن" banner

**Known issues / limits**
- At 125 % Windows display scaling the browser-pane screenshots cut off the right edge; the page itself measured with no overflow
- On phones a notification covers part of the top bar for ~5 s (it can be closed)
- Volume sliders and audio polish are Phase 5; tablet layout tuning is Phase 6

## 2026-11-15 · Cinematic Game Experience: PHASE 3, Main Menu & Navigation
Builds on Phases 1–2. Phases 4–7 are not started. Nothing pushed or deployed.

**Found before changing**
- The start menu looked like a website: a row of small header buttons above a picture
- There was no way back to the menu from inside the game
- "Start Mission" silently erased a saved mission

**Done**
- **Cinematic start menu** (`src/components/screens/Intro.tsx`, same `Splash` props):
  - The SELENE-1 lunar scene is the background, with a slow camera drift (40 s) and lunar dust
  - Big SPACE COMMANDER / OPERATION MOONLIGHT title, on the right in Arabic
  - Game-style menu, one item per line, rising in one after another. **Start Mission** is the big orange primary and gets focus
  - **SUHAIL reacts to the item in focus** and explains it in one line, with a matching expression: welcome → happy, Story → curious,
    Crew & base and About the Science → explaining, Continue → encouraging, Settings → idle. He keeps his welcome until the child moves
  - The team's mission poster stays: beside the menu on wide screens, below it on phones
  - Sound and language as small icons; credit and version in the footer
- **Keyboard / touch / mouse:** ↑/↓ move through the menu (wrapping), Home/End jump to the ends, Enter/Space activate; hover and tap work the same
- **Saved mission:** "Continue my mission · Day N" becomes the first, primary item with "Welcome back". Start Mission now asks first
  ("A new mission … replaces your saved mission (Day N). Are you sure?"); "Back" keeps the save
- **In-game navigation:** a 🏠 **Menu** button in the game toolbar (lunar base tour, every mission screen, outcome, What If Lab, report).
  The mission is saved, so the menu offers to continue on the same day

**Fixed while checking**
- **Hydration mismatch** (a real console error): the lunar dust positions used `Math.sin`, which gave slightly different decimals on the
  server and in the browser. It now uses an integer generator with rounded values. The page loads with no React warnings
- A hidden button in the closed confirm dialog took the initial focus away from Start Mission
- The background was too dark to see the scene; the darkening is lighter and the side shade is desktop-only

**Files:** rewritten `src/components/screens/Intro.tsx`. Modified: `Hud.tsx` (Menu button), `mission/MissionHUD.tsx`,
`mission/MissionBriefing.tsx`, `Game.tsx` (`goMenu`), `cinematic/Backdrops.tsx` (shared `Dust`, moved from the cinematic),
`cinematic/CinematicIntro.tsx`, `app/globals.css` (menu drift). New test: `screens/StartMenu.test.tsx`

**Tests:** **120 passing** (5 new): menu order and focus; ↑/↓/Home with SUHAIL's hint and expression; Arabic + story; saved mission →
Continue first, Start asks, Back keeps it, Yes starts fresh; in-game Menu → Continue resumes the same day. tsc, eslint and build pass.
Browser, seen by eye: AR at 800 px and 1280 px, keyboard focus with SUHAIL's NASA hint, 375 px with no horizontal scroll

**Known issues / limits**
- On phones the menu is long; the poster sits below it (scroll to see)
- Sound volume sliders are Phase 5

## 2026-11-15 · Cinematic Game Experience: PHASE 2, Character Experience
Builds on Phase 1. Phases 3–7 are not started. Nothing pushed or deployed.

**Why a vector SUHAIL:** the team's SUHAIL art is 130×136 px (blurry when large) and its eyes are baked into the picture, so it cannot
change expression. `SuhailRobot` redraws the **approved identity**: small floating white robot, rounded body, dark glossy face display,
bright cyan digital eyes, orange details (ear discs, belt, hands). The team art is unchanged and still used on the start screen,
in the briefing and as `SuhailPortrait`.

**Done**
- **8 expressions** (`src/components/SuhailRobot.tsx`), each with its own eyes, arms, head tilt, accent colour and a small indicator:
  - idle: blinks
  - curious: one eye bigger, tilt, "?"
  - thinking: looks up, hand to chin, rising dots
  - explaining: points at a small hologram
  - warning: wide alert eyes, raised arms, pulsing "!" and ear lights. Designed to look alert, not angry
  - happy: smiling arcs, waving, sparkle
  - encouraging: wink, wave, green sparkle
  - concerned: raised inner brows, arms drawn in, a small drop
  - Always floating. Pure SVG + CSS; Reduce Motion stops every animation
- **Context-aware companion** (`src/lib/game/companion.ts`, pure): reads the real state and dialogue rules and returns an expression and a
  short reaction. It uses the brief's lines: healthy → happy "ممتاز يا قائد! القاعدة تعمل بكفاءة."; low energy → warning
  "انتبه! مخزون الطاقة بدأ ينخفض."; after any decision → explaining "قرار مهم! دعنا نراقب تأثيره.". Also: water → concerned,
  crops → concerned, locked options → thinking, recovery or crew sheltered → encouraging, storm before safety → warning
- Where SUHAIL now reacts:
  - Opening: happy → explaining → curious while welcoming; explaining → encouraging at the commander moment
  - Decision room: curious, or worried when something is wrong. He asks; the child decides
  - Consequence screen: "important decision!" first, then his reaction to the new base state
  - Day screens and chapter debriefs: expression from the state
  - Mission intros: explaining
- `SuhailSays` shows the mood name ("سهيل · تنبيه") and tints the bubble. The old `mood="normal"` still works (maps to idle)
- **Crew reactions:** in every crew report the portrait gets a ring in the status colour (pulsing when critical) and a small face (🙂 😟 😮 😄)
- Crew introductions were added in Phase 1 (four spotlights). Arabic lines now use «» quotation marks

**Fixed while checking**
- The chapter debrief repeated SUHAIL's line twice; now shown once
- The first warning face looked angry, and the thinking/concerned hands merged into one orange blob; both were redrawn

**Tests:** **115 passing** (11 new)
- `companion.test.ts`: healthy/low-energy/after-decision/storm/recovery cues with the brief's lines; every rule has an expression; on all 27
  paths × every moment the cue is valid and bilingual, and **never names an option for the child**
- `SuhailRobot.test.tsx`: 8 distinct expressions, blink, decorative-only, mood label and the "normal" alias
- tsc, eslint and build pass

**Browser (seen by eye this time):** all 8 expressions; the opening's SUHAIL scene (happy → explaining) and crew scene; the chapter-1 debrief
after "farm at full power" (SUHAIL warning, Adam's ring on warning)

**Known issues / limits**
- The vector SUHAIL is our redraw of the approved character; the team should confirm it matches their identity board
- Crew portraits are the team's still art; their reaction is the ring and face badge, not animated faces
- Volume sliders are Phase 5; layout tuning for tablet is Phase 6

## 2026-11-15 · Cinematic Game Experience: PHASE 1, Cinematic Opening
Built on V6. Only Phase 1 is done; Phases 2–7 are not started. The game version number has not been changed.

**Inspected before changing (V6 findings)**
- The opening played only after the child pressed Start, not on launch
- Its "Commander" scene was a long reading page, and its "Explore your base" scene repeated the Lunar Base tour that follows
- A Sound/Music setting saved from a previous visit could try to play before the child touched anything
- Settings load after the first render, so a "first launch" check must wait for them (new `ready` flag)

**Done: six scenes (~60–90 s, WONDER → RESPONSIBILITY → DISCOVERY)**
1. **Deep space (8 s):** dark → stars → Earth from lunar orbit → the Moon fills the foreground. The Orbit Star logo + SPACE COMMANDER appear,
   then OPERATION MOONLIGHT. A radio blip plays if sound is on
2. **Approaching the Moon (10 s):** a slow camera push to SELENE-1 (solar arrays, antenna beacon, habitats with lit windows, greenhouse dome,
   rover, Earth in the distance) with drifting lunar dust. Title: SELENE-1 · lunar research outpost · near the south pole
3. **The mission alert (10 s):** a red signal sweep and pulsing antenna rings, then a holographic transmission from (fictional) Mission Control:
   "the base needs a new commander to watch over its survival systems: Energy · Water · Air · Food". It ends on a question
4. **SUHAIL:** he glides in and floats with a gentle tilt, pulsing on each new line. Three lines from the approved script
5. **The crew:** Layan, Adam, Mira and Rashid step into a light of their own colour, each with a portrait, specialty, facility and one line in
   their own voice. Each one holds about 3.2 s (manual with Reduce Motion), and the names can be tapped
6. **The commander moment:** the camera rises over the base and SUHAIL gives the two responsibility lines. Then "Are you ready to lead the mission?"
   with **Start Mission** (→ the existing game, Mission Briefing) and **Discover the story** (story dialog with its own Start Mission)

**Behaviour**
- Starts by itself on the first launch on a device. **Skip** (button or Esc) goes to the start menu. Both remember the choice (`introDone`)
- "Replay intro" on the menu still works
- **No sound before the first tap or key press**, even if Sound/Music were left on. Sound is otherwise optional and invited by a button,
  never started automatically. The audio is original and procedural
- Reduce Motion: still frames, instant subtitles, shorter holds, no auto crew rotation. Enter / arrow keys continue the self-running scenes.
  All buttons are at least 44 px. Arabic (RTL) and English
- The rest of the game is unchanged: simulation, decisions, NASA data, What If Lab, journey

**Files**
- Rewritten: `src/components/cinematic/CinematicIntro.tsx`, `src/lib/cinematicScript.ts`
- Modified: `src/components/cinematic/DialogueBox.tsx` (`audio` flag), `src/components/settings.tsx` (`ready`), `src/components/Game.tsx`
  (auto-start, `startNewMission`, skip → menu), `src/app/globals.css` (8 s deep-space timeline and new scene animations),
  `src/components/Game.e2e.test.tsx` (new first-launch order)
- New: `src/components/cinematic/CinematicIntro.test.tsx`
- Removed from the opening: the long "Commander" page, "Explore your base" and "Mission Day 1" scenes. The Lunar Base tour in the journey covers exploring

**Tests**
- **104 passing** (7 new): script matches the brief; auto-start on first launch; no auto-start for returning players; skip by button and by Esc;
  a full six-scene playthrough with Start Mission → Mission Briefing (EN); Discover the story → Start Mission (AR, RTL); no audio before
  interaction, audio after a tap. tsc, eslint and build pass
- Browser (AR, 375 px): auto-start on launch; deep space auto-advances to the approach after ~8 s; no horizontal page scroll in any scene;
  Start Mission opens the Mission Briefing; no console errors

**Known issues / limits**
- The browser pane was hidden during the check, so the scenes were checked through the page, not by eye; the motion quality needs a visual review
- At 375 px the crew's sideways slide overflowed by ~25 px; it was changed to a vertical rise and re-measured clean
- SUHAIL is still the approved still artwork (floating, pulsing); eye and gesture expressions are Phase 2
- No volume sliders yet (only on/off for sound and music); that is Phase 5
- The Mission Briefing after the opening repeats some of what the opening shows (welcome, crew); trimming it is a Phase 3/4 decision

**Performance:** pure CSS/SVG, no new dependencies or image files. Every scene uses only transform/opacity animations plus ~22 dust motes

## 2026-11-15 · V0.7 (prompt label): Complete Mission Experience
Comes after the V5 release. The game version number has not been changed. The simulation logic was not replaced.

**One journey, start to finish:**
Start Menu → cinematic (first visit only) → **Mission Briefing** → **Lunar Base** tour → for each of the 3 chapters:
mission intro → **Mission Control** (inspect, find clues) → **Mission Challenge** (decision) → **Decision Consequences** → days →
**Mission Transition** (debrief + next intro). Chapter 3 is the **Emergency Sequence**: storm intro, then the hub becomes
"Emergency: protect the crew first" with the 4 mandatory safety steps. Then **Mission Outcome** → **What If Lab** → **Commander Report**.
**About the Science** is reachable from the toolbar at any time.
- Previously Start skipped the briefing and the base tour (they were only in the menu). Now they are part of the path

**Done**
- `lib/game/journey.ts` (pure):
  - `JOURNEY` (the 12 scenes) and `CHAPTERS` (3 chapters over 7 days)
  - `crewReports(state)`: Adam (energy, quotes the real NASA light of the last day), Layan (life support and water), Mira (greenhouse),
    Rashid (safety), each with level ok / warning / critical / recovery
  - `baseCondition(state)`: Normal / Warning / Critical / Recovery / Mission complete, from the crew reports and active events.
    A critical event drops to Warning once the 4 safety steps are done
  - `conceptsExplored()` for the report
- SUHAIL: new state-based rules `CREW_SHELTERED` and `RECOVERY_WATER`, and a "chapter-end" moment used in every debrief
- UI:
  - The HUD shows the chapter tracker (✓ done chapters) and a base-status chip
  - The base map is framed in the colour of its state (Mission Control, day screens, debriefs, outcome); the consequence screen shows the chip
  - Crew reports appear on day screens, debriefs and the outcome screen. The outcome screen's fixed crew lines were replaced
  - Day screens add SUHAIL's contextual line
  - Gentle scene fade between major scenes, turned off by Reduce Motion
- Outcome: the three categories are shown together, with yours highlighted
- Commander Report: final outcome with reasons, resources start → end with change, the 3 decisions with their consequence,
  and the science concept behind each decision
- Audio and Reduce Motion stay in the toolbar/settings on every screen
- Tests: **97 passing**
  - `journey.test.ts` (13): scenes, chapters, the base states along a real path, crew reactions, SUHAIL lines, all 27 paths finishing with
    one of the 3 outcomes and opening the lab
  - `Game.e2e.test.tsx` (3): renders the real game in jsdom and clicks through the whole journey: English with the first-visit cinematic
    → Mission Accomplished; Arabic RTL → Safe but Limited; English → Mission Interrupted. Each goes through the What If Lab to the report
- tsc, eslint and build pass. Browser check: chapter-3 emergency in AR and EN (critical → warning after the safety steps), no horizontal
  scroll at 375 px on that screen

**Not done / limits**
- The browser check of the outcome and report screens at 375 px did not finish (the pane was hidden). Their content is covered by the e2e test
- New dev dependencies for the tests: jsdom, @testing-library/react, @testing-library/dom

## 2026-11-15 · V0.6 (prompt label): What If Lab
Comes after the V4 release. The game version number has not been changed.

**Flow:** pick a decision from your mission → see your original choice (cyan ●) and the other options (purple ■, locked ones
show why) → SUHAIL asks for a prediction **before** anything is revealed → replay → compare and explain.

**Done**
- `lib/game/whatif.ts` (pure, deterministic)
  - `decisionHistory()` returns every decision with its exact before/after engine state, **deep-frozen**
  - `tryRunWhatIf()` replays from the frozen state saved before the chosen decision using the existing engine (`simulateFrom`).
    Earlier decisions and days are reused unchanged
  - It never throws. Clear AR/EN errors cover: unknown decision or option, unfinished mission, decision not taken, same option as the original,
    and an option that was locked at that moment
- **Documented policy for later decisions that become invalid:** "keep, else one step more careful". A later choice is kept if it is still
  allowed. Otherwise the lab moves down a per-decision `CAUTION_LADDER` (e.g. boost → repair → cut-farm) to the first allowed option.
  The engine's `simulateFrom` now accepts this as an `OptionResolver` (the default behaviour is unchanged)
- Comparison data: final energy, water, oxygen and food with differences, the five facility conditions (changed ones flagged), the outcome,
  the divergence day, and each later decision marked kept or replaced (with the lock reason)
- Explanations generated from the day logs, in AR/EN:
  - **What changed?**
  - **What happened afterward?** Later choices, days where loads were switched off in only one timeline, and the outcome change
  - **Why?** Same NASA sunlight in both, so the energy difference comes from use (kWh); water from recycler recovery and greenhouse use;
    food from crop growth; oxygen from shortfall days; and the outcome reason
- Prediction: choose what to predict (battery, water, oxygen, food or mission outcome) and a direction (higher / same / lower,
  or better / same / worse), plus optional words in the child's own language. The result is checked against that exact target
- UI (`screens/WhatIfLab.tsx`):
  - Cyan = original, purple = alternative, also told apart by ● / ■ symbols and solid / dashed lines (not colour alone)
  - A branching timeline marks "the paths split here" and shows later choices changed by locks
  - Four resource cards, each with bars, a difference and a sparkline with the split day marked
  - Facility rows, outcome badges, and three explanation cards
- Checked in the browser (full flow, AR) at desktop and 375 px: no horizontal scroll, all buttons ≥ 40 px tall
- Tests: **82 passing** (15 new in `whatif.test.ts`): the original history is unchanged and frozen, alternatives are reproducible across every
  path and option, recalculated consequences match the final states, the policy is followed, and invalid branches are handled

**Not done / limits**
- The lab compares one changed decision at a time (no chains of several changes)
- Experiments are not saved after the report (only the latest result is shown in the Commander Report)

## 2026-11-14 · V0.5 (prompt label): NASA Science Integration
Comes after the V3 release (cinematic gameplay). The game version number has not been changed yet.

**Done**
- **Source reviewed: NASA SVS 5027** (primary candidate). It offers movies, frames and images, but no numeric files. Its frames
  are feasible to sample, but the printed "Shackleton" label covers our base site (and the scale is about 0.57 km/px). Documented
  decision: we measured the companion product **NASA SVS 4930** instead (same team, method and inputs: LOLA DEM + DE421;
  no labels; about 0.11 km/px)
- `scripts/extract_svs_illumination.py`: reads all 4,380 frames of 2026 (every 2 h) with HTTP Range requests (TIFF directory + the
  few LZW rows around the site; the decoder was checked byte-for-byte against Pillow), fits the map geometry (88°S ring, Shackleton
  check), and samples the site and a permanent-shadow control. The time axis was checked against the time printed on frames 1, 2000 and 4380
- `scripts/build_svs_dataset.py` (offline) → `src/data/nasa/svs-4930-selene1-2026.json`: 365 daily sunlit fractions + provenance,
  method, validation, limitations. Raw per-frame values are kept in `data/svs4930/selene1_luminance_2026.csv`
- Validation: 2026 **91.3 %** sunlit vs LOLA 18.6-year **88.4 %** at the same site; the Shackleton floor control is **0 %** in all frames.
  Threshold fixed after review: shadow renders exactly black, so dim low-angle sunlight counts as lit. The cut-off sensitivity is documented
- **`src/lib/nasa/NASADataAdapter.ts`**: schema validation, date validation, day/window lookups, brightest/darkest real weeks,
  and **missing-data fallback** to the labelled LOLA average (per day, or for the whole file if it fails validation). Static data, works offline
- **Engine connected:** `missionDayLight(day)` → `solarForDay` → `runDay`. Mission days map to the real week 2026-05-29 … 06-04
  (`MISSION_CALENDAR`, a design choice). Panels now make 119 / 102 / 68 / 170 / 204 / 187 / 85 kWh. The fictional
  `SCENARIO_LIGHT_FACTOR` was removed. The day log records `lightDate`, `sunlitFraction` and `lightSource`
- NASA values are now shown in the energy warning, the "Read the light forecast" clue, the day explanations and the decision card, each with its date
- **About the Science** screen rebuilt: the whole year as a chart, a scenario selector (mission week / brightest / darkest real week) showing
  energy per day against the 180 kWh need, the formula with NASA inputs and game assumptions colour-coded, checks, simplifications and sources
- Balance: all three endings are still reachable. Farming at full power never reaches *Accomplished*; saving energy keeps more options open
- Tests: **67 passing** (15 new in `NASADataAdapter.test.ts`: loading, schema, input validation, calculations, missing data, reproducibility).
  tsc, eslint and build pass. Checked in the browser at desktop and 375 px

**Not done / limits**
- No live NASA API: SVS has none for this. The app uses the verified static extract, attributed in the app
- Values are measured from rendered frames (binary lit/dark per 2 h, ~330 m sample), not from a published numeric product
- The player cannot yet choose the mission week for gameplay. The scenario selector is in About the Science only, to keep the tested balance

## 2026-11-14 · V0.5: Cinematic gameplay experience
**New flow for every mission:** cinematic intro → interactive base (investigate) → decision → consequences in the world → mission debrief → next mission.

**Implemented and tested in the browser (desktop 1440 px and mobile 375 px)**
- **Mission intros** (`experience/MissionIntro.tsx`): an atmosphere layer per mission (fading Sun / water alarm and falling drops / storm streaks
  and red alarm), title reveal, multi-speaker dialogue with crew portraits (`ScriptDialogue`: typed subtitles, Continue / Replay / Skip), objective, Start; Skip at any time
- **Interactive base** (`experience/BaseHub.tsx`): live base map from the engine (battery gauge on the power station,
  greenhouse light follows its condition, pulsing beacon on the facility with the emergency); 5 inspectable facilities
  with condition, resource values, owner's report, SUHAIL's explanation and **equipment inspections that reveal clues**;
  crew comms that react to events; "To the decision room" unlocks after enough clues (2/2/1) and, in Mission 03, the 4 engine safety steps
- **Data-driven events** (`lib/game/experience.ts`): ENERGY_WARNING (solar forecast, Mission 01), WATER_WARNING (actual recycler fault),
  SPACE_WEATHER (critical, Mission 03), LOW_RESERVE (energy below 150 after Mission 01), CROP_DELAY. Each has a trigger, title, description,
  map facility, character dialogue, interaction and consequence
- **Decision screen**: the investigation notes found by the player, and each option's real daily cost (energy used vs. panel output) computed by the engine
- **Visible consequences**: the base map switches from "Before your decision" to "Base now" (battery gauge, greenhouse light and
  facility statuses animate), resource tiles count to their new values, and facility changes are listed
- **Mission debrief** (`experience/MissionResult.tsx`): status, the decision and its consequences, animated start→end resources,
  facility conditions, crew safety, **which next-mission options will be locked or open** (computed in the exact state the player will face), and SUHAIL's closing line
- Polish: press feedback on buttons, alert pulses, clue toasts, count-up numbers; everything respects Reduce Motion
- Replaced the old FaultEvent / StormEvent / SafetyScreen in the flow (the components still exist); engine and endings unchanged
- Tests: **52 passing** (12 new in `experience.test.ts`: event triggers, inspection conditions, clues, option costs from the engine, carried locks)

**Not done / limits**
- Character expressions are portrait art with pulses and mood badges; eyes and mouths are not animated (no layered art)
- Clues are not saved with session progress (resuming keeps decisions, not clues)

## 2026-11-14 · V0.4 (revised spec): Decision & simulation engine
**Done**
- GameState restructured to the spec: `resources{energy,water,oxygen,food}`, `facilities{powerStation,waterRecycling,greenhouse,lifeSupport,shelter}`,
  `crewSafety`, `safetyChecks`, `decisionHistory`, `activeMissionId`, `missionResults`, `missionStatus`
  (IN_PROGRESS → MISSION_ACCOMPLISHED / SAFE_BUT_LIMITED / MISSION_INTERRUPTED)
- Resource limits in `RESOURCE_LIMITS`; NaN and Infinity are rejected (`sanitizeResources`, `applyResourceEffects`)
- Decision options are now pure data: id, title, description, prerequisites, policy, resource effects, facility effects,
  consequences and explanation. The engine interprets them (`lockReason`, `applyDecision`, `tryApplyDecision`)
- Mission 01 has exactly 3 options (Prioritize greenhouse / Conserve energy / Balance loads); Mission 02 has 3 (Increase recycling,
  which needs ≥ 150 kWh / Reduce greenhouse water / Inspect & repair); Mission 03 has 3, each requiring the 4 safety checks
- `safety.ts`: the 4 safety steps run through the engine and cannot be bypassed; `isMissionAvailable` gates each chapter
- `dialogue.ts`: SUHAIL's data-driven rules (LOW_ENERGY, LOW_WATER, LOW_GREENHOUSE, GOOD_ENERGY, SAFETY_WARNING, OPTIONS_LIMITED)
- `whatif.ts`: `replayFromState` replays from the exact saved state; the original timeline is never mutated
- UI: the engine validates every confirm; options show their description; the result screen lists the stored consequences,
  the science behind them and SUHAIL's reaction; the safety screen uses the engine's checks
- Tests: 40 passing (the 12 required cases plus the NASA, energy-model and shape tests)
- Removed: "inspect the power station" (Mission 01) and "rationing" (Mission 02), to match the 3-option spec

### Earlier V0.4 pass
- `GameState` now holds day, energy, water, oxygen, food, **facility conditions**, **crew safety**, **decision history**,
  **active mission** and **mission outcome** (`src/lib/game/types.ts`)
- Named types: `Mission`, `Decision`, `DecisionOption`, `ResourceEffect`, `Consequence`, `GameEvent`, `MissionResult`
- Data-driven chapters and events in `missions.ts` (Mission 01 Energy, Mission 02 Water & Food, Mission 03 Safety); decisions stay in `decisions.ts`
- Engine: pure, immutable transitions; validation rejects unknown, locked or repeated decisions; resources clamped to limits;
  detailed day log (light, load breakdown, recovery, crop growth)
- `consequences.ts`: `explainDay` ("why did this happen?"), `explainFacilities`, state-aware `guidanceFor` (SUHAIL), `missionResult` (reasons for the ending)
- UI: "Why did this happen?" panel on results, days and the ending; SUHAIL guidance follows the state; the base map reflects facility conditions
- Optional progress saved on the device (`persistence.ts`, validated) with "Continue my mission" on the start screen
- `docs/simulation-assumptions.md`: every constant is labelled as an educational assumption, pending review by the NASA Data Lead
- Tests: **42 passing** (22 new: state shape, immutability with frozen state, determinism, limits, invalid decisions,
  one Day-2 choice → resources, facility, options, guidance and outcome, explanations, persistence)
- Checked in the browser: explanations, guidance changes, save, reload and resume, then a full run to the ending

**Success criteria**
Every option leads to a different state ✓ · an early choice changes later events ✓ · different choices give different results ✓ ·
the same choices give the same results ✓ · tests and build pass ✓

## 2026-11-14 · Release v0.2: Cinematic introduction
- 7-scene cinematic (`src/components/cinematic/`), procedural audio (`src/lib/audio.ts`), bilingual script (`src/lib/cinematicScript.ts`)
- Onboarding saved in settings (`introDone`); Skip, Esc and Replay intro; Sound and Music toggles
- Tested: full sequence, dialogue Continue and Replay, Skip, returning player, Arabic and English, desktop 1440 px and mobile 375 px, no console errors
- Release notes: see `CHANGELOG.md`. Git tags: `v0.1` (previous version, 3dbcdff) and `v0.2` (this version)

## 2026-11-14 · Illustrated decision cards (from the team mockups)
- New `src/components/mission/DecisionCards.tsx`: decision and result screens redesigned after the team's two mockups
  - Step indicator Investigate → Decide → Result; centred title with orange flourishes; the problem as the subtitle
  - SUHAIL on the side with his hint bubble; reports, the NASA or science moment and the decision timeline stay in the side column
  - Option cards: illustration (`OptionArt`: team art scene + glowing action icon), A–D letter, benefit/cost and a selection circle;
    the selected card glows orange; locked cards are greyed out and show the reason; large orange "Confirm choice"
  - Result: green badge with the choice, SUHAIL's explanation, 4 resource tiles with the change (e.g. −108 kWh, +15%), the crew line with portrait, and the day's energy
- `public/art/greenhouse.png` cropped from the decision mockup
- Old decision and consequence screens removed from `screens/Mission.tsx`
- Checked: full playthrough to an ending (locks on Day 3 and Day 5 shown correctly), desktop 1440 px and mobile 375 px, no console errors

## 2026-11-14 · Team art integrated (Cosmic Discovery)
- Cropped from the team's visual identity board (column B, the recommended direction) into `public/art/`:
  hero, SUHAIL, Layan, Adam, Mira, Rashid, SELENE-1 base. The crop script is in the session scratchpad; the art source is the team board image
- Start screen: hero art (young commander + SUHAIL + SELENE-1) replaces the vector title; orange glowing START MISSION
- SUHAIL everywhere now uses the board art in a glowing ring, with a mood badge (? curious, … thinking, ! warning, ★ happy)
- Crew cards and crew lines use the portraits (`Portrait` component) with identity-colour rings
- Briefing step 1 shows the SELENE-1 base art; primary buttons use the orange pill style from the mockups
- Limitation: crops come from a 1536 px board, so they are low resolution. Replace the files in `public/art/` with the designer's originals (same names) for sharp art

## 2026-11-14 · V0.3: Lunar base & mission briefing
**Done**
- `MissionBriefing`: 4 steps with a step indicator (Mission → Commander → Crew → Resources → Base) introducing Operation Moonlight,
  SELENE-1, the child as commander, the 7 fictional days and 3 missions, the 4 astronauts and the 4 resources
- `LunarBaseScreen`: isometric 2.5D base with 6 selectable facilities. A tap/click on a building, or the keyboard-friendly
  button list (48 px targets), opens a `FacilityCard` showing what it does, who runs it, which resources it uses and makes, and a SUHAIL question.
  "Begin Day 1" unlocks after 3 facilities are visited
- `SuhailDialogue`: SUHAIL asks a question first and the child reveals the explanation, so SUHAIL never decides
- `ResourceIndicator` (HUD bar + large tile like the approved results mockup), `MissionHUD`, `CrewCard`, `Stepper`; orange `solar` CTA button from the mockups
- Crew identities: Layan cyan, Adam orange, Mira green, Rashid coral (renamed from "Rashed" to match the spec)
- Shared typed content in `src/lib/mission.ts` (resources, facilities) reading from the existing typed `GameState` (`src/lib/game/types.ts`)
- Starting resource values are labelled on screen as illustrative game values, not NASA measurements
- Tests: 20 passing (4 new for mission content) · tsc ✓ · eslint ✓ · build ✓ · checked in browser at desktop and 375 px mobile, no console errors

**Notes**
- The team's mockups (decision and results screens) were used as style reference: step indicator, glowing cards, orange CTA, resource tiles.
  Their illustrated SUHAIL and base art can replace the SVG placeholders once delivered as separate files

## 2026-11-14 · V0.2: Visual shell & start menu
**Done**
- Cinematic responsive start screen: SELENE-1 lunar horizon (low Sun, polar shadows, Earth, lit base kept clear of buttons),
  Orbit Star logo area, SPACE COMMANDER title, OPERATION MOONLIGHT subtitle, tagline, large START MISSION button
- Secondary navigation: Story (modal), Science Guide, Settings (modal), Language (AR/EN toggle)
- Settings modal: language, sound, reduce motion, larger text (persisted per viewer); also opened from the in-game toolbar
- SUHAIL restyled to the brief: floating white glossy rounded body, dark glossy face, cyan eyes, orange antenna/ear/chest accents, 5 expressions
- Reusable components: `Button` (md/lg), `Card`, `Panel`, `Modal` (native `<dialog>`: focus trap, Esc, focus return),
  `Heading`, `Kicker`, `Switch`, `PlaceholderTag`, `ScreenTitle`; brand: `OrbitStarLogo`, `LunarHorizon`
- Temporary artwork is labelled on screen ("Temporary artwork — final logo & characters by the design team")
- START MISSION → Mission Briefing (existing). All existing gameplay is unchanged
- Static export (`output: "export"`) for hosting
- Checks: tsc ✓ · eslint ✓ · 16 tests ✓ · build ✓ · verified in browser at 1280×800 and 375×812 (no horizontal scroll, no console errors)

**Known limitations**
- Logo and SUHAIL are vector placeholders until the designer's approved files arrive (swap in `src/components/Brand.tsx` / `Suhail.tsx`)

**Live:** https://space-commander-theta.vercel.app (Vercel project `space-commander`, team raqeeb). V0.2 was deployed on 2026-11-14.
**Repo:** https://github.com/mohmoedkh22-maker/space-commander (public)
Redeploy with: `npm run build`, then `cd out` and `npx vercel deploy --prod --yes --name space-commander`

## 2026-11-14 (Day 1)
**Done**
- WP01 foundation: Next.js + TS + Tailwind project, PRD/AGENTS/DESIGN/README docs
- WP04 V4.1–V4.3: NASA LOLA illumination extracted (0.8844), validated, documented, wired into the energy model
- WP03: deterministic engine, 3 data-driven decisions, butterfly locks, automatic load shedding, 3 endings
- WP05: What If Lab (replay with one change, prediction, chart and table comparison, forced-change notes)
- WP02 (code side): SVG isometric base with facility states, SUHAIL with 5 expressions, HUD, AR/EN with RTL/LTR
- Tests: 16 passing (NASA adapter, energy model, engine, branching, endings reachable, What If immutability)
- Checks: `tsc`, `eslint`, `next build` all pass

**Open / next**
- Create the public GitHub repo and deploy to Vercel (needs team accounts)
- Designer assets (logo, character art) can replace the SVG placeholders in `src/components/`
- Record a 30-second backup demo video
- Add team member names to README
- Optional: sound effects polish and session save
