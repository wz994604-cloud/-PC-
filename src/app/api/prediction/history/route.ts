import { NextRequest,NextResponse } from "next/server";
import { getCheckedShadowPredictions,getShadowPredictionHistory } from "@/lib/db/shadow-prediction-repository";
import { evaluatePredictions } from "@/lib/prediction/evaluation";
import { errorDetails,logPredictionEvent } from "@/lib/observability/prediction-log";

export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
  try{
    const page=Math.max(1,Number(request.nextUrl.searchParams.get("page"))||1);
    const limit=Math.max(1,Math.min(100,Number(request.nextUrl.searchParams.get("limit"))||10));
    const [{records,total},checked]=await Promise.all([
      getShadowPredictionHistory(limit,(page-1)*limit),getCheckedShadowPredictions(),
    ]);
    return NextResponse.json({success:true,data:{records,total,page,limit,sampleSize:total,
      isAccumulating:total===0,evaluation:evaluatePredictions(checked)}},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    logPredictionEvent("database.error",{route:"/api/prediction/history",...errorDetails(error)});
    return NextResponse.json({success:false,error:{code:"PREDICTION_HISTORY_UNAVAILABLE",message:"预测历史暂时不可用"}},
      {status:503,headers:{"Cache-Control":"no-store"}});
  }
}
