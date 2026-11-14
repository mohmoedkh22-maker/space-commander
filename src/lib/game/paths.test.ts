// Balance report: prints every path's outcome (run with `npx vitest run paths`).
import { it } from "vitest";
import { allPaths, computeEnding, simulate } from "./engine";

it("prints path table", () => {
  const rows = allPaths().map((c) => {
    const r = simulate(c);
    const s = r.state;
    return {
      path: Object.values(c).join(" > "),
      eff: r.records.map((x) => (x.fallback ? `*${x.optionId}` : x.optionId)).join(" > "),
      bat: Math.round(s.batteryKWh),
      water: Math.round(s.waterL),
      o2: s.oxygenPct,
      crop: s.cropPct,
      res: s.researchPoints,
      short: s.shortfallDays,
      end: computeEnding(s),
    };
  });
  console.table(rows);
});
