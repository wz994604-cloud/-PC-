"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiSuccess, SourceResponse } from "@/lib/draw/types";
import { AnalysisAccordion } from "./AnalysisAccordion";
import { LatestDrawCard } from "./LatestDrawCard";
import { ModelMetaBar } from "./ModelMetaBar";
import { ModelReferenceCard } from "./ModelReferenceCard";
import { ProbabilityChartCard } from "./ProbabilityChartCard";
import { RecentDrawsList } from "./RecentDrawsList";
import type { Prediction, PredictionResponse } from "@/lib/prediction/types";

export function Dashboard() {
  const [response, setResponse] = useState<ApiSuccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const active = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (active.current) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort("timeout"), 12_000);
    active.current = controller;
    try {
      const res = await fetch("/api/source", { cache: "no-store", signal: controller.signal });
      const body = (await res.json()) as SourceResponse;
      if (!body.success) throw new Error(body.error.message);
      setResponse(body);
      const predictionRes = await fetch("/api/prediction", { cache: "no-store", signal: controller.signal });
      const predictionBody = (await predictionRes.json()) as PredictionResponse;
      setPrediction(predictionBody.success && predictionBody.data?.modelVersion === "v0.1 Beta" ? predictionBody.data : null);
      setError(null);
    } catch (cause) {
      if (controller.signal.reason === "timeout") setError("开奖数据请求超时");
      else if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : "数据加载失败");
    } finally {
      window.clearTimeout(timeout);
      active.current = null;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void refresh());
    const timer = window.setInterval(() => document.visibilityState === "visible" && void refresh(), 2000);
    const visible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", visible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); active.current?.abort(); };
  }, [refresh]);

  return (
    <main className="dashboard">
      {loading && !response ? <State title="正在读取数据…" /> : error && !response ? (
        <State title="数据暂时延迟，正在自动重试" detail={error} retry={refresh} />
      ) : response ? (
        <>
          {error && <div className="error-banner">数据暂时延迟，正在自动重试</div>}
          <LatestDrawCard response={response} sourceUnavailable={Boolean(error)} />
          <RecentDrawsList draws={response.data.history} />
          <ModelReferenceCard prediction={prediction} />
          <ProbabilityChartCard prediction={prediction} />
          <AnalysisAccordion prediction={prediction} />
          <ModelMetaBar prediction={prediction} />
        </>
      ) : <State title="暂无开奖数据" />}
    </main>
  );
}

function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return <div className="card state"><strong>{title}</strong>{detail && <span>{detail}</span>}{retry && <button className="retry" onClick={retry}>重新加载</button>}</div>;
}
