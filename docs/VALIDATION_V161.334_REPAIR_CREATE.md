# VALIDATION V161.334 Repair Create

日期：2026-03-14

## 已完成驗證
- `node --check core/config.js`
- `node --check features/repairs/repairs.ui-forms.js`
- `node --check features/repairs/repairs.model.js`
- Node 模擬 DOM 結構測試：
  - 手動輸入模式可正確把 `machine-manual` 同步回 `machine-final`
  - 下拉選擇模式可正確把 `machine-select` 寫回 `machine-final`
  - `_applyEquipmentRequired()` 會只對目前可見的設備欄位設為 required
  - `RepairModel.isValidPhone()` 現在接受 6 碼短碼，且仍限制最大 20 碼

## 尚未完成
- 使用者實機建立新維修單驗證
- Firebase 真實寫入驗證

## 判定
本版已完成語法檢查與針對 root cause 的結構測試，但仍需使用者實機確認建立流程。
