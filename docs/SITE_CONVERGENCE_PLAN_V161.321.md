# RepairTracking 全站整體收斂規劃 v1（V161.321）

日期：2026-03-14  
時區：Asia/Taipei

## 1. 目標

本輪不新增大型新功能，先把全站收斂成同一組 team 可共同維護的企業級產品結構。

核心原則：
- 不用補丁式處理
- 先定母規格，再實作
- 規劃、架構、UI/UX、排版、QA、文件共用同一份標準
- 手機與桌機同時成立

## 2. 現況判斷

目前專案骨架正確，但一致性不足：
- `core / features / firebase` 分層正確
- 主流程 `Repair → Quote → Order → Billing → Analytics` 已成形
- Weekly 已完成第一輪內容收斂
- 但 Maintenance / Machines / Repairs / Settings 仍有共用語言未完全落地問題

## 3. 收斂分期

### Phase A：共用層定稿
先固定全站共用語言：
- 模組 shell
- toolbar grammar
- KPI board grammar
- filter panel grammar
- empty state grammar
- list card grammar
- mobile safe area / modal shell

### Phase B：中高差異模組收斂
依風險與影響面排序：
1. Repairs
2. Settings
3. Maintenance + Machines
4. Customers / Parts 補齊一致性

### Phase C：治理補強
- UI 檔拆層
- init / loadAll 契約收乾淨
- QA smoke tests 擴充
- docs 瘦身與活文件治理

## 4. 本次實作範圍（V161.321）

本版先落第一個可見成果：
- 建立全站共用 `ops` 收斂語法（`core/ui.css`）
- 新增共用 `UI.emptyStateHTML()`
- 以 Maintenance / Machines 為第一批導入模組
- 同步把規劃寫回 `docs/`，不只留在對話

## 5. V161.321 已落地內容

### 5.1 共用層
- `core/ui.css`
  - 新增 `ops-module-shell`
  - 新增 `ops-toolbar-*`
  - 新增 `ops-actions`
  - 新增 `ops-kpi-*`
  - 新增 `ops-grid-2`
  - 新增 `ops-panel-*`
- `core/ui.js`
  - 新增 `UI.emptyStateHTML()`

### 5.2 Maintenance
- 模組 shell 改為共用 `ops` 結構
- Dashboard KPI 與設定提示改走同一套共用語法
- Equipments / Records / Reports 首屏結構改走同一套 panel + list/card grammar
- 空狀態改為共用 empty state
- modal 顯示隱藏從 `style.display` 改為 `hidden` class 切換，降低樣式與邏輯耦合

### 5.3 Machines
- 模組 shell 改為共用 `ops` 結構
- 搜尋列與工具列改走共用 actions grammar
- 找不到序號 / 尚未選擇序號 改走共用 empty state

## 6. 下一輪建議

### 優先 1：Repairs 結構拆層
把 `repairs.ui.js` 拆成：
- list shell
- detail shell
- action handlers
- render fragments
- form bridge

### 優先 2：Settings 收斂
把系統設定頁調整成真正的系統控制台，而不是大表單集合。

### 優先 3：docs 治理
保留：
- `README`
- `ARCHITECTURE`
- `UI_UX_GUIDELINE`
- `HANDOFF`
- 活模組規格
- 總 `CHANGELOG`

封存或整併：
- 過期 patch 文件
- 重複 changelog
- 一次性驗證草稿

## 7. 驗證標準

本收斂計畫後續每輪都要一起驗：
- 架構是否共用同一套 grammar
- 桌機 / 手機是否同時成立
- 空狀態 / KPI / toolbar / panel 是否一致
- 是否仍有 UI 層直接承擔過多流程邏輯
- 文件是否可支撐下一輪交接
