# VALIDATION V161.346 QUOTES FIELD MAPPING

## 已完成
- `node --check core/config.js`
- `node --check features/quotes/quotes.ui.js`

## 靜態驗證
- 報價表單項目欄位表頭已調整為：名稱（品名）/ 規格 / Vendor（品號）。
- PDF 左側品項欄輸出順序已改為：Vendor（品號）→ 名稱（品名）→ MPN（規格）。

## 待實機確認
- 重新輸出 PDF，確認與參考母版欄位語意一致。
