import { walkForward } from "../backtest/walk-forward";
import { RESEARCH_CONFIG } from "../config";
import { createV02Model, type V02ModelWeights } from "../models/v02-candidate-b";
import type { ResearchDraw, WalkForwardRecord } from "../types";

export type CalibrationScore = {
  weights: V02ModelWeights;
  validation: ReturnType<typeof metrics>;
  test: ReturnType<typeof metrics>;
  objective: number;
};

const mean = (values: number[]) =>
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;

function metrics(records: WalkForwardRecord[]) {
  const counts = new Map<number, number>();
  records.forEach((record) => counts.set(record.top1, (counts.get(record.top1) ?? 0) + 1));
  const concentration = records.length
    ? Math.max(...counts.values()) / records.length
    : 1;
  return {
    sampleSize: records.length,
    top1Rate: mean(records.map((record) => Number(record.top1Hit))),
    top3Rate: mean(records.map((record) => Number(record.top3Hit))),
    top5Rate: mean(records.map((record) => Number(record.top5Hit))),
    meanAbsoluteError: mean(records.map((record) => record.absoluteError)),
    brierScore: mean(records.map((record) => record.brierScore)),
    concentration,
  };
}

function candidateWeights(): V02ModelWeights[] {
  const theoretical = [0.12, 0.16, 0.2, 0.24, 0.28];
  const dynamicMixes = [
    [0.13, 0.18, 0.14, 0.1, 0.08, 0.08, 0.06, 0.07, 0.04],
    [0.16, 0.18, 0.12, 0.08, 0.08, 0.1, 0.06, 0.07, 0.05],
    [0.1, 0.16, 0.14, 0.12, 0.1, 0.08, 0.07, 0.08, 0.05],
  ];
  return theoretical.flatMap((prior) => dynamicMixes.map((mix) => {
    const scale = (1 - prior) / mix.reduce((total, value) => total + value, 0);
    const values = mix.map((value) => value * scale);
    return {
      theoretical: prior,
      frequency20: values[0],
      frequency50: values[1],
      frequency100: values[2],
      frequency300: values[3],
      normalizedOmission: values[4],
      hotColdChange: values[5],
      transition: values[6],
      trendMomentumVolatility: values[7],
      stateSignals: values[8],
    };
  }));
}

export function calibrateV02(draws: ResearchDraw[]): CalibrationScore[] {
  if (draws.length < RESEARCH_CONFIG.calibration.minimumHistory) {
    throw new Error(
      `v0.2 calibration requires at least ${RESEARCH_CONFIG.calibration.minimumHistory} draws`,
    );
  }
  return candidateWeights().map((weights, index) => {
    const model = createV02Model(`v0.2-calibration-${index}`, weights);
    const records = walkForward(draws, [model]);
    const validation = metrics(records.filter((record) => record.split === "validation"));
    const test = metrics(records.filter((record) => record.split === "test"));
    const excessConcentration = Math.max(
      0,
      validation.concentration - RESEARCH_CONFIG.calibration.maximumRecommendedShare,
    );
    // Selection uses validation only. The locked test result is reported, never optimized.
    const objective =
      validation.brierScore
      + validation.meanAbsoluteError / 27
      - validation.top3Rate * 0.15
      + excessConcentration * RESEARCH_CONFIG.calibration.concentrationPenalty;
    return { weights, validation, test, objective };
  }).sort((a, b) => a.objective - b.objective);
}
