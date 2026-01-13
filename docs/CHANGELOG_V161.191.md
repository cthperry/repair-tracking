# RepairTracking V161.191 變更記錄

日期：2026-01-13（Asia/Taipei）

## 修正

1. 修正「同公司多聯絡人下拉 ▾ 按鈕」點擊後觸發嚴重錯誤（RepairUI.toggleContactDropdown is not a function）。
   - 原因：聯絡人下拉按鈕使用 inline onclick 呼叫 `RepairUI.toggleContactDropdown(event)`，但該方法僅存在於 instance method，缺少對應的 static wrapper。
   - 作法：新增 `RepairUI.toggleContactDropdown(event)` static wrapper，轉呼叫 `window.repairUI.toggleContactDropdown(event)`。

## 影響檔案

- features/repairs/repairs.ui.js
- core/config.js
