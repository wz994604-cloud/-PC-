# 28LIVE

专业、移动端优先的加拿大28实时开奖数据平台。项目使用 Next.js 16、React 19、TypeScript、Tailwind CSS、Zod 与 Vitest。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

质量检查：`npm run lint`、`npm run typecheck`、`npm test`、`npm run build`。

## 数据与时间原则

`GET /api/source` 通过服务端适配器读取真实上游，重新计算和值、大小与单双。测试 fixture 只存在于测试文件，Production 路径没有 fixture 或随机回退。

上游当前把时间字符串标为 UTC，但 `openTime`、`nextOpenTime` 与请求时刻存在逻辑矛盾。适配器分别保留 `rawOpenTime/rawNextOpenTime` 与标准化字段；只有可解析且下一开奖晚于最新开奖时才输出 `nextOpenTime`，否则返回 `null` 和 warning，绝不补造时间。API 标准化时间使用 UTC ISO 8601，页面按 `Asia/Phnom_Penh`（UTC+7）显示。

形态规则尚未确认，`draw-pattern` 模块目前明确返回 `null`，页面显示“—”。
