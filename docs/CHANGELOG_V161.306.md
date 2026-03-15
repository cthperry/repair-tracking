## V161.306 - 2026-03-13

### Repair / Quote / Order 總覽層與 Command Bar 一致化
- 根因定位：Quote / Order 明細長期將狀態、總額、關聯資訊、動作按鈕拆散在 `modal-header`、`form-context-bar`、首段欄位與 footer，多個模組各自拼裝，導致沒有正式的單一總覽層，也無法和 Repair 詳情頁形成一致的企業級語言。
- 本次在 `features/quotes/quotes.ui.js` 與 `features/orders/orders.ui.js` 直接重構 `renderDetailModal()`：改為 `detail hero → overview board → command bar → editable form sections` 的固定順序，不再依賴 header badge + form-context 的碎片式資訊排布。
- `core/ui.css` 新增可重用的企業級 detail 元件：`enterprise-detail-hero`、`enterprise-detail-overview-board`、`enterprise-detail-command-bar`、`enterprise-mini-stat` 等，讓 Quote / Order 可與 Repair 詳情頁共用相同閱讀語言。
- Quote 詳情現在集中呈現：報價狀態、總額、版本、修改者、客戶、維修關聯、可轉訂單狀態與備註摘要；轉訂單、輸出 PDF、關閉等操作移至統一 command bar。
- Order 詳情現在集中呈現：訂單狀態、採購總額、供應商、下單 / 到貨 / 收貨節點、逾期判定、關聯客戶 / 維修單與採購備註摘要；關閉操作與說明移至統一 command bar。
- `features/orders/orders.ui.js` 新增 `_isoToDateTime()`，避免 Order 總覽層仍以散落格式輸出最後更新時間。
- 版本推進至 `V161.306`，`BUILD_NUMBER = 306`。
