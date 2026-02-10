# CHANGELOG V161.252 (2026-02-10)

基底：V161.251_full_nolegacy_phase6_fix_weekly_delegation

## 新增
- Phase 3 功能整合（Phase 1 DoD 相容改造後併入）：
  - 📈 分析（analytics）模組：趨勢/統計/Top10/保養合規率（純前端彙算）。
  - ＋ Quick Create 浮動建單（FAB）：快速建立空白維修單/套用已啟用範本。
  - 🕒 維修單詳情新增 Activity Timeline：整合 history/worklog/quote/order/parts 事件時間軸。

## 變更
- core/module-loader.js
  - repairs 模組新增載入 timeline 的 CSS/JS。
  - 新增 analytics / phase3 manifest。
- core/router.js
  - 新增 analytics 路由配置。
- core/app.js
  - 登入後自動載入 phase3 並啟動 QuickCreate。
- features/repairs
  - 詳情頁新增 timeline 區塊，並在 openDetail() 延後渲染。

## Phase 1 DoD 相容修正（本版新增功能範圍內）
- 移除任何 window[serviceName] fallback。
- AnalyticsController 不再呼叫任何 svc.init()，統一透過 AppRegistry.ensureReady(...)。
- QuickCreate 不再使用 window.RepairTemplatesService fallback。

