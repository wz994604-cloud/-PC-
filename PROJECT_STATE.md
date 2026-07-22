# PROJECT_STATE

- 当前阶段：第四阶段 — Hobby Preview 调度兼容与部署验收
- 当前版本：0.1.0
- 当前任务：移除每分钟 Cron 并完成 Preview 构建；在线验收因受保护 URL 授权上下文不一致而停止
- 已完成：SQLite 开奖存储、期号去重和历史查询；确定性 v0.1 Beta 模型；正式预测按期号唯一固化；开奖后只补实际和值和命中结果；`/api/prediction/history`；页面预测历史入口
- 数据规则：和值始终由三个号码重算；0–13 小、14–27 大；偶数双、奇数单；形态只显示现有已确认值，否则显示 `—`
- 移动端约束：页面最大宽度 840px；375px 使用 16px 安全边距，390–414px 使用 20px；图表自适应容器；最近开奖自然横向滑动；安全区使用 `env(safe-area-inset-*)`
- 测试状态：56/56 项 Vitest、lint、typecheck、production build 全部通过；其中离线研究验收 10 项
- 当前分支：`main`
- 本地 Git：根 `.git` 受环境只读限制，使用工作区 `.git-local`
- GitHub：不使用、不推送
- 固定公开网址：`https://28live-safari-acceptance-20260721.vercel.app/`
- 部署状态：Preview `dpl_4eemo5381gZ82qZRW4J9yk48YEZF` 已 READY；受 Vercel Authentication 保护且当前连接无法取得临时访问授权，接口与连续周期尚未验收；Production 未部署、未修改
- 已知限制：当前环境无 WebKit；最终 iPhone Safari 视觉验收由用户在公开 Preview 上执行
- 是否修改 Production：本轮否；历史曾覆盖固定项目 `28live-safari-acceptance-20260721`
- 下一步：取得该 Preview 的访问授权后，验证三个接口、重复请求幂等并连续观察至少 3 个开奖周期；Production 继续禁止部署。

## Hobby Preview 调度兼容（2026-07-23）

- `vercel.json` 已移除 Cron；Preview 和 Production 均不再声明每分钟计划任务。
- `/api/prediction` 与 `/api/prediction/history` 每次访问先同步真实最新开奖，再调用未修改的 `runPredictionCycle()`。
- 预测记录仍按期号唯一插入，重复访问不重复写入且不得覆盖已固化记录。
- v0.1 模型、页面、Top 3/Top 5 页面状态及 `research/backtest` 均未修改。
- 已知限制继续保留：预测历史当前为临时数据，实例重启或重新部署后可能清空。
- Preview `dpl_4eemo5381gZ82qZRW4J9yk48YEZF` 已成功构建为 READY，证明 Cron 套餐阻塞已解除；当前 Vercel 连接无法为受保护 URL 创建临时授权链接，匿名请求停在 SSO，故接口状态和连续周期未验收。

## 部署验收停止记录（2026-07-23）

- 部署前 Vitest 54/54、lint、typecheck、production build 全部通过；第四阶段第 2 步没有修改页面或线上 v0.1 路由。
- Preview `dpl_JA5veLHzvZowtTqNLVuGUkvFwNA6` 在构建阶段被 Vercel 拒绝：Hobby 账户不允许 `* * * * *` 每分钟 Cron，错误码 `cron_jobs_limits_reached`。
- 因 Preview 未进入 READY，`/api/source`、`/api/prediction`、`/api/prediction/history` 未执行本轮在线验收，连续开奖观察期数为 0。
- 按核心异常停止规则，未用临时删除 Cron、修改 SQLite 路径或其他打包补丁绕过；未部署或覆盖 Production。
- 发布说明必须明确：**预测历史当前为临时数据，不具备永久持久化能力。**

## 第四阶段第 2 步（2026-07-23）

- 新增完全独立的 `research/`：真实数据加载与质量检查、统一模型接口、四个模型、扩展/固定滚动走步、60%/20%/20% 时间划分、逐期记录及汇总指标。
- 当前仓库没有 SQLite 或真实历史 CSV/JSON，真实样本量为 0；不足 100 期，因此没有运行或输出具有统计意义的模型比较结论。
- v0.1 研究适配器直接调用当前线上纯函数，权重和算法不变；研究目录未被任何线上路由或页面导入。
- v0.2 候选所有经验分布向理论分布收缩；遗漏比上限、稀疏转移平滑、样本不足降权及特征关闭均集中配置。
- 未修改页面、视觉或当前线上接口输出；未部署、未覆盖 Production。

## 暂停状态与唯一发布阻塞项（2026-07-23）

- **唯一发布阻塞项**：Preview 使用本地 SQLite（`/tmp/28live.sqlite`）时，实例重启或重新部署后预测历史由 4 期清空为 0 期。发布前必须接入可跨实例、跨重启持久保存的存储，并重新验证历史连续累计、同一期不重复、旧预测不覆盖及开奖后自动核对。
- **已通过验证**：Preview 连续观察 3 个真实开奖周期，预测历史从 1 期增至 4 期；每期均自动固化下一期并在开奖后核对上一期，没有重复、丢失或覆盖。Top 3、Top 5 仅存在于接口统计，页面未显示。
- **暂停约束**：不修改模型，不修改页面或视觉，不部署，不覆盖 Production；保留当前代码和测试结果。
- **其他事项**：域名、数据库迁移实施和容器 Chromium 异常均暂停处理，不列为本阶段发布阻塞项。
