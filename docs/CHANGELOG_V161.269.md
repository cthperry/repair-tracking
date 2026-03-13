# CHANGELOG｜V161.269

日期：2026-02-21（Asia/Taipei）

## SOP Hub（SOP-1）
- 修正：從維修單（Repair modal）進入 SOP Hub 時，維修單視窗殘留造成 SOP 上傳區塊與維修單畫面重疊。
  - 進入 SOP Hub 前自動關閉維修單 modal 與 SOP 關聯/版本 modal。
  - QuickCreate 浮動「＋」在 SOP Hub 路由自動隱藏，避免遮擋內容。
- 新增：SOP 詳情主檔可編輯（標題/類別/適用客戶/標籤/摘要），支援儲存/取消。
- 修正：SOP 類別顯示一致化（列表/詳情/篩選一律顯示中文：機台/零件/維修/通用；資料仍以代碼 machine/part/repair/general 儲存）。
- 修正：SOP 列表/版本表格顯示不完整問題（移除 table display:block，改用外層捲動容器 sops-table-wrap）。
