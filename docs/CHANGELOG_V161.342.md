# CHANGELOG V161.342

## 重點
- 修正報價明細 footer 採用浮動 sticky 呈現，改為靜態收尾操作區。
- 修正報價單 PDF 匯出時，客戶名稱、聯絡資訊、備註與項目名稱過長會被截斷的問題，改為自動換行。

## 結構性修正
- Quotes detail command bar 與底部 footer 職責重新切分：command bar 只保留轉訂單，底部 footer 統一承接關閉 / 輸出 PDF / 儲存。
- PDF 文字輸出改成共用寬度量測與換行函式，不再用單行 drawText 或硬截字處理。
