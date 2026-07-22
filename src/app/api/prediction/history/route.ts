import { NextRequest, NextResponse } from "next/server";
import { getCheckedPredictions, getPredictionHistory } from "@/lib/db/prediction-repository";
import { evaluatePredictions } from "@/lib/prediction/evaluation";
import { syncPredictionCycle } from "@/lib/prediction/sync-cycle";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest) {
 try { await syncPredictionCycle(); const page=Math.max(1,Number(request.nextUrl.searchParams.get("page"))||1),limit=Math.max(1,Math.min(100,Number(request.nextUrl.searchParams.get("limit"))||10)); const {records,total}=getPredictionHistory(limit,(page-1)*limit); const evaluation=evaluatePredictions(getCheckedPredictions()); return NextResponse.json({success:true,data:{records,total,page,limit,sampleSize:total,isAccumulating:total===0,evaluation}},{headers:{"Cache-Control":"no-store"}}) }
 catch { return NextResponse.json({success:false,error:{code:"PREDICTION_HISTORY_UNAVAILABLE",message:"预测历史暂时不可用"}},{status:503}) }
}
