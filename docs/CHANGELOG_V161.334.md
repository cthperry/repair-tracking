# CHANGELOG V161.334

日期：2026-03-14

## 本版重點
- 修正「新增維修單無法儲存」的結構性問題。
- 將設備名稱欄位的顯示控制項與實際寫入欄位統一到同一條 submit 正規化路徑。
- 補齊設備名稱欄位 required 切換規則，避免畫面看起來已輸入、實際送出仍為空值。
- 將電話驗證規則統一為 6~20 碼數字，消除表單層與 Model 層規則不一致。

## 根因
1. 新增維修單的設備名稱採用「顯示欄位（select/manual） + hidden 最終欄位（machine-final）」雙軌結構。
2. 原本 create submit 主要讀 hidden 欄位；若 visible control 與 hidden 欄位未同步，送出資料的 `machine` 會是空字串。
3. `RepairModel.validate()` 又強制 `machine` 必填，導致建立失敗。
4. 電話欄位另有一個次要結構問題：UI submit 驗證允許 6 碼以上，但 Model 驗證要求至少 8 碼，會造成前端看似通過、實際 create/update 失敗。

## 修正
- `features/repairs/repairs.ui-forms.js`
  - 新增 `_getVisibleMachineField()`
  - 新增 `_resolveMachineValue()`
  - 新增 `_applyEquipmentRequired()`
  - `handleSubmit()` 在 validate 與 FormData 之後都會再次正規化 `machine`，避免 hidden 欄位脫鉤
  - 當 `machine` 為空時，直接阻擋送出並聚焦可見設備欄位
- `features/repairs/repairs.model.js`
  - 電話驗證統一為 6~20 碼數字
- `core/config.js`
  - BUILD_NUMBER 推進至 334
