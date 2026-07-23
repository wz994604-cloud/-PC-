import { NextResponse } from "next/server";
import { getLatestShadowPrediction } from "@/lib/db/shadow-prediction-repository";
import { errorDetails, logPredictionEvent } from "@/lib/observability/prediction-log";
import { resolveV02ModelSelection } from "@/lib/prediction/model-selection";

export const dynamic = "force-dynamic";

export async function GET() {
  const generatedAt = new Date().toISOString();
  try {
    const selection = await resolveV02ModelSelection();
    const prediction = await getLatestShadowPrediction(selection.activeModelVersion);
    return NextResponse.json(prediction
      ? { success: true, data: prediction, meta: { generatedAt, mode: "active", modelSelection: selection } }
      : { success: true, data: null, meta: {
        generatedAt, mode: "active", isAccumulating: true, modelSelection: selection,
      } },
    { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logPredictionEvent("database.error", { route: "/api/prediction/v02", ...errorDetails(error) });
    return NextResponse.json({ success: false,
      error: { code: "V02_PREDICTION_UNAVAILABLE", message: "v0.2 prediction is temporarily unavailable" } },
    { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
