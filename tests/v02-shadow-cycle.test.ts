// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { saveDraws } from "@/lib/db/draw-repository";
import { getShadowPredictionCount } from "@/lib/db/shadow-prediction-repository";
import { closeDatabaseForTests } from "@/lib/db/sqlite";
import { runPredictionCycle } from "@/lib/prediction/cycle";
import { createV02ShadowPrediction } from "@/lib/prediction/v02-shadow";
import type { Draw } from "@/lib/draw/types";

const draw = (issue: number, sum: number): Draw => ({
  issue: String(issue),
  numbers: [Math.min(9, sum), Math.min(9, Math.max(0, sum - 9)), Math.max(0, sum - 18)],
  sum,
  bigSmall: "" as Draw["bigSmall"],
  oddEven: "" as Draw["oddEven"],
  pattern: "" as Draw["pattern"],
  openTime: new Date(1_700_000_000_000 + issue * 210_000).toISOString(),
  rawOpenTime: null,
});

beforeEach(() => {
  process.env.DATABASE_PATH = ":memory:";
  closeDatabaseForTests();
});
afterEach(() => {
  closeDatabaseForTests();
  delete process.env.DATABASE_PATH;
});

describe("v0.2 candidate B shadow cycle", () => {
  it("adapts draw history to a deterministic shadow prediction", () => {
    const history = Array.from({ length: 120 }, (_, index) => draw(index + 1, (index * 7) % 28));
    const prediction = createV02ShadowPrediction([...history].reverse());
    expect(prediction).toMatchObject({
      targetIssue: "121",
      basedOnIssue: "120",
      modelVersion: "v0.2-candidate-b",
      sampleSize: 120,
    });
    expect(prediction?.top3).toHaveLength(3);
    expect(prediction?.top5).toHaveLength(5);
    expect(prediction?.probabilityDistribution.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("writes once, settles once, and does not interrupt v0.1", async () => {
    await saveDraws(Array.from({ length: 120 }, (_, index) => draw(index + 1, (index * 7) % 28)));
    const first = await runPredictionCycle("2026-01-01T00:00:00Z");
    const duplicate = await runPredictionCycle("2026-01-01T00:01:00Z");
    expect(first.predictionInserted).toBe(true);
    expect(first.shadow).toMatchObject({ targetIssue: "121", inserted: true, error: false });
    expect(duplicate.shadow).toMatchObject({ targetIssue: "121", inserted: false, error: false });
    expect(await getShadowPredictionCount()).toBe(1);

    await saveDraws([draw(121, first.prediction!.recommendedSum)]);
    const next = await runPredictionCycle("2026-01-01T00:03:30Z");
    expect(next.shadow.reconciledCount).toBe(1);
    expect(next.shadow.targetIssue).toBe("122");
    expect(await getShadowPredictionCount()).toBe(2);
  });
});
