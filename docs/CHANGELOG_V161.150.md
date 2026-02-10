# Changelog｜V161.150

日期：2026-01-06（Asia/Taipei）

## P3｜維修詳情「變更記錄」標籤（可追蹤性）

### 新增
- 維修單詳情視窗新增標籤列：**「總覽 / 變更記錄」**。
- 「變更記錄」顯示維修單所有歷程（CREATE / UPDATE / DELETE），資料來源沿用既有 `RepairService.getHistory(repairId)` 與 `repairHistory`（無新增資料結構）。
- 標籤上顯示筆數（例：變更記錄 (8)）。

### 調整
- `RepairUI.openHistory()` 改為：開啟詳情後自動切換到「變更記錄」標籤（不再依賴捲動定位）。

### 相容性
- 不影響既有維修單 CRUD、列表、零件追蹤、報價/訂單連動。
- Desktop / Mobile 皆可用。

## 變更檔案
- `core/config.js`
- `core/ui.css`
- `features/repairs/repairs.ui.js`
- `features/repairs/repairs.ui-forms.js`
