import { NextResponse } from "next/server";
import { fetchSource } from "@/lib/source/adapter";
import { SourceError } from "@/lib/source/errors";
import type { ApiFailure, ApiSuccess } from "@/lib/draw/types";
import { getDrawHistory } from "@/lib/db/draw-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [result,stored] = await Promise.all([fetchSource(),getDrawHistory(100)]);
    const history = stored.length ? stored : result.data.history;
    const body: ApiSuccess = { success: true, data: { ...result.data, latest: history[0], history },
      meta: { source: stored.length ? "neon+jnd-schedule" : "jnd-fallback", updatedAt: new Date().toISOString(),
        timezone: "Asia/Phnom_Penh", warnings: result.warnings } };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const sourceError = error instanceof SourceError ? error : new SourceError("SOURCE_UNAVAILABLE", "开奖数据暂时不可用");
    const body: ApiFailure = { success: false, error: { code: sourceError.code, message: sourceError.message }, meta: { generatedAt: new Date().toISOString() } };
    return NextResponse.json(body, { status: sourceError.code === "INVALID_SOURCE_DATA" ? 502 : 503, headers: { "Cache-Control": "no-store" } });
  }
}
