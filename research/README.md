# 离线走步回测框架

本目录与线上路由、页面和 v0.1 运行链路完全隔离。只允许读取数据库或真实历史文件，不包含历史数据生成器。

## 运行

```bash
npm run research:backtest -- /absolute/path/history.sqlite expanding
npm run research:backtest -- /absolute/path/history.csv rolling
```

支持 SQLite（`draw_records`）、JSON（`ResearchDraw[]`）和 CSV（表头：`issue,openTime,n1,n2,n3,sum`）。输入首先经过数据质量检查；重复期号、时间逆序或非法和值会中止回测。少于 100 期时只输出数据检查，不生成模型比较结论。

## 配置

所有参数集中于 `config.ts`：默认热身 100 期；训练/验证/锁定测试按时间 60%/20%/20%；滚动窗口默认 300；遗漏比上限 3；经验分布向理论分布收缩的先验强度和特征最小样本量也在此配置。锁定测试区间不得用于权重选择。

模型统一实现 `ResearchModel.predict({history})`，输出原始 `scores`、归一化概率和信心指标。`score` 仅是组合分数；未经校准不得称为真实命中概率。

支持 `theoretical-baseline`、`theoretical-mode-baseline`、与线上纯函数完全共用算法的 `v0.1`、以及独立的 `v0.2-candidate-a`。
