# V161.311｜Analytics / Dashboard 戰情室化第二波

## 核心目標
將首頁與分析頁從 KPI 拼貼頁，收斂成可直接支援管理決策的戰情室視角。

## 根因
- Dashboard 雖然已有 KPI、待辦與 billing board，但主流程漏斗、交期監控、工程師負載仍分散在不同卡片之外。
- Analytics 已有統計圖表，但缺少風險雷達、案件 Aging、stale repairs 與主流程 funnel，管理者必須自行拼湊數據。

## 本版修正
1. Dashboard 新增主流程漏斗、交期監控與工程師負載板。
2. Analytics Controller 新增 funnelStats、agingBuckets、staleRepairs、riskStats 聚合。
3. Analytics UI 新增 war-room hero、funnel、risk、aging 板。

## 驗證
- `node --check features/dashboard/dashboard.ui.js`
- `node --check features/analytics/analytics.controller.js`
- `node --check features/analytics/analytics.ui.js`
- `BUILD_NUMBER = 311`
