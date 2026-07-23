import { RESEARCH_CONFIG } from "../config";
import type { ResearchDraw, ResearchModel } from "../types";
import { normalize, shrink, theoreticalDistribution } from "./math";

const frequency = (history: readonly ResearchDraw[], window: number) => {
  const rows = history.slice(-window);
  const counts = Array(28).fill(0);
  rows.forEach((draw) => counts[draw.sum]++);
  return shrink(
    normalize(counts),
    theoreticalDistribution,
    rows.length,
    RESEARCH_CONFIG.shrinkage.frequencyPrior,
  );
};

const omission = (history: readonly ResearchDraw[]) => {
  const current = Array(28).fill(history.length + 1);
  const previousGaps = Array.from({ length: 28 }, () => [] as number[]);
  const lastSeen = Array(28).fill(-1);
  history.forEach((draw, index) => {
    if (lastSeen[draw.sum] >= 0) previousGaps[draw.sum].push(index - lastSeen[draw.sum]);
    lastSeen[draw.sum] = index;
  });
  const ratios = current.map((_, sum) => {
    if (lastSeen[sum] < 0) return 1;
    const gap = history.length - 1 - lastSeen[sum];
    const historical = previousGaps[sum];
    const meanGap = historical.length
      ? historical.reduce((total, value) => total + value, 0) / historical.length
      : Math.max(1, history.length);
    return Math.min(2, gap / meanGap);
  });
  return {
    ratios,
    distribution: shrink(
      normalize(ratios),
      theoreticalDistribution,
      history.length,
      RESEARCH_CONFIG.shrinkage.omissionPrior,
    ),
  };
};

const transition = (history: readonly ResearchDraw[]) => {
  if (history.length < RESEARCH_CONFIG.featureMinimums.transition) return theoreticalDistribution;
  const counts = Array.from({ length: 28 }, () => Array(28).fill(0));
  for (let index = 1; index < history.length; index++) {
    counts[history[index - 1].sum][history[index].sum]++;
  }
  const row = counts[history.at(-1)!.sum];
  return shrink(
    normalize(row),
    theoreticalDistribution,
    row.reduce((total, value) => total + value, 0),
    RESEARCH_CONFIG.shrinkage.transitionPrior,
  );
};

const trendShape = (history: readonly ResearchDraw[]) => {
  const recent = history.slice(-20);
  const previous = history.slice(-40, -20);
  const mean = (rows: readonly ResearchDraw[]) =>
    rows.reduce((total, draw) => total + draw.sum, 0) / Math.max(1, rows.length);
  const recentMean = mean(recent);
  const momentum = previous.length ? recentMean - mean(previous) : 0;
  const variance = recent.reduce(
    (total, draw) => total + (draw.sum - recentMean) ** 2,
    0,
  ) / Math.max(1, recent.length);
  const sigma = Math.max(2.5, Math.sqrt(variance));
  const center = Math.max(0, Math.min(27, recentMean + Math.max(-1.5, Math.min(1.5, momentum))));
  return normalize(
    theoreticalDistribution.map(
      (prior, sum) => prior * Math.exp(-((sum - center) ** 2) / (2 * sigma ** 2)),
    ),
  );
};

const stateShape = (history: readonly ResearchDraw[]) => {
  const recent = history.slice(-50);
  const last = recent.at(-1);
  const bigRate = recent.filter((draw) => draw.sum >= 14).length / Math.max(1, recent.length);
  const oddRate = recent.filter((draw) => draw.sum % 2 === 1).length / Math.max(1, recent.length);
  let reversals = 0;
  for (let index = 1; index < recent.length; index++) {
    if ((recent[index].sum >= 14) !== (recent[index - 1].sum >= 14)) reversals++;
  }
  const favorReverse = reversals / Math.max(1, recent.length - 1) > 0.55;
  return normalize(theoreticalDistribution.map((prior, sum) => {
    const sizeFit = last && favorReverse
      ? Number((sum >= 14) !== (last.sum >= 14))
      : Number((sum >= 14) === (bigRate >= 0.5));
    const parityFit = Number((sum % 2 === 1) === (oddRate >= 0.5));
    return prior * (1 + 0.05 * sizeFit + 0.025 * parityFit);
  }));
};

export const v02CandidateB: ResearchModel = {
  name: "v0.2-candidate-b",
  predict: ({ history }) => {
    const weights = RESEARCH_CONFIG.v02CandidateB;
    const f20 = frequency(history, 20);
    const f50 = frequency(history, 50);
    const f100 = frequency(history, 100);
    const f300 = frequency(history, 300);
    const omitted = omission(history);
    const hotCold = normalize(
      f20.map((value, sum) => Math.max(0, theoreticalDistribution[sum] + value - f100[sum])),
    );
    const reliableTrend = history.length >= RESEARCH_CONFIG.featureMinimums.trend;
    const transitionWeight = history.length >= RESEARCH_CONFIG.featureMinimums.transition
      ? weights.transition
      : 0;
    const components = [
      weights.theoretical, weights.frequency20, weights.frequency50,
      weights.frequency100, weights.frequency300, weights.normalizedOmission,
      weights.hotColdChange, transitionWeight,
      reliableTrend ? weights.trendMomentumVolatility : 0,
      reliableTrend ? weights.stateSignals : 0,
    ];
    const effectiveTheoreticalWeight =
      weights.theoretical + (1 - components.reduce((total, value) => total + value, 0));
    const transitionDistribution = transition(history);
    const trend = reliableTrend ? trendShape(history) : theoreticalDistribution;
    const state = reliableTrend ? stateShape(history) : theoreticalDistribution;
    const scores = theoreticalDistribution.map((prior, sum) =>
      prior * effectiveTheoreticalWeight
      + f20[sum] * weights.frequency20
      + f50[sum] * weights.frequency50
      + f100[sum] * weights.frequency100
      + f300[sum] * weights.frequency300
      + omitted.distribution[sum] * weights.normalizedOmission
      + hotCold[sum] * weights.hotColdChange
      + transitionDistribution[sum] * transitionWeight
      + trend[sum] * (reliableTrend ? weights.trendMomentumVolatility : 0)
      + state[sum] * (reliableTrend ? weights.stateSignals : 0));
    const probabilities = normalize(scores);
    const ranked = [...probabilities].sort((a, b) => b - a);
    return {
      modelName: "v0.2-candidate-b",
      scores,
      probabilities,
      confidence: ranked[0],
      diagnostics: {
        omissionRatios: omitted.ratios,
        transitionEnabled: transitionWeight > 0,
        trendEnabled: reliableTrend,
        effectiveTheoreticalWeight,
        topMargin: ranked[0] - ranked[1],
      },
    };
  },
};
