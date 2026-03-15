# VALIDATION V161.352

日期：2026-03-15
BUILD_NUMBER：352

## 已完成的靜態檢查
- `node --check core/config.js`
- `node --check features/customers/customers.ui.js`
- `node --check features/quotes/quotes.ui.js`
- `node --check features/orders/orders.ui.js`
- `node --check features/kb/kb.ui.js`

## 已確認的修正點
- `window.CustomerUI` 已存在，且仍保留 `window.customerUI` singleton。
- `window.QuotesUI` 已存在，且仍保留 `window.quotesUI` singleton。
- `window.OrdersUI` 已存在，且仍保留 `window.ordersUI` singleton。
- `window.KBUI` 已存在，且仍保留 `window.kbUI` singleton。

## 本地可確認 / 不可確認
- 可確認：全域 API 契約已補上，不再只剩 instance singleton。
- 不可確認：瀏覽器實機點擊流程、Firebase 寫入與權限結果，仍需使用者實機驗證。
