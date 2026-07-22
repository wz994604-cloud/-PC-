export type ProbabilityPoint = { sum: number; theoretical: number; recentFrequency: number; omission: number; probability: number };
export type ConfidenceLabel = "低" | "中等" | "较高";
export type Prediction = {
  issue: string; recommendedSum: number; comprehensiveScore: number; confidenceIndex: number;
  confidenceLabel: ConfidenceLabel; risk: "较高" | "中等" | "较低"; sampleSize: number;
  weights: { theoretical: 0.25; recentFrequency: 0.55; omission: 0.2 };
  distribution: ProbabilityPoint[]; modelVersion: "v0.1 Beta";
};
export type PredictionResponse =
  | { success: true; data: Prediction; meta: { generatedAt: string } }
  | { success: true; data: null; meta: { generatedAt: string; isAccumulating: true } }
  | { success: false; error: { code: string; message: string } };
