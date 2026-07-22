import { calculateDraw } from "@/lib/draw/rules";
import { getDrawPattern } from "@/lib/draw/pattern";
import type { Draw, DrawPayload } from "@/lib/draw/types";
import { parseIso } from "@/lib/time";
import { SourceError } from "./errors";
import { upstreamResponseSchema, type UpstreamResponse } from "./schema";

type RawDraw = UpstreamResponse["data"]["history"][number];

function normalizeDraw(raw: RawDraw, trustOpenTime: boolean): Draw {
  const numbers: [number, number, number] = [raw.num1, raw.num2, raw.num3];
  return { issue: raw.issue, numbers, ...calculateDraw(numbers), openTime: trustOpenTime ? parseIso(raw.openTime) : null, rawOpenTime: raw.openTime ?? null, pattern: getDrawPattern(numbers) };
}

export function normalizeSource(input: unknown, now = Date.now()): { data: DrawPayload; warnings: string[] } {
  const parsed = upstreamResponseSchema.safeParse(input);
  if (!parsed.success) throw new SourceError("INVALID_SOURCE_DATA", "上游开奖数据格式异常");
  const raw = parsed.data.data;
  const parsedLatestOpenTime = parseIso(raw.openTime);
  const latestOpenMs = parsedLatestOpenTime ? Date.parse(parsedLatestOpenTime) : NaN;
  const trustOpenTime = Number.isFinite(latestOpenMs) && latestOpenMs <= now + 60_000;
  const latest = normalizeDraw(raw, trustOpenTime);
  const seen = new Set<string>();
  const history = [latest, ...raw.history.map((draw) => normalizeDraw(draw, trustOpenTime))]
    .filter((draw) => !seen.has(draw.issue) && seen.add(draw.issue))
    .sort((a, b) => Number(b.issue) - Number(a.issue));
  const warnings: string[] = [];
  const candidateNext = parseIso(raw.nextOpenTime);
  const nextMs = candidateNext ? Date.parse(candidateNext) : NaN;
  // Observed source cadence is 3m30s and results can arrive about 20s after the target.
  // Only accept a source-provided target close to request time; never derive a schedule.
  const nextOpenTime = Number.isFinite(nextMs) && nextMs >= now - 60_000 && nextMs <= now + 5 * 60_000 ? candidateNext : null;
  if (!trustOpenTime) warnings.push("上游开奖时间字段尚未通过时区验证，已保留原值但不用于页面显示");
  if (!nextOpenTime) warnings.push("上游下一期开奖时间缺失或未通过实时校验");
  return { data: { latest, history, nextOpenTime, rawNextOpenTime: raw.nextOpenTime ?? null }, warnings };
}

export function parsePc28Html(html: string): unknown {
  const nextTimestamp = html.match(/data-nextts=["'](\d+)["']/)?.[1];
  const rows = [...html.matchAll(
    /<tr>\s*<td>(\d{7})<\/td>\s*<td>(\d)\+(\d)\+(\d)=\d+<\/td>[\s\S]*?<span class=["']date-part["']>(\d{4}-\d{2}-\d{2})<\/span>\s*<span class=["']time-part["']>(\d{2}:\d{2}:\d{2})<\/span>[\s\S]*?<\/tr>/g,
  )].map((match) => ({
    issue: match[1],
    num1: Number(match[2]),
    num2: Number(match[3]),
    num3: Number(match[4]),
    openTime: `${match[5]}T${match[6]}+07:00`,
  }));
  if (!rows.length) throw new SourceError("INVALID_SOURCE_DATA", "上游开奖页面格式异常");
  const [latest, ...history] = rows;
  return {
    success: true,
    data: {
      ...latest,
      nextOpenTime: nextTimestamp ? new Date(Number(nextTimestamp) * 1000).toISOString() : null,
      history,
    },
  };
}

export async function fetchSource(signal?: AbortSignal) {
  const url = process.env.SOURCE_API_URL ?? "https://pc28.shop/";
  const timeout = AbortSignal.timeout(Number(process.env.SOURCE_TIMEOUT_MS ?? 10000));
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const response = await fetch(url, { signal: combined, cache: "no-store", headers: { accept: "application/json" } });
    if (!response.ok) throw new SourceError("SOURCE_UNAVAILABLE", "开奖数据源暂时不可用");
    const type = response.headers.get("content-type") ?? "";
    if (type.includes("application/json")) return normalizeSource(await response.json());
    if (type.includes("text/html")) return normalizeSource(parsePc28Html(await response.text()));
    throw new SourceError("INVALID_SOURCE_DATA", "上游返回了无法识别的内容");
  } catch (error) {
    if (error instanceof SourceError) throw error;
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new SourceError("SOURCE_TIMEOUT", "开奖数据源响应超时");
    }
    throw new SourceError("SOURCE_UNAVAILABLE", "开奖数据暂时不可用");
  }
}
