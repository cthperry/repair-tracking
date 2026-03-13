# V161.296 變更紀錄

日期：2026-03-13

## 問題摘要
- Quote / Order / WorkLog 表單的驗證與錯誤呈現方式不一致。
- 多數表單只用 toast 提示，錯誤欄位本身沒有明確標示，使用者要反覆找欄位。
- WorkLog 使用 `div + button click` 模式，不是正式 `form submit` 流程，導致 Enter 鍵、必填驗證、錯誤顯示都無法與其他模組統一。

## 本版修正
1. 表單驗證核心升級
   - `core/form-validate.js` 新增表單摘要區塊（form summary）
   - 新增自訂欄位錯誤 API：`setControlError / clearCustomErrors / showSummary`
   - 錯誤改為「欄位就地提示 + 表單頂部摘要」雙層呈現

2. Quote / Order 項目驗證結構化
   - 將原本散落在 submit handler 內的逐列檢查，收斂為共通型驗證流程
   - 項目列錯誤會直接標記對應欄位，而不是只跳 toast
   - 空白列、名稱、數量、單價驗證改為同一條規則鏈

3. WorkLog 表單語意化
   - WorkLog 由 `div` 改為真正的 `form`
   - 欄位補上 `name` 與 `required` 規則
   - 送出改走 submit event，不再依賴獨立 click handler
   - 新增 inline error 與 summary，手機/桌機體驗一致

4. 視覺一致性
   - `core/ui.css` 補上 `.form-summary`、`.has-error`、表格欄位錯誤底色
   - 表單錯誤訊息位置固定，不再只靠右上角 toast 提醒

## 根因與修正層級
- 根因不是單一欄位問題，而是表單驗證機制分散在各模組內，缺少共用錯誤呈現層。
- 本版屬於 **結構性修正**：把驗證與錯誤呈現提升到核心層，再由 Quote / Order / WorkLog 共用。

## 驗證重點
- Quote：空白名稱、非法數量、負單價時，錯誤應直接出現在對應欄位且表單頂部顯示摘要
- Order：至少需一筆有效項目，錯誤不可只顯示 toast
- WorkLog：按 Enter 或 submit 時不應整頁刷新，必填欄位需有 inline error
