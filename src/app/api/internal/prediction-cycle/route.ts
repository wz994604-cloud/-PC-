import { randomUUID,timingSafeEqual } from "node:crypto";
import { NextRequest,NextResponse } from "next/server";
import { saveDrawsDetailed } from "@/lib/db/draw-repository";
import { runPredictionCycle } from "@/lib/prediction/cycle";
import { errorDetails,logPredictionEvent } from "@/lib/observability/prediction-log";
import { fetchSource } from "@/lib/source/adapter";
import { SourceError } from "@/lib/source/errors";

export const dynamic="force-dynamic";
export const maxDuration=30;

function authorized(request:NextRequest){
  const expected=process.env.CRON_SECRET;
  const supplied=request.headers.get("authorization");
  if(!expected||!supplied?.startsWith("Bearer "))return false;
  const actual=supplied.slice(7);
  const left=Buffer.from(expected),right=Buffer.from(actual);
  return left.length===right.length&&timingSafeEqual(left,right);
}

async function execute(request:NextRequest){
  const cycleId=randomUUID(),timestamp=new Date().toISOString();
  if(!authorized(request)){
    logPredictionEvent("auth.failed",{cycleId});
    return NextResponse.json({success:false,error:{code:"UNAUTHORIZED",message:"Unauthorized"},timestamp},{status:401});
  }
  logPredictionEvent("cycle.started",{cycleId});
  try{
    const source=await fetchSource();
    const sync=await saveDrawsDetailed(source.data.history);
    logPredictionEvent("draw.sync_succeeded",{cycleId,latestIssue:source.data.latest.issue,inserted:sync.inserted});
    if(sync.duplicates)logPredictionEvent("draw.duplicate_skipped",{cycleId,count:sync.duplicates});
    const cycle=await runPredictionCycle(timestamp);
    const settlement=cycle.reconciled[0]??null;
    const result={
      success:true,cycleId,latestIssue:source.data.latest.issue,
      drawSync:{inserted:sync.inserted>0,insertedCount:sync.inserted,duplicate:sync.inserted===0,duplicateCount:sync.duplicates},
      settlement:{processed:cycle.reconciled.length>0,count:cycle.reconciled.length,
        targetIssue:settlement?.issue??null,status:settlement?"settled":"skipped"},
      prediction:{created:cycle.predictionInserted,targetIssue:cycle.prediction?.issue??null,
        duplicate:Boolean(cycle.prediction&&!cycle.predictionInserted),status:cycle.prediction?"ready":"insufficient_data"},
      data:{drawsInserted:sync.inserted,predictionIssue:cycle.prediction?.issue??null,
        predictionInserted:cycle.predictionInserted,reconciledCount:cycle.reconciled.length},
      timestamp:new Date().toISOString(),
    };
    logPredictionEvent("cycle.finished",{cycleId,latestIssue:result.latestIssue,
      drawsInserted:sync.inserted,reconciledCount:cycle.reconciled.length,predictionCreated:cycle.predictionInserted});
    return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    if(error instanceof SourceError)logPredictionEvent(error.code==="SOURCE_TIMEOUT"?"source.timeout":"source.invalid_response",{cycleId,...errorDetails(error)});
    else logPredictionEvent("database.error",{cycleId,...errorDetails(error)});
    logPredictionEvent("prediction.cycle_failed",{cycleId,...errorDetails(error)});
    return NextResponse.json({success:false,cycleId,error:{code:"PREDICTION_CYCLE_FAILED",
      message:"Prediction cycle failed"},timestamp:new Date().toISOString()},{status:503});
  }
}

export async function POST(request:NextRequest){return execute(request)}
// Temporary GET compatibility for an already configured cron-job.org task. New setup should use POST.
export async function GET(request:NextRequest){return execute(request)}
