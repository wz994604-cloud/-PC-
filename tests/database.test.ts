// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabaseForTests } from "@/lib/db/sqlite";
import { getDrawHistory, saveDraws } from "@/lib/db/draw-repository";
import type { Draw } from "@/lib/draw/types";

const draw = (issue: string, numbers: [number, number, number]): Draw => ({
  issue, numbers, sum: numbers[0] + numbers[1] + numbers[2],
  bigSmall: numbers[0] + numbers[1] + numbers[2] >= 14 ? "大" : "小",
  oddEven: (numbers[0] + numbers[1] + numbers[2]) % 2 ? "单" : "双",
  pattern: "杂六", openTime: null, rawOpenTime: null,
});

beforeEach(() => { process.env.DATABASE_PATH = ":memory:"; closeDatabaseForTests(); });
afterEach(() => { closeDatabaseForTests(); delete process.env.DATABASE_PATH; });

describe("draw repository", () => {
  it("stores draws once and queries newest first", () => {
    expect(saveDraws([draw("2", [4, 5, 6]), draw("1", [1, 2, 3])])).toBe(2);
    expect(saveDraws([draw("2", [4, 5, 6])])).toBe(0);
    expect(getDrawHistory().map(({ issue }) => issue)).toEqual(["2", "1"]);
  });

  it("respects history limits", () => {
    saveDraws([draw("2", [4, 5, 6]), draw("1", [1, 2, 3])]);
    expect(getDrawHistory(1)).toHaveLength(1);
  });
});
