# V161.120 Changelog

## 修正
- 修正 Repairs 事件委派：click handler 內 `this` 指向錯誤導致 `this.openDetail/openForm/openHistory` 等不存在而噴錯。
  - 改為呼叫 `window.RepairUI`（static）與 `window.repairUI`（instance）正確入口。
- 補齊 `RepairUI.openForm(repairId)`（static）以支援：
  - 列表「編輯」按鈕（含事件委派）
  - 既有 HTML inline handler `RepairUI.openForm(...)`
- 新增 instance wrapper `openForm()` → 轉呼叫 `RepairUI.openForm()`，避免既有程式呼叫 instance 版本時失敗。

## 版本
- BUILD_NUMBER：120
