import { saveDraws } from "@/lib/db/draw-repository";
import { fetchSource } from "@/lib/source/adapter";
import { runPredictionCycle, type PredictionCycleResult } from "./cycle";

export async function syncPredictionCycle(): Promise<PredictionCycleResult> {
  const source = await fetchSource();
  saveDraws(source.data.history);
  return runPredictionCycle();
}
