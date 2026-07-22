export type BigSmall = "大" | "小";
export type OddEven = "单" | "双";
export type DrawPattern = "对子" | "豹子" | "顺子" | "杂六";

export interface Draw {
  issue: string;
  numbers: [number, number, number];
  sum: number;
  bigSmall: BigSmall;
  oddEven: OddEven;
  openTime: string | null;
  rawOpenTime: string | null;
  pattern: DrawPattern;
}

export interface DrawPayload {
  latest: Draw;
  history: Draw[];
  nextOpenTime: string | null;
  rawNextOpenTime: string | null;
}

export type ApiSuccess = {
  success: true;
  data: DrawPayload;
  meta: { source: string; updatedAt: string; timezone: "Asia/Phnom_Penh"; warnings: string[] };
};

export type ApiFailure = {
  success: false;
  error: { code: string; message: string };
  meta: { generatedAt: string };
};

export type SourceResponse = ApiSuccess | ApiFailure;
