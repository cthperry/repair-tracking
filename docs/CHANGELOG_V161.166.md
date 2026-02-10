# CHANGELOG - V161.166

日期：2026-01-10

## 修正 / 改進

### 零件追蹤：從維修詳情跳轉與快速新增完整化
- 補齊 `PartsUI.setContextRepair()` 與 `partsUI.openAddTracker()`：
  - 維修詳情「管理零件」可正確帶入該維修單篩選。
  - 維修詳情「+ 新增用料」可直接開啟「批次編輯」並自動新增一列、focus 到零件名稱欄位。

### 維修詳情：零件追蹤摘要增加統計資訊
- 零件摘要區塊新增：總筆數、Qty 合計、待處理、逾期統計，以及狀態分佈 badges（最多 8 類）。

### 日期輸入遮罩：邊界行為強化
- 日期遮罩新增支援：貼上/輸入 `2026-1-9` / `2026/1/9` 會自動補零成 `2026-01-09`（避免被整理成 `2026-19`）。
- 零件追蹤在儲存（批次/單筆）時，會同步標準化 `expectedDate / arrivedDate / replacedDate`，確保逾期判斷與排序行為穩定。

## 變更檔案
- `core/ui.js`
- `features/parts/parts.ui.js`
- `features/repairs/repairs.ui.js`
- `core/config.js`
