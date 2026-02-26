# V161.119 變更摘要（P2-2 第二段：事件委派）

基底：V161.118（full_nolegacy）

## 目標
- 減少在每張卡片/每個按鈕上重複綁定事件，避免 render 重建後事件失效。
- 移除 inline onclick，降低維護成本與 DOM 破壞風險。
- 列表/詳情頁主要操作統一走單一 click handler（便於後續 guard/ErrorHandler 收斂）。

## 主要變更
### 1) 維修列表卡片：data-action / data-id
- 檔案：`features/repairs/repairs.ui.js`
- `renderRepairCard()`：
  - 編輯：`data-action="repair-edit"`
  - 刪除：`data-action="repair-delete"`
  - 開啟詳情：`data-action="repair-open-detail"`
  - 查看歷史：`data-action="repair-open-history"`

### 2) 詳情頁「報價 / 訂單」動作按鈕：data-action
- 檔案：
  - `features/repairs/repairs.ui-forms.js`
  - `features/repairs/repairs.ui.js`
- 建立報價：`data-action="quote-open-create"`
- 建立訂單：`data-action="order-open-create"`
- `bindQuoteOrderBlock()` 不再綁 onclick，改為確保 data-action 存在。

### 3) RepairUI：單一事件委派入口
- 檔案：`features/repairs/repairs.ui.js`
- 新增 `bindDelegatedClicks()`：
  - 綁定於 `document`（避免列表/詳情 render 重建導致事件失效）
  - 依 `data-action` 分派：
    - `repair-open-detail` → `openDetail(id)`
    - `repair-edit` → `openForm(id)`
    - `repair-delete` → `confirmDelete(id)`
    - `repair-open-history` → `openHistory(id)`
    - `quote-open-create` → `openOrCreateQuote()`
    - `order-open-create` → `openOrCreateOrder()`
  - 非 open-detail 動作一律 `stopPropagation()`，避免誤觸卡片點擊
  - 失敗時走 `ErrorHandler.handle()`（若存在）

## 版本
- `core/config.js`：`BUILD_NUMBER: '119'`
