"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="state"><strong>页面暂时无法显示</strong><button className="retry" onClick={reset}>重新加载</button></div>}
