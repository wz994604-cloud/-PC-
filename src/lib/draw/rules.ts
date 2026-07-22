import type { BigSmall, OddEven } from "./types";

export function calculateDraw(numbers: readonly number[]): { sum: number; bigSmall: BigSmall; oddEven: OddEven } {
  if (numbers.length !== 3 || numbers.some((number) => !Number.isInteger(number) || number < 0 || number > 9)) {
    throw new RangeError("Draw numbers must be three integers between 0 and 9");
  }
  const sum = numbers.reduce((total, number) => total + number, 0);
  return { sum, bigSmall: sum <= 13 ? "小" : "大", oddEven: sum % 2 === 0 ? "双" : "单" };
}
