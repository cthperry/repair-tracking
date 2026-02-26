# CHANGELOG｜V161.265（2026-02-21）

## 修正
- SOP Hub →「新增 SOP / 上傳新版本」Modal：修正行動裝置/窄視窗底部按鈕超出視窗問題
  - Modal 改為 **Body 可捲動 + Footer sticky**
  - 補強長字串（含 `<code>`）換行規則，避免水平溢出

## 行為調整（對齊 OrderSOPHub Phase 1）
- SOP Versions：版本號固定為 `latestVersion + 1`（避免手動輸入造成跳號）
- 上傳新版本主要流程對齊原始 SOP Hub：主要以「選檔上傳」為主；另保留「進階：手動貼 WebViewLink」作為備援
- SOP 主檔：`abstract` 空白時寫入 `null`（而非空字串）

