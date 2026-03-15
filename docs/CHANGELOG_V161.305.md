## V161.305 - 2026-03-13

### Business Status Semantic Convergence：第一波
- 根因定位：`quote / order / part / billing not ordered` 的狀態語意長期分散在 `core/config.js`、`orders.ui.js`、`parts.ui.js`、`repairs.ui.js`、`repairs.ui-forms.js` 多處硬編碼，導致 badge、顏色、終態判定、排序規則容易漂移。
- 本次將 `partStatus`、`quoteStatus`、`orderStatus`、`billingNotOrderedStage`、`billingNotOrderedReason` 全部升級為「單一狀態定義源」，每個狀態都正式帶入 `semanticKey / stageKind / rank / terminal / badgeClass / accent / soft`。
- `core/config.js` 新增：
  - `getBusinessStatusOptions(type)`
  - `getBusinessStatusMeta(type, value)`
  - `isTerminalBusinessStatus(type, value)`
  - `getBusinessStatusRank(type, value)`
- `getStatusPresentation()` 改為優先讀取統一狀態字典，不再讓 `quote / order / part` 各自維護第二份 badge / 顏色規則。
- `features/orders/orders.ui.js`：逾期判定改用 `isTerminalBusinessStatus('order', status)`，狀態 badge / accent 全部改從 AppConfig 取得。
- `features/parts/parts.ui.js`：逾期判定、卡片 accent、狀態排序改為讀取統一狀態定義，不再維護本地 rankMap 與顏色表。
- `features/repairs/repairs.ui.js`：維修詳情中的零件追蹤 mini list 改由統一的 part status badge 規則輸出。
- `features/repairs/repairs.ui-forms.js`：未下單狀態與原因標籤改讀 AppConfig 狀態字典，移除本地 `stageMap / reasonMap`。
- 版本推進至 `V161.305`，`BUILD_NUMBER = 305`。
