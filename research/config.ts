export const RESEARCH_CONFIG = {
  warmup: 100,
  split: { train: 0.6, validation: 0.2, test: 0.2 },
  rollingWindow: 300,
  matureSampleSize: 200,
  epsilon: 1e-12,
  eceBins: 10,
  omissionRatioCap: 3,
  shrinkage: { frequencyPrior: 50, omissionPrior: 80, transitionPrior: 200 },
  featureMinimums: { trend: 50, transition: 100 },
  v01: { theoretical: 0.25, recentFrequency: 0.55, omission: 0.2 },
  v02CandidateA: {
    theoretical: 0.3, frequency20: 0.12, frequency50: 0.18,
    frequency100: 0.12, normalizedOmission: 0.12, hotColdChange: 0.07,
    transition: 0.04, trendMomentumVolatility: 0.03, stateSignals: 0.02,
  },
  v02CandidateB: {
    theoretical: 0.35, frequency20: 0.08, frequency50: 0.12,
    frequency100: 0.1, frequency300: 0.06, normalizedOmission: 0.06,
    hotColdChange: 0.05, transition: 0.03,
    trendMomentumVolatility: 0.04, stateSignals: 0.02,
  },
} as const;

export type ResearchConfig = typeof RESEARCH_CONFIG;
