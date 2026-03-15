# VALIDATION V161.342

## 已驗證
- `node --check core/config.js`
- `node --check features/quotes/quotes.ui.js`
- 靜態檢查：
  - 報價明細底部 footer 已移除 `sticky`。
  - command bar 不再重複放置關閉 / 輸出 PDF。
  - PDF 匯出已改用 `wrapTextByWidth()` / `drawWrappedText()`。
  - 客戶名稱、聯絡資訊、備註與項目名稱都走寬度限制換行。

## 尚待實機
- 報價明細 modal 操作節奏
- 真實 PDF 匯出視覺
