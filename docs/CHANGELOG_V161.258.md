# CHANGELOG V161.258

日期：2026-02-11（Asia/Taipei）

## 修正
- 儀表板 → 待辦事項 → 「維修逾期…」點擊：改為呼叫 `RepairUI.openDetail(id)`（static API），避免只導航到「維修管理」但不開啟維修單詳情。
- 儀表板 → 新增維修單：改為呼叫 `RepairUI.openForm(null)`（static API），提升一致性。

## 影響範圍
- `features/dashboard/dashboard.ui.js`
- `core/config.js`
