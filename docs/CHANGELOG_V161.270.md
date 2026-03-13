# CHANGELOG｜V161.270

日期：2026-02-21（Asia/Taipei）

## SOP Hub（SOP-1）
- 修正：點擊「選擇檔案」會誤跳出「請先選擇檔案上傳…」錯誤訊息。
  - 根因：全域 click 事件委派會把 form[data-action] 當作 action 來源，導致點擊表單內任何 input 都觸發 upload/create。
  - 調整：click 委派忽略 FORM 元素（僅由 button[data-action] 或 submit 觸發），避免誤觸。
