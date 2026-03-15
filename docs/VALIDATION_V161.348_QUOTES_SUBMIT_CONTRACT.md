# VALIDATION V161.348

## 已驗證
- `node --check features/quotes/quotes.ui.js`
- `node --check core/config.js`
- 搜尋確認 `window.QuotesUI.handleSaveQuote` / `window.QuotesUI.handleCreateFromRepair` 已不存在於報價表單 inline submit。
- `handleSaveQuote()` 已改為透過 `window.quotesUI` instance 呼叫 `_prepareFormValidation()` 與 `_validateItemsForm()`。

## 待使用者實測
- 報價明細按「儲存」是否不再觸發全域錯誤頁。
- 從維修單建立報價的表單送出是否正常。
