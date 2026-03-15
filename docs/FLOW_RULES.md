# FLOW_RULES

## 商務狀態流規則（V161.305）

### 1. 狀態與原因分離
- Quote / Order / Part / Billing 未下單追蹤，必須將「流程狀態」與「原因」拆開建模。
- 不可把 `請購中` 這種流程階段塞進原因欄位。
- 不可把 `價格過高` 這種原因當成流程狀態。

### 2. 中央狀態字典
- 所有商務狀態語意由 `core/config.js` 集中管理。
- UI 只可透過 AppConfig helper 讀取，不可在模組內自建第二份 map。

### 3. 終態判定
- `terminal = true` 的狀態，代表流程已完成或結束，不再納入逾期提醒。
- Order 目前終態：`已結案`、`已取消`
- Part 目前終態：`已更換`、`取消`

### 4. 排序規則
- 列表或統計需要依流程順序排序時，一律使用狀態的 `rank`。
- 不可在各模組各自定義 `rankMap`。


### 5. Billing domain 現況
- 目前專案尚未有獨立 Billing 模組或 `billing/` collection。
- 商務追蹤以 `repairs.billing` 為主資料來源。
- 在建立獨立 Billing 模組前，不可在其他模組私自衍生第二份請款狀態資料。
- Dashboard / Analytics / Weekly 若需顯示 billing 狀態，必須透過統一 helper（`AppConfig.getBillingFlowMeta()`）轉譯，不可再各自硬寫文字判斷。
