# CHANGELOG V161.346

## 重點
- 修正報價項目欄位語意，改為：名稱（品名）、Vendor（品號）、MPN（規格）。
- 修正報價單 PDF 左側品項三層輸出順序，與參考母版一致。

## 變更
- `features/quotes/quotes.ui.js`
  - 報價表單欄位標題改為 `名稱（品名）`、`規格`、`Vendor（品號）`。
  - placeholder 同步調整為品名 / 規格 / 品號語意。
  - PDF 匯出三層文字輸出順序改為：`vendor -> name -> mpn`，對應 `品號 -> 品名 -> 規格`。
- `core/config.js`
  - BUILD_NUMBER 調整為 346。
