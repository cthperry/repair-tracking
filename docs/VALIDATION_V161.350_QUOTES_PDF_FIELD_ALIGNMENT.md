# VALIDATION V161.350

## 已完成
- `node --check core/config.js`
- `node --check features/quotes/quotes.ui.js`
- 靜態檢查報價 PDF 項目列輸出邏輯：
  - 品號固定第一層
  - 品名固定第二層
  - 規格固定第三層
  - 品號空白時不再把品名上移

## 尚未完成
- 未在實機環境重新輸出 PDF 視覺驗證
- 未取得使用者實際輸出 PDF 確認
