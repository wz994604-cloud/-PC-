import { NextRequest, NextResponse } from "next/server";
import { saveDraws } from "@/lib/db/draw-repository";
import { runPredictionCycle } from "@/lib/prediction/cycle";
import { fetchSource } from "@/lib/source/adapter";
import { errorDetails, logPredictionEvent } from "@/lib/observability/prediction-log";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success:false, error:{ code:"UNAUTHORIZED", message:"Unauthorized" } }, { status:401 });
  }

  try {
    const source = await fetchSource();
    const drawsInserted = saveDraws(source.data.history);
    const cycle = runPredictionCycle();
    return NextResponse.json({
      success:true,
      data:{
        drawsInserted,
        predictionIssue:cycle.prediction?.issue??null,
        predictionInserted:cycle.predictionInserted,
        reconciledCount:cycle.reconciledCount,
      },
    }, { headers:{"Cache-Control":"no-store"} });
  } catch (error) {
    logPredictionEvent("prediction.cycle_failed", { trigger:"cron", ...errorDetails(error) });
    return NextResponse.json({success:false,error:{code:"PREDICTION_CYCLE_FAILED",message:"Prediction cycle failed"}},{status:503});
  }
}
