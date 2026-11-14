// Balance report: prints every path's outcome (run with `npx vitest run paths`).
import { it } from "vitest";
import { allPaths, simulate } from "./engine";

it("prints path table", () => {
  const rows = allPaths().map((c) => {
    const r = simulate(c);
    const s = r.state;
    return {
      path: Object.values(c).join(" > "),
      eff: r.records.map((x) => (x.fallback ? `*${x.optionId}` : x.optionId)).join(" > "),
      energy: Math.round(s.resources.energy),
      water: Math.round(s.resources.water),
      o2: s.resources.oxygen,
      food: s.resources.food,
      res: s.researchPoints,
      short: s.shortfallDays,
      status: s.missionStatus,
    };
  });
  console.table(rows);
});
