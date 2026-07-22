"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Draw } from "@/lib/draw/types";
import { formatSourceDrawTime } from "@/lib/time";

const REVEAL_THRESHOLD = 0.55;

export function erasedRatio(data: Uint8ClampedArray): number {
  let erased = 0;
  for (let index = 3; index < data.length; index += 4) if (data[index] === 0) erased += 1;
  return data.length ? erased / (data.length / 4) : 0;
}

type Props = {
  issue: string;
  draw: Draw | null;
  unavailable: boolean;
  onClose: () => void;
};

export function ScratchCard({ issue, draw, unavailable, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [revealed, setRevealed] = useState(false);

  const cover = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const gradient = context.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, "#c9ced6");
    gradient.addColorStop(0.5, "#aeb5bf");
    gradient.addColorStop(1, "#d7dbe1");
    context.globalCompositeOperation = "source-over";
    context.fillStyle = gradient;
    context.fillRect(0, 0, rect.width, rect.height);
    context.fillStyle = "rgba(255,255,255,.9)";
    context.font = "600 16px -apple-system, BlinkMacSystemFont, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("滑动刮开", rect.width / 2, rect.height / 2);
    setRevealed(false);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(cover);
    return () => cancelAnimationFrame(frame);
  }, [cover, issue, draw, unavailable]);

  useEffect(() => {
    const prevent = (event: TouchEvent) => event.preventDefault();
    const canvas = canvasRef.current;
    canvas?.addEventListener("touchmove", prevent, { passive: false });
    return () => canvas?.removeEventListener("touchmove", prevent);
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const scratch = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || revealed) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const current = point(event);
    const previous = lastPoint.current ?? current;
    context.globalCompositeOperation = "destination-out";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 34;
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(current.x, current.y);
    context.stroke();
    lastPoint.current = current;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    if (erasedRatio(pixels) >= REVEAL_THRESHOLD) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      setRevealed(true);
    }
  };

  const stop = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = false;
    lastPoint.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className="scratch-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="scratch-modal" role="dialog" aria-modal="true" aria-labelledby="scratch-title">
        <header className="scratch-header">
          <h2 id="scratch-title">第 {issue} 期开奖结果</h2>
          <button type="button" className="scratch-close" aria-label="关闭咪牌" onClick={onClose}>×</button>
        </header>
        <div className="scratch-stage">
          <div className="scratch-result">
            {draw ? <>
              <span className="scratch-issue">期号 {draw.issue}</span>
              <strong className="scratch-equation">{draw.numbers.join(" + ")} = {draw.sum}</strong>
              <div><span className="scratch-pill size">{draw.bigSmall}</span><span className="scratch-pill parity">{draw.oddEven}</span><span className="scratch-pattern">{draw.pattern}</span></div>
              <time>{formatSourceDrawTime(draw.openTime, draw.rawOpenTime)}</time>
            </> : unavailable ? <strong>数据暂时不可用</strong> : Number(issue) > 0 ? <><strong>等待开奖</strong><span>当前期号 {issue}</span></> : <strong>未找到该期数据</strong>}
          </div>
          <canvas
            ref={canvasRef}
            className={revealed ? "scratch-canvas revealed" : "scratch-canvas"}
            aria-label="刮开涂层"
            onPointerDown={(event) => {
              drawing.current = true;
              lastPoint.current = point(event);
              try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Synthetic events may not own a pointer. */ }
              scratch(event);
            }}
            onPointerMove={scratch}
            onPointerUp={stop}
            onPointerCancel={stop}
          />
        </div>
        <div className="scratch-actions">
          <button type="button" onClick={cover}>重新覆盖</button>
          <button type="button" onClick={onClose}>关闭</button>
        </div>
      </section>
    </div>
  );
}
