import { NextResponse } from "next/server";
import { fetchSource } from "@/lib/source/adapter";
import { SourceError } from "@/lib/source/errors";
import type { ApiFailure, ApiSuccess } from "@/lib/draw/types";
import { getDrawHistory, saveDraws } from "@/lib/db/draw-repository";
import { runPredictionCycle } from "@/lib/prediction/cycle";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await fetchSource();
    saveDraws(result.data.history);
    runPredictionCycle();
    const storedHistory = getDrawHistory(300);
    result.data.history = storedHistory;
    const body: ApiSuccess = { success: true, data: result.data, meta: { source: "jnd", updatedAt: new Date().toISOString(), timezone: "Asia/Phnom_Penh", warnings: result.warnings } };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const sourceError = error instanceof SourceError ? error : new SourceError("SOURCE_UNAVAILABLE", "开奖数据暂时不可用");
    const body: ApiFailure = { success: false, error: { code: sourceError.code, message: sourceError.message }, meta: { generatedAt: new Date().toISOString() } };
    return NextResponse.json(body, { status: sourceError.code === "INVALID_SOURCE_DATA" ? 502 : 503, headers: { "Cache-Control": "no-store" } });
  }
}
