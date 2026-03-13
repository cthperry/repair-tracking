# V161.115 變更摘要（P0：建立訂單 / 零件摘要 / quote-order mini 修正）

## 修正項目

### 1) 維修詳情頁「報價/訂單摘要」載入失敗
- **現象**：Console 顯示 `ReferenceError: escapeHTML is not defined`，導致報價/訂單 mini summary（chips 摘要）無法渲染。
- **修正**：在 `features/repairs/repairs.ui.js` 補上 `escapeHTML()` helper（等效於其他模組的 `escapeHtml`），確保字串轉義一致。

### 2) 維修詳情頁「零件摘要」載入失敗
- **現象**：Console 顯示 `TypeError: window.RepairPartsService.listForRepair is not a function`，使「零件追蹤/摘要」區塊無法載入。
- **根因**：`RepairPartsService` 的正式 API 為 `getForRepair()`，但 RepairUI 仍在呼叫舊名稱 `listForRepair()`。
- **修正**：在 `features/parts/parts.service.js` 增加 `listForRepair()` 相容別名，內部委派到 `getForRepair()`。

### 3) 維修詳情頁「建立訂單」失敗（找不到報價資料）
- **現象**：Console 顯示 `OrderService.createFromQuote: 找不到報價資料`，即使流程應該「無報價先建報價再建訂單」。
- **根因**：`OrderService.createFromRepair()` 內部呼叫 `createFromQuote(...)` 時，錯誤傳入 `quote` 物件而非 `quote.id`（字串）。
- **修正**：在 `features/orders/orders.service.js` 修正為 `createFromQuote(quote.id)`。

## 版本資訊
- 唯一基底：V161.114
- 本版：V161.115
- `core/config.js`：更新 `VERSION_DATE` 與 `BUILD_NUMBER`。
