import { cleanup,fireEvent,render,screen } from "@testing-library/react";
import { afterEach,describe,expect,it,vi } from "vitest";
import { DrawHistory } from "@/components/DrawHistory";
import { Dashboard } from "@/components/Dashboard";
import { LatestDrawCard } from "@/components/LatestDrawCard";
import type { ApiSuccess } from "@/lib/draw/types";
const historical = {issue:"3459844",numbers:[1,1,2] as [number,number,number],sum:4,bigSmall:"小" as const,oddEven:"双" as const,openTime:"2026-07-21T08:00:00Z",rawOpenTime:null,pattern:"对子" as const};
const response: ApiSuccess = {success:true,data:{latest:{issue:"3459845",numbers:[1,2,3],sum:6,bigSmall:"小",oddEven:"双",openTime:null,rawOpenTime:"raw",pattern:"顺子"},history:[historical],nextOpenTime:null,rawNextOpenTime:"raw"},meta:{source:"jnd",updatedAt:"2026-07-21T00:00:00Z",timezone:"Asia/Phnom_Penh",warnings:["time"]}};

afterEach(()=>{cleanup();vi.restoreAllMocks()});

describe("components",()=>{
  it("renders empty history",()=>{render(<DrawHistory draws={[]}/>);expect(screen.getByText("暂无历史数据")).toBeInTheDocument()});
  it("shows drawing when countdown is unavailable",()=>{render(<LatestDrawCard response={response}/>);expect(screen.getByText("开奖中")).toBeInTheDocument()});
  it("removes every scratch-card entry point",()=>{
    const view=render(<LatestDrawCard response={response}/>);
    expect(view.queryByText("咪牌")).not.toBeInTheDocument();
    expect(view.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button",{name:/查找期数/})).toHaveAttribute("aria-expanded","false");
  });
  it("renders the static model sections with live draw data",async()=>{
    vi.stubGlobal("fetch",vi.fn(async()=>({json:async()=>response})));
    render(<Dashboard/>);
    expect(await screen.findByRole("heading",{name:"模型参考结果"})).toBeInTheDocument();
    expect(screen.getByRole("img",{name:"和值0到27概率分布"})).toBeInTheDocument();
    const analysis=screen.getByRole("button",{name:/分析依据/});
    expect(analysis).toHaveAttribute("aria-expanded","false");
    fireEvent.click(analysis);
    expect(screen.getAllByText("数据积累中").length).toBeGreaterThanOrEqual(2);
  });
  it("keeps issue finder and recent records expansion independent",async()=>{
    vi.stubGlobal("fetch",vi.fn(async()=>({json:async()=>response})));
    render(<Dashboard/>);
    const finder=await screen.findByRole("button",{name:/查找期数/});
    const recent=screen.getByRole("button",{name:"展开"});
    fireEvent.click(finder);
    expect(finder).toHaveAttribute("aria-expanded","true");
    expect(recent).toHaveAttribute("aria-expanded","false");
    fireEvent.click(recent);
    expect(finder).toHaveAttribute("aria-expanded","true");
    expect(recent).toHaveAttribute("aria-expanded","true");
  });
});
