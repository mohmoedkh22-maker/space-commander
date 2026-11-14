# AGENTS.md: instructions for AI coding agents

Read first: `PRD.md`, `DESIGN.md`, `progress.md`, `docs/nasa-data-sources.md`.

## Stack
Next.js 15 App Router, React 19, TypeScript (strict), Tailwind CSS 4, Vitest. No backend.

## Architecture rules
- `src/lib/game/*` and `src/lib/nasa/*` are **pure TypeScript**: no React and no randomness. The UI derives everything from
  `simulate(choices, stepIndex)`.
- Game balance numbers live only in `src/lib/game/config.ts`. Decision content lives in `src/lib/game/decisions.ts` (AR + EN).
- NASA data is read only through `src/lib/nasa/NASADataAdapter.ts` (daily SVS 4930 light, used by the engine) and
  `src/lib/nasa/illumination.ts` (LOLA long-term average: context and fallback). Missing data must fall back with a
  visible `source` flag — never fill gaps with made-up values.
- All user-facing text must exist in Arabic and English.

## Hard rules
- Never invent NASA values. Never present game assumptions as NASA measurements.
- SUHAIL never makes decisions for the player.
- No frightening or graphic consequences. The crew is always protected.
- Never commit secrets. Ask before pushing or deploying.

## Checks before declaring success
```bash
npx tsc --noEmit
npx eslint src
npm test
npm run build
```
