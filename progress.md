# progress.md

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
