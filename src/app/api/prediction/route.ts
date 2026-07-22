import { NextResponse } from "next/server";
import type { PredictionResponse } from "@/lib/prediction/types";
import { syncPredictionCycle } from "@/lib/prediction/sync-cycle";
export const dynamic = "force-dynamic";
export async function GET() {
  try { const prediction=(await syncPredictionCycle()).prediction; const body:PredictionResponse=prediction?{success:true,data:prediction,meta:{generatedAt:new Date().toISOString()}}:{success:true,data:null,meta:{generatedAt:new Date().toISOString(),isAccumulating:true}}; return NextResponse.json(body,{headers:{"Cache-Control":"no-store"}}) }
  catch { return NextResponse.json({success:false,error:{code:"PREDICTION_UNAVAILABLE",message:"预测数据暂时不可用"}},{status:503}) }
}
