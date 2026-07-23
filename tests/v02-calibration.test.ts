import { describe, expect, it } from "vitest";
import { calibrateV02 } from "../research/calibration/calibrate";
import type { ResearchDraw } from "../research/types";

const rows = (count: number): ResearchDraw[] => Array.from({ length: count }, (_, index) => {
  const sum = (index * 7) % 28;
  return {
    issue: String(index + 1),
    openTime: new Date(1_700_000_000_000 + index * 210_000).toISOString(),
    numbers: [
      Math.min(9, sum),
      Math.min(9, Math.max(0, sum - 9)),
      Math.max(0, sum - 18),
    ],
    sum,
  };
});

describe("v0.2 calibration", () => {
  it("rejects undersized data and ranks deterministic validation-only candidates", () => {
    expect(() => calibrateV02(rows(299))).toThrow(/at least 300/);
    const first = calibrateV02(rows(320));
    const second = calibrateV02(rows(320));
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(1);
    expect(first[0].objective).toBeLessThanOrEqual(first.at(-1)!.objective);
    expect(first[0].validation.sampleSize).toBeGreaterThan(0);
    expect(first[0].test.sampleSize).toBeGreaterThan(0);
  });
});
