# progress.md

## 2026-11-14 · Release v1.0.0: Cinematic introduction
- 7-scene cinematic (`src/components/cinematic/`), procedural audio (`src/lib/audio.ts`), bilingual script (`src/lib/cinematicScript.ts`)
- Onboarding saved in settings (`introDone`); Skip, Esc and Replay intro; Sound and Music toggles
- Tested: full sequence, dialogue Continue and Replay, Skip, returning player, Arabic and English, desktop 1440 px and mobile 375 px, no console errors
- Release notes: see `CHANGELOG.md`. Git tag `v1.0.0`

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
