# V161.127 變更摘要

## 修正（P0）
- 修正「新增/編輯維修單」表單初次開啟時，「模板」下拉可能為空、必須先在公司欄位輸入才會出現選項的問題。
  - 作法：
    - `RepairUI.openForm()` 開啟表單時，補上 `RepairTemplatesService` 的初始化（優先使用 `Utils.ensureServiceReady`，否則 fallback 直接 init）。
    - `RepairUI.afterRenderForm()` 初次渲染後立即執行 `bindTemplatePicker()`，不再依賴公司欄位的 input 事件觸發。

## 影響範圍
- 僅影響「新增/編輯維修單」表單中的模板下拉與管理入口。
- 既有模板資料結構、RTDB 路徑（`data/<uid>/meta/repairTemplates`）與套用覆寫規則不變。
