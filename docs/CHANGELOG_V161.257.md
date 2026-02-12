# RepairTracking V161.257 更新記錄（full_nolegacy）

日期：2026-02-11（Asia/Taipei）

## 修正
- Dashboard → 待辦事項「維修逾期…」點擊後，改為等待 RepairService 該筆資料載入完成，再自動開啟維修單詳情（避免只導航到「維修管理」列表）。

## 相容性
- 維持 Phase 1 規則：不引入 window.getService / window[serviceName] fallback / top-level helper。
