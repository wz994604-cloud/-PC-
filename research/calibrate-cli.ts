import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { calibrateV02 } from "./calibration/calibrate";
import { loadRealDraws } from "./data/load";
import { sortDraws, validateDraws } from "./data/validate";

const input = process.argv[2];
if (!input) throw new Error("Usage: npm run research:calibrate -- <history.sqlite|json|csv>");
const draws = sortDraws(loadRealDraws(resolve(input)));
const quality = validateDraws(draws);
if (!quality.valid) throw new Error("History failed data-quality checks");
const ranked = calibrateV02(draws);
const output = {
  generatedAt: new Date().toISOString(),
  sampleSize: draws.length,
  selectionRule: "validation-only; test is locked and report-only",
  best: ranked[0],
  candidates: ranked,
};
writeFileSync("research/reports/calibration.generated.json", JSON.stringify(output, null, 2));
console.log(JSON.stringify(output.best, null, 2));
