export type ProbabilityPoint = { sum: number; theoretical: number; recentFrequency: number; omission: number; probability: number };
export type ConfidenceLabel = "低" | "中等" | "较高";
export type Prediction = {
  issue: string; recommendedSum: number; comprehensiveScore: number; confidenceIndex: number;
  confidenceLabel: ConfidenceLabel; risk: "较高" | "中等" | "较低"; sampleSize: number;
  weights: { theoretical: number; recentFrequency: number; omission: number };
  distribution: ProbabilityPoint[];
  modelVersion: "v0.1 Beta" | "v0.2-candidate-b" | "v0.2-candidate-c";
};
export type PredictionResponse =
  | { success: true; data: Prediction; meta: { generatedAt: string; modelSelection?: unknown } }
  | { success: true; data: null; meta: {
    generatedAt: string; isAccumulating: true; modelSelection?: unknown;
  } }
  | { success: false; error: { code: string; message: string } };
