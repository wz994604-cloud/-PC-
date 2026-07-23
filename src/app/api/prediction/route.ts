import { NextResponse } from "next/server";
import { getLatestPrediction } from "@/lib/db/prediction-repository";
import type { PredictionResponse } from "@/lib/prediction/types";
import { errorDetails,logPredictionEvent } from "@/lib/observability/prediction-log";

export const dynamic="force-dynamic";

export async function GET(){
  const generatedAt=new Date().toISOString();
  try{
    const prediction=await getLatestPrediction();
    const body:PredictionResponse=prediction
      ?{success:true,data:prediction,meta:{generatedAt}}
      :{success:true,data:null,meta:{generatedAt,isAccumulating:true}};
    return NextResponse.json(body,{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    logPredictionEvent("database.error",{route:"/api/prediction",...errorDetails(error)});
    return NextResponse.json({success:false,error:{code:"PREDICTION_UNAVAILABLE",message:"预测数据暂时不可用"}},
      {status:503,headers:{"Cache-Control":"no-store"}});
  }
}
