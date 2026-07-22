import type { DrawPattern } from "./types";

export function getDrawPattern(numbers: readonly number[]): DrawPattern {
  const unique = new Set(numbers).size;
  if (unique === 1) return "豹子";
  if (unique === 2) return "对子";
  const sorted = [...numbers].sort((a, b) => a - b);
  if (sorted[1] - sorted[0] === 1 && sorted[2] - sorted[1] === 1) return "顺子";
  return "杂六";
}
