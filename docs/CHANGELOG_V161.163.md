# CHANGELOG｜V161.163

日期：2026-01-09

## 功能/改善

- 機台保養（Maintenance）「更換零件」支援多筆輸入（UX 補強）：
  - 新增/編輯保養紀錄時，若尚無更換零件資料，預設先顯示 1 列空白輸入列，避免使用者誤以為只能填 1 項或無法新增。
  - 仍可透過「＋新增」持續增加多列；儲存時自動忽略空白列。

- 匯出內容補齊（CSV / Excel .xls）：
  - 保養紀錄匯出新增欄位「更換零件明細」，格式：`零件A x2 (備註)；零件B x1`。
  - 原有「更換零件數」欄位保留，便於統計/篩選。

## 變更檔案

- `features/maintenance/maintenance.ui.js`
- `core/config.js`（BUILD_NUMBER：163）

## 影響範圍

- Desktop / Mobile 同步生效。
