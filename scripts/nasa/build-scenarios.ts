// WP06.4 — build the scientific scenarios OFFLINE from the cached NASA datasets. No network access at all.
//
//   npm run build:scenarios
//
// Reads (never modifies):  public/data/donki/events.json, public/data/donki/metadata.json,
//                          public/data/radlab/crater-d1d2.json, public/data/radlab/bpd.json
// Writes:                  public/data/scenarios/scenarios.json   (only if every scientific rule passes)
//
// Deterministic: the same inputs always produce byte-identical output. If validation fails, the previous file is kept.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateScenarios, validateScenarioSet } from "../../src/lib/nasa/scenarios/engine.ts";
import { RADLAB_FILES, type RadLabDatasetFile } from "../../src/lib/nasa/scenarios/radlabScenarios.ts";

const root = process.cwd();
const OUT = path.join(root, "public", "data", "scenarios", "scenarios.json");
const readJson = async (rel: string) => JSON.parse(await readFile(path.join(root, rel), "utf8"));

async function main(): Promise<number> {
  const events = (await readJson("public/data/donki/events.json")).events;
  const metadata = await readJson("public/data/donki/metadata.json");
  const radlab: Record<string, RadLabDatasetFile> = {};
  for (const [id, file] of Object.entries(RADLAB_FILES)) radlab[id] = await readJson(file);

  const set = generateScenarios({ donki: { events, metadata }, radlab });
  const errors = validateScenarioSet(set);
  if (errors.length) {
    console.error(`✖ ${errors.length} scientific-rule violation(s); ${path.relative(root, OUT)} left unchanged:`);
    for (const e of errors.slice(0, 30)) console.error(`  - ${e}`);
    return 1;
  }
  await mkdir(path.dirname(OUT), { recursive: true });
  const tmp = `${OUT}.tmp`;
  await writeFile(tmp, JSON.stringify(set, null, 1) + "\n");
  await rename(tmp, OUT);
  const c = set.counts;
  console.log(`✔ ${c.total} scenarios (CME ${c.CME} · SEP ${c.SEP} · FLR ${c.FLR} · lunar orbit ${c.LUNAR_ORBIT_RADIATION} · deep space ${c.DEEP_SPACE_COMPARISON}) + ${c.lessons} SUHAIL lessons`);
  console.log(`  ${path.relative(root, OUT)}`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error("✖ Unexpected error:", e);
    process.exit(1);
  },
);
