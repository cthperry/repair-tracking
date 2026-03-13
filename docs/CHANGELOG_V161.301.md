# CHANGELOG V161.301

- 修正手機版編輯維修單時，billing 收費/下單狀態未進入委派 change handler 的根因問題。
- Repairs 模組改為通用型 `data-action` 事件轉發，避免後續新增表單 action 再次遺漏。
- 維修單 `未下單` 新增正式流程欄位 `billing.notOrdered.stageCode`。
- 新增內建未下單狀態：待報價、請購中、客戶評估中、預算確認中、暫緩、其他。
- 新增未下單原因選項：規格/內容待確認。
