## V161.304 - 2026-03-13

### Repair Detail Overview：舊右側 sidebar 結構切除
- 根因定位：`features/repairs/repairs.ui-forms.js` 的維修詳情 renderer 在導入新版 `overview board` 後，仍持續輸出舊版 `repair-detail-side` sidebar 與 `repair-action-card`，造成新舊 detail layout 同時存在。
- 本次直接從 render tree 移除舊版 `處理狀態 / 編輯複製刪除 / 保養結案 / 報價訂單 / 零件追蹤 / SOP / 附件` 側欄輸出，不再以 CSS 隱藏或條件繞過。
- 桌機詳情頁改為單一主視圖：`hero → command bar → overview board → 問題描述 / WorkLog / 時間軸 → support board`。
- `編輯 / 複製 / 刪除` 改為獨立 `command bar`，不再混入舊版狀態摘要卡。
- `保養 / 結案連動`、`報價 / 訂單`、`零件追蹤`、`SOP`、`附件` 改為主內容底部的 `support board`，避免右側舊式資訊欄殘留。
- `features/repairs/repairs.css` 同步移除舊 sidebar 版型依賴，新增 `repair-detail-command-bar` 與 `repair-support-board` 樣式。
- 版本推進至 `V161.304`，`BUILD_NUMBER = 304`。
