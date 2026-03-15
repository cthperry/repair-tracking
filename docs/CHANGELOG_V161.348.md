# CHANGELOG V161.348

## 修正
- 修正報價明細表單儲存時 inline submit 誤用 `window.QuotesUI` 導致 `handleSaveQuote` undefined。
- `handleSaveQuote()` 改為明確使用 `window.quotesUI` instance 執行表單驗證與項目驗證，避免 static/instance 契約錯置。
- 修正從維修單建立報價表單 `onsubmit` 呼叫來源，改回 `QuotesUI.handleCreateFromRepair(event)`。
