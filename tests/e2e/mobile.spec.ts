import { expect, test } from "@playwright/test";

const widths = [320, 375, 390, 414, 430];
const payload = {
  success: true,
  data: {
    latest: { issue: "3459845", numbers: [1, 2, 3], sum: 6, bigSmall: "小", oddEven: "双", openTime: null, rawOpenTime: "2026-07-21T14:32:00.000Z", pattern: "顺子" },
    history: [
      { issue: "3459845", numbers: [1, 2, 3], sum: 6, bigSmall: "小", oddEven: "双", openTime: null, rawOpenTime: "2026-07-21T14:32:00.000Z", pattern: "顺子" },
      { issue: "3459844", numbers: [6, 8, 5], sum: 19, bigSmall: "大", oddEven: "单", openTime: null, rawOpenTime: "2026-07-21T14:28:30.000Z", pattern: "杂六" },
      { issue: "3459843", numbers: [4, 4, 7], sum: 15, bigSmall: "大", oddEven: "单", openTime: null, rawOpenTime: "2026-07-21T14:25:00.000Z", pattern: "对子" },
      { issue: "3459842", numbers: [2, 5, 5], sum: 12, bigSmall: "小", oddEven: "双", openTime: null, rawOpenTime: "2026-07-21T14:21:30.000Z", pattern: "对子" },
      { issue: "3459841", numbers: [9, 7, 3], sum: 19, bigSmall: "大", oddEven: "单", openTime: null, rawOpenTime: "2026-07-21T14:18:00.000Z", pattern: "杂六" },
      ...Array.from({length:15},(_,index)=>({issue:String(3459840-index),numbers:[index%10,(index+3)%10,(index+6)%10] as [number,number,number],sum:(index%10)+((index+3)%10)+((index+6)%10),bigSmall:(index%2?"大":"小") as "大"|"小",oddEven:(index%2?"单":"双") as "单"|"双",openTime:null,rawOpenTime:"2026-07-21T14:15:00.000Z",pattern:"杂六" as const})),
    ],
    nextOpenTime: null,
    rawNextOpenTime: "2026-07-21T13:35:30.000Z",
  },
  meta: { source: "jnd", updatedAt: "2026-07-21T13:32:26.000Z", timezone: "Asia/Phnom_Penh", warnings: ["time"] },
};

for (const width of widths) {
  test(`mobile layout ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route("**/api/source", (route) => route.fulfill({ json: payload }));
    await page.goto("/");
    await expect(page.getByRole("button", { name: /查找期数/ })).toBeVisible();
    await expect(page.getByText("开奖中")).toBeVisible();
    await expect(page.getByLabel("1加2加3等于6")).toBeVisible();
    await expect(page.getByRole("heading", { name: "模型参考结果" })).toBeVisible();
    await expect(page.getByRole("img", { name: "和值0到27概率分布静态示意图" })).toBeVisible();
    if (width === 390) await page.screenshot({ path: "test-results/round5-collapsed-390.png", fullPage: true });
    const layout = await page.evaluate(() => {
      const latest = document.querySelector(".latest-card")?.getBoundingClientRect();
      const recent = document.querySelector(".recent-scroller") as HTMLElement | null;
      return {
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
        latestFits: !!latest && latest.left >= 0 && latest.right <= window.innerWidth,
        recentScrolls: !!recent && recent.scrollWidth >= recent.clientWidth,
      };
    });
    expect(layout).toEqual({ pageOverflow: false, latestFits: true, recentScrolls: true });
  });
}

test("loading and error states", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/source", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({ status: 503, json: { success: false, error: { code: "SOURCE_UNAVAILABLE", message: "开奖数据暂时不可用" }, meta: { generatedAt: new Date().toISOString() } } });
  });
  await page.goto("/");
  await expect(page.getByText("正在读取数据…")).toBeVisible();
  await expect(page.getByText("数据暂时延迟，正在自动重试")).toBeVisible();
  await expect(page.getByRole("button", { name: "重新加载" })).toBeVisible();
});

test("issue finder and recent records expand independently", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/source", (route) => route.fulfill({ json: payload }));
  await page.goto("/");
  const finder=page.getByRole("button",{name:/查找期数/});
  const recent=page.getByRole("button",{name:"展开"});
  await expect(page.locator(".draw-tile")).toHaveCount(5);
  await finder.click();
  await expect(recent).toHaveAttribute("aria-expanded","false");
  await recent.click();
  await expect(finder).toHaveAttribute("aria-expanded","true");
  await expect(page.locator(".draw-tile")).toHaveCount(20);
  await page.screenshot({path:"test-results/round5-expanded-390.png",fullPage:true});
});

test("scratch card entry is removed and analysis still opens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/source", (route) => route.fulfill({ json: payload }));
  await page.goto("/");
  await expect(page.getByText("咪牌")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: /分析依据/ }).click();
  await expect(page.getByText(/静态占位数据/)).toBeVisible();
});
