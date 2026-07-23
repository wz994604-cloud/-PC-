import { NextResponse } from "next/server";
import { getLatestShadowPrediction } from "@/lib/db/shadow-prediction-repository";
import type { PredictionResponse } from "@/lib/prediction/types";
import { errorDetails,logPredictionEvent } from "@/lib/observability/prediction-log";
import { resolveV02ModelSelection } from "@/lib/prediction/model-selection";

export const dynamic="force-dynamic";

export async function GET(){
  const generatedAt=new Date().toISOString();
  try{
    const selection=await resolveV02ModelSelection();
    const prediction=await getLatestShadowPrediction(selection.activeModelVersion);
    const body:PredictionResponse=prediction
      ?{success:true,data:prediction,meta:{generatedAt,modelSelection:selection}}
      :{success:true,data:null,meta:{generatedAt,isAccumulating:true,modelSelection:selection}};
    return NextResponse.json(body,{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    logPredictionEvent("database.error",{route:"/api/prediction",...errorDetails(error)});
    return NextResponse.json({success:false,error:{code:"PREDICTION_UNAVAILABLE",message:"预测数据暂时不可用"}},
      {status:503,headers:{"Cache-Control":"no-store"}});
  }
}
