# CHANGELOG V161.321

日期：2026-03-14  
時區：Asia/Taipei

## 本版主題
全站第一波整體收斂啟動：先建立共用語法，再落地到 Maintenance / Machines。

## 現象
- 全站已有企業級方向，但不同模組的 module shell、toolbar、KPI、filter panel、empty state 仍未完全共用同一套語法。
- Maintenance / Machines 仍保留較多頁面層級 inline style 與各自定義的空狀態／首屏排版，造成視覺與維護方式不一致。

## 根因
根因不是單一模組寫錯，而是全站缺少一份真正被程式落地的共用母規格。  
先前雖然已有 `module-toolbar`、`card`、`panel` 等基礎元件，但 Maintenance / Machines 尚未被拉回同一套 page grammar。

## 修正層級
結構性修正。

## 實際修正
### 1. 共用層
- `core/ui.css`
  - 新增 `ops-module-shell`
  - 新增 `ops-toolbar-*`
  - 新增 `ops-actions`
  - 新增 `ops-kpi-*`
  - 新增 `ops-grid-2`
  - 新增 `ops-panel-*`
- `core/ui.js`
  - 新增 `UI.emptyStateHTML()`

### 2. Maintenance
- 模組 shell 改走共用 `ops` 語法
- Dashboard KPI 改走共用 KPI grammar
- Equipments / Records / Reports 首屏改走統一 panel + list/card 結構
- modal 顯示隱藏由 `style.display` 改為 `hidden` class 切換
- 空狀態改用共用 empty state helper

### 3. Machines
- 模組 shell 改走共用 `ops` 語法
- 搜尋列改走共用 actions grammar
- 「找不到序號」與「請先選擇序號」改為共用 empty state helper

### 4. 文件
- 新增 `docs/SITE_CONVERGENCE_PLAN_V161.321.md`
- 新增 `docs/VALIDATION_V161.321_SITE_CONVERGENCE.md`

## 影響範圍
- `core/config.js`
- `core/ui.css`
- `core/ui.js`
- `features/maintenance/maintenance.css`
- `features/maintenance/maintenance.ui.js`
- `features/machines/machines.css`
- `features/machines/machines.ui.js`
- `docs/README.md`
- `docs/CHANGELOG.md`
- `docs/CHANGELOG_V161.321.md`
- `docs/HANDOFF.md`
- `docs/SITE_CONVERGENCE_PLAN_V161.321.md`
- `docs/VALIDATION_V161.321_SITE_CONVERGENCE.md`

## 驗證結果
- `node --check core/ui.js`：通過
- `node --check core/config.js`：通過
- `node --check features/maintenance/maintenance.ui.js`：通過
- `node --check features/machines/machines.ui.js`：通過
- Maintenance 頁面層 inline style 數量：`141 → 60`
- Machines 頁面層 inline style 數量：`24 → 19`

## 是否為結構性修正
是。  
這版不是局部補字串，而是建立共用 page grammar 並讓第一批模組開始正式吃同一套規格。
