export type ResearchDraw = {
  issue: string;
  openTime: string;
  numbers: [number, number, number];
  sum: number;
};

export type ModelContext = { history: readonly ResearchDraw[] };
export type ModelPrediction = {
  modelName: string;
  scores: number[];
  probabilities: number[];
  confidence: number;
  diagnostics?: Record<string, unknown>;
};
export interface ResearchModel { readonly name: string; predict(context: ModelContext): ModelPrediction }

export type WalkForwardRecord = {
  modelName: string; issue: string; trainingSize: number; distribution: number[];
  top1: number; top3: number[]; top5: number[]; expectedSum: number; actualSum: number;
  top1Hit: boolean; top3Hit: boolean; top5Hit: boolean; absoluteError: number;
  brierScore: number; logLoss: number; confidence: number; split: "train"|"validation"|"test";
  volatilityState: "low"|"medium"|"high"; sampleStage: "cold-start"|"mature";
};

export type DataQualityReport = {
  sampleSize: number; duplicateIssues: string[]; missingIssues: string[];
  timeOrderAnomalies: string[]; invalidSums: string[]; valid: boolean;
};
