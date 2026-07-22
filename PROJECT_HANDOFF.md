# PROJECT_HANDOFF

## 2026-07-23 Hobby Preview 调度兼容

- Vercel Cron 已从配置移除，不再使用 Hobby 不允许的每分钟频率。
- `/api/prediction` 和 `/api/prediction/history` 现在以接口访问作为补偿触发：同步最新开奖后运行原有幂等累计。
- 期号唯一约束与 `ON CONFLICT DO NOTHING` 未变；v0.1 模型、页面及 research/backtest 未变。
- 本地验证：Vitest 56/56、lint、typecheck、build 全部通过。
- Preview `dpl_4eemo5381gZ82qZRW4J9yk48YEZF` 已 READY，但当前连接无法取得受保护 URL 的临时授权，三个接口、页面、幂等及连续 3 个开奖周期仍未验收；不得部署 Production。
- 预测历史仍为临时 SQLite 数据，实例重启或重新部署后可能清空。

## 2026-07-23 部署验收停止

- 部署前 54/54 Vitest、lint、typecheck、production build 全部通过，研究代码未被线上页面或 API 路由导入。
- Preview `dpl_JA5veLHzvZowtTqNLVuGUkvFwNA6` 构建失败，Vercel 错误为 `cron_jobs_limits_reached`：Hobby 账户只允许每日 Cron，当前 `* * * * *` 每分钟计划不能部署。
- Preview 未 READY，因此三个核心接口、页面一致性、v0.1 部署前后一致性和连续 3 期观察均未验收；观察期数为 0。
- 已按停止条件终止流程，没有删除 Cron、替换临时数据库路径或部署 Production。
- 恢复发布前先解决 Cron 部署能力，再重新创建 Preview 并完整验收。发布说明固定标记：**预测历史当前为临时数据，不具备永久持久化能力。**

## 2026-07-23 第四阶段第 2 步：离线走步回测

- `research/` 是独立研究层，不被 `src/app` 导入。支持从现有 SQLite `draw_records`、真实 JSON 或 CSV 加载数据，先报告重复期号、缺失期号、时间逆序、非法和值和样本量。
- 统一模型：`theoretical-baseline`、`theoretical-mode-baseline`、直接复用线上算法的 `v0.1`、`v0.2-candidate-a`。所有参数集中在 `research/config.ts`。
- 默认热身 100 期；支持扩展窗口和固定滚动窗口。第 t 期只向模型传入 t-1 及以前数据；按时间标记前 60% 训练、中 20% 验证、后 20% 锁定测试。
- 输出逐期完整分布、Top1/3/5、期望和值、实际和值、命中、MAE、Brier、Log Loss 和信心；汇总 ECE、熵及和值区间、大小、单双、波动、冷启动/成熟分组。
- 当前真实历史样本量为 0，未生成、补造或模拟历史数据，未输出模型优劣。运行方式和指标定义见 `research/README.md`、`research/METRICS.md`。
- 本步不修改线上 v0.1 接口、页面或 Production，也未部署。原唯一发布阻塞项仍是 Serverless 实例重启后本地 SQLite 预测历史清空。

## 2026-07-23 暂停开发与唯一发布阻塞项

- 当前暂停模型、页面和发布相关工作；不修改视觉，不部署，不覆盖 Production，保留现有代码与测试结果。
- Preview 已连续验证 3 个真实开奖周期：预测历史从 1 期增至 4 期，每期均自动固化下一期，开奖后自动核对上一期；未出现重复、丢失或旧预测被覆盖。Top 3、Top 5 仅在接口统计中存在，页面未显示。
- **唯一发布阻塞项**：本地 SQLite 位于 Serverless 临时磁盘时，实例重启或重新部署后预测历史从 4 期清空为 0 期。正式发布前必须改为跨实例持久存储，并重新完成自动累计、幂等保存、旧预测不可变与开奖核对验证。
- 域名、数据库迁移实施和 Chromium 容器异常暂不处理，也不作为当前阶段的额外发布阻塞项。
- 下一步：停止并等待指令。

## 2026-07-22 Production 保持不变与发布风险

- 暂时搁置发布验收容器的 Chromium 启动异常，不修改、不覆盖当前 Production，也不触发部署。
- 已知根因是 Playwright 使用的 `/tmp/chromium` 为 0 字节损坏缓存，浏览器进程立即退出，8 项 E2E 未进入业务断言；Next.js production build、TypeScript、lint 和 36 项 Vitest 均已通过。当前证据不能把该问题描述为线上页面或 Production 运行容器故障。
- 当前 Production 部署为 `dpl_GACB3aVpy1LctXuShL7MqiTXT3Vr`，Vercel 状态 `READY`。2026-07-22 只读实测：首页、`/api/source`、`/api/prediction`、`/api/prediction/history?limit=10&page=1` 均返回 HTTP 200。
- 固定公开网址 `https://28live-safari-acceptance-20260721.vercel.app/` 仍指向旧版本：首页和 `/api/source` 可访问，但两个预测接口返回 404。不要以该别名判断当前 Production 最新功能。
- **强制发布门槛**：正式发布任何新版本前，必须重新排查并解决 Chromium/Playwright 启动异常，运行并通过全部 E2E；同时校正公开别名指向并复核首页及主要接口。未完成这些检查不得发布或覆盖 Production。

## 2026-07-22 缺失功能基于 04d260a 重建

- 使用 Node SQLite 建立本地数据层，`draw_records.issue` 唯一，`/api/source` 同步真实开奖记录并从数据库提供倒序历史。
- v0.1 Beta 只使用已保存真实历史，固定权重为理论分布 25%、近期频率 55%、遗漏 20%，输出推荐和值、综合评分、信心指数、风险及完整 0–27 分布；无随机数。
- `prediction_history.issue` 唯一。预测首次请求时按下一期固化，重复请求读取旧快照；开奖同步后只填写 `actual_sum`、`hit`、`checked_at`，不覆盖预测字段。
- 未补造历史预测。空库的预测和预测历史均显示“数据积累中”。
- 新增 `/api/prediction` 与 `/api/prediction/history`，预测历史入口位于原底部模型信息栏，不改变既有模块顺序。
- 本轮不部署、不修改 Production；SQLite 适合本地开发，托管环境长期持久化仍需后续切换远程 PostgreSQL。

## 2026-07-22 第二阶段首页静态界面第一版

- 首页按参考图重组为顶部开奖卡、模型参考结果、和值概率分布、分析依据、最近开奖记录、底部模型信息栏六个连续区块。
- 移除首页 28LIVE Logo、独立右上角历史入口、结果/预测标签页、纵向历史表格和查看更多；顶部开奖卡左侧保留“历史开奖”。
- 开奖接口与数据库未改动，现有轮询、倒计时、期号选择、咪牌及异常重试继续工作。
- 模型评分、信号强度、不确定性、概率曲线、分析内容、样本量、版本及回测窗口均为前端静态占位，不包含真实预测逻辑。
- 图表使用响应式 SVG；分析依据默认收起；最近开奖使用横向滚动卡片；页面兼容移动端安全区。
- 29 项 Vitest、lint、typecheck、production build 全部通过；7 项 Chromium E2E 覆盖 320/375/390/414/430px、加载/错误与咪牌流程并全部通过。
- 390px 实际运行截图保存为 `homepage-mobile-390.png`。容器缺少中文字库，自动化截图中的中文显示为方框；真实设备会按系统中文字体正常渲染。
- 本步骤未修改数据库、API，未部署；完成后等待验收。

## 2026-07-21 Preview 视觉修正

- 期号下拉框在 320–430px 均完整显示 7 位期号。
- 历史形态按豹子/对子/顺子/杂六规则计算；历史时间使用连续两轮实时观察确认的上游固定 +1 小时偏差校正，再按 UTC+7 显示。
- 手机端整体比例、卡片留白、号码算式间距、标签、按钮、表格列宽与行高已收紧。
- 页面增加 iPhone 底部安全区并隐藏 Next.js 开发悬浮入口。
- Production 未修改。
- 本轮部署 `dpl_DTPKx4GjDLroXfDzwaPPL8iYwbso` 已 READY；固定公开网址当前仍返回旧构建，自定义 Preview 别名尚未切换，不能声称本轮已覆盖上线。

## 2026-07-21 咪牌与开奖状态

- 期号选择包含下一期待开奖项和最近真实历史期；顶部开奖结果始终绑定最新一期，历史首行由同一标准化数据生成。
- 咪牌按所选期号显示真实结果，包含号码算式、大小、单双、形态和开奖时间；覆盖等待开奖、未找到数据及接口不可用状态。
- Canvas 使用设备像素比适配 Retina，支持 Pointer Events 触摸/鼠标擦除，擦除约 55% 自动揭开，并支持重新覆盖和关闭清理。
- 倒计时归零或有效目标缺失时显示“开奖中”，新一期轮询到达后恢复新倒计时。
- 形态规则统一为豹子、对子、无序连续顺子和杂六；历史数据继续由适配器去重并按期号倒序。

## 项目与当前视觉

28LIVE 使用 Next.js 16 App Router、React 19、TypeScript strict、Tailwind CSS、Zod、Vitest。移动端视觉以 2026-07-21 用户提供的 iPhone 截图为最高标准，其次是 `https://pc28-data-preview.vercel.app/`。

页面现为白色居中标题区、浅灰背景、最新开奖卡片和历史记录卡片。最新卡片包含加拿大28标识、最新期号、期号选择、咪牌按钮、单行倒计时、三个号码算式、和值、大小和单双。历史区域保留结果/预测按钮和五列表格：期号、号码、和值（含单双）、形态、时间。

## 数据与规则

`GET /api/source` 保持现有统一结构和真实上游。前端每 2 秒轮询并防止并发请求。和值由三个 0–9 整数重算；0–13 小、14–27 大；偶数双、奇数单。原始时间与标准化时间分开，页面时区为 Asia/Phnom_Penh（UTC+7）。`nextOpenTime` 只有通过时间窗口验证才用于倒计时，否则显示“时间同步中”。形态算法未确认时显示 `—`，不得猜测。

## 验证与部署规则

Vitest 共 15 项。Playwright Chromium 覆盖 320、375、390、414、430px，并检查 Header、倒计时、号码、五列表格、页面横向溢出、加载、错误及重试状态。当前环境缺少 WebKit，iPhone Safari 最终验收需在公开 Preview 完成。

只允许创建 Preview，不执行 Production 发布、不绑定正式域名、不修改旧 Production。每次任务完成更新三份项目文档并使用 `.git-local` 创建本地提交。

本次视觉版本部署 ID 为 `dpl_BwCbcTteJQsGhNf3HzZNSx4d65mY`，状态 READY，远端构建日志确认 `/` 与 `/api/source` 成功生成。唯一部署 URL 仍受 Vercel Authentication 保护，匿名请求返回 302。原公开地址 `28live-safari-acceptance-20260721.vercel.app` 仍指向旧视觉，不能用于验收本次版本。
