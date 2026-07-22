# 28LIVE 项目概览

## 项目名称和用途

项目名称：**28LIVE 核心开奖与预测平台**。

本项目是一个面向加拿大 28 开奖场景的移动端优先 Web 应用。它从真实上游读取最新开奖和历史开奖，在服务端重新校验号码与和值规则，并向页面提供开奖、倒计时、历史查询、咪牌查看和 v0.1 预测结果。仓库还包含一套与线上代码隔离的离线走步回测框架，用于在未来积累足够真实历史数据后比较模型。

当前项目已经进入暂停和交接状态。本阶段不新增功能、不修改页面、不修改模型，也不部署 Preview 或 Production。

## 项目目标

- 稳定展示最新一期与历史开奖结果。
- 对上游数据做结构校验，并由本项目自行计算和值、大小和单双。
- 每 2 秒刷新可见页面数据，处理加载、空数据、异常和倒计时归零状态。
- 在不覆盖既有预测的前提下，按期号固化 v0.1 预测并在开奖后核对。
- 保持手机端尤其是 320–430px 宽度下的可用性和视觉稳定性。
- 为后续模型研究提供无未来数据泄漏的离线走步回测工具。

## 当前技术栈

- Next.js 16.2.10（App Router）
- React 19.2.4
- TypeScript 5，严格类型检查
- Tailwind CSS 4 与项目全局 CSS
- Zod 4，用于上游数据结构校验
- Node.js 内置 `node:sqlite`，用于当前开奖与预测历史存储
- Vitest 4、Testing Library、jsdom
- Playwright（移动端端到端测试配置）
- ESLint 9
- Vercel Preview/Production 部署环境

## 页面结构

主页面入口为 `src/app/page.tsx`，主要界面由以下模块组成：

1. 顶部标题与最新开奖区域。
2. 最新期开奖卡：期号选择、咪牌、倒计时、三个号码、和值、大小和单双。
3. 模型参考结果卡。
4. 和值概率分布卡。
5. 分析依据折叠区域。
6. 最近开奖记录横向列表。
7. 模型信息与预测历史入口。

页面每 2 秒轮询 `/api/source`，避免并发重复请求；标准时间由 API 使用 UTC ISO 8601 表达，页面按 `Asia/Phnom_Penh`（UTC+7）显示。

## 主要 API

### `GET /api/source`

读取真实上游开奖数据，保存合法历史记录，执行当前预测累计与开奖核对，再返回最新开奖、历史开奖、下一期开奖时间和元数据。响应禁止缓存。上游不可用或数据非法时返回统一错误结构。

### `GET /api/prediction`

访问时先同步最新真实开奖，再运行现有幂等预测周期，返回当前 v0.1 预测。没有可用历史时返回数据积累状态。该接口是移除每分钟 Cron 后的累计触发入口之一。

### `GET /api/prediction/history`

支持 `page` 和 `limit` 查询预测历史。访问时同样同步最新开奖并执行幂等累计，然后返回记录、总数及已核对样本的评估结果。

### `GET /api/internal/prediction-cycle`

内部受保护的预测周期接口。必须提供与环境变量 `CRON_SECRET` 匹配的 Bearer Token，否则返回 401。当前 `vercel.json` 没有配置 Cron；此路由只保留自动累计核心入口，不能公开密钥，也不能把它当作已经启用的外部调度。

## 数据来源和数据规则

默认数据源由 `src/lib/source/adapter.ts` 读取真实开奖页面；也可通过 `SOURCE_API_URL` 接入兼容的 JSON 上游。`.env.example` 只提供变量名称和安全示例，不包含真实凭证。

服务端不信任上游提供的和值、大小或单双：

- 三个号码均必须是 0–9 的整数。
- 和值由三个号码重新计算，范围为 0–27。
- 0–13 为“小”，14–27 为“大”。
- 偶数为“双”，奇数为“单”。
- 重复期号去重，历史按数值期号倒序返回。
- 无法可靠确认的下一期开奖时间返回 `null`，不补造时间。

当前线上/Preview 存储是 SQLite。默认本地路径为 `.data/28live.sqlite`；`vercel.json` 将托管环境路径设置为 `/tmp/28live.sqlite`。`/tmp` 是临时文件系统，实例重启或重新部署后历史可能清空，因此它不是正式持久化方案。

## 预测系统基本流程

1. 请求触发开奖数据同步。
2. 合法开奖按期号幂等写入 `draw_records`。
3. 系统先将已有预测与已经出现的开奖结果核对，只补写实际和值、命中状态和核对时间。
4. 系统读取最多 300 期真实历史，使用 v0.1 生成下一期候选预测。
5. `prediction_history.issue` 为主键；使用 `ON CONFLICT(issue) DO NOTHING`，同一期只允许首次写入。
6. 已固化预测字段不会被后续重复请求覆盖。
7. `/api/prediction`、`/api/prediction/history` 和 `/api/source` 均能触发相关累计逻辑。

当前 v0.1 是确定性模型，没有随机数。固定组合权重为：理论分布 25%、近期频率 55%、遗漏 20%。当前线上模型标识为 `v0.1 Beta`。

重要限制：目前采用“接口访问触发”代替每分钟 Cron。长时间无人访问时，累计与核对会延迟；当前代码没有正式持久化数据库，也不能据此声称每一期都能在开奖前自动固化。

## 本地运行方式

建议使用支持 `node:sqlite` 的当前 Node.js LTS/项目现有运行环境。

```bash
npm install
cp .env.example .env.local
npm run dev
```

默认开发地址为 `http://localhost:3000`。不要把真实 Token、Cookie、密码或数据库连接字符串提交到仓库。

## 构建和测试命令

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

可选命令：

```bash
npm run test:e2e
npm run research:backtest -- /absolute/path/history.sqlite expanding
```

离线回测还支持 CSV、JSON 和固定滚动窗口，详细格式见 `research/README.md`。

## Preview 和 Production 部署情况

- Preview：已存在 READY 构建，部署 ID 为 `dpl_4eemo5381gZ82qZRW4J9yk48YEZF`。Vercel Authentication 保护导致本轮在线接口验收未完成；连续 3 个开奖周期验收也未完成。
- Production：本轮及归档阶段均未部署、未覆盖。Production 仍保持此前版本；当前仓库内容不能在未完成 Preview 验收前直接发布。
- Cron：`vercel.json` 已移除每分钟 Cron，避免 Vercel Hobby 套餐限制。现在由预测接口访问触发幂等累计。
- 预测历史：当前是临时 SQLite 数据，实例重启或重新部署后可能清空。

## 主要目录说明

| 路径 | 说明 |
|---|---|
| `src/app/` | Next.js 页面、全局样式及 API 路由 |
| `src/components/` | 首页开奖、预测、分析、历史、咪牌等组件 |
| `src/lib/source/` | 上游读取、解析、校验与错误类型 |
| `src/lib/draw/` | 开奖类型、和值/大小/单双及形态规则 |
| `src/lib/db/` | SQLite 初始化、开奖仓库、预测历史仓库 |
| `src/lib/prediction/` | v0.1 模型、累计、同步和评估逻辑 |
| `src/lib/observability/` | 预测周期结构化日志 |
| `tests/` | 56 项 Vitest 测试及 Playwright E2E 用例 |
| `research/` | 与线上路由隔离的离线走步回测框架和 v0.2 candidate |
| `docs/` | 上游时间观察记录 |
| `scripts/` | E2E 启动脚本 |
| `public/` | 静态公共资源 |

## 当前事实与旧文档差异

旧的 `PROJECT_STATE.md`、`PROJECT_HANDOFF.md` 和 `CHANGELOG.md` 保留了各阶段当时的部署与验收记录，部分段落互相冲突。例如旧记录曾写“连续观察 3 期已通过”，但本次用户指定的最终归档状态是 Preview 在线验收及连续 3 期尚未完成。本次交接以 `PROJECT_STATUS.md` 和 `AI_HANDOFF.md` 的当前状态为准；恢复开发时必须重新做在线验收，不能引用旧阶段记录直接判定通过。
