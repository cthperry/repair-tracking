# CHANGELOG V161.354

日期：2026-03-15
BUILD_NUMBER：354

## 本版修正
- `features/customers/customers.ui-forms.js`：`handleSubmit()` 的表單辨識改為 `form.getAttribute('id')`，避開 `<input name="id">` 對 `form.id` 的 named access 覆蓋，修正編輯聯絡人後按「儲存」無效。
- `features/customers/customers.ui-forms.js`：移除 customer form 的 inline `onsubmit`，submit 鏈改由 modal direct submit handler / delegated submit 接手，避免 `handleSubmit()` 重複進入。
- `features/customers/customers.ui.js`：移除公司更名表單 inline `onsubmit`，讓更名表單也走同一套 submit 契約。
- `core/config.js` 進版至 `BUILD_NUMBER = 354`。

## 本版未動到
- `features/quotes/quotes.ui.js` 目前未再修改；PDF 品項列高 / 單頁 6 列修正維持 V161.351~353 狀態。
- 你先前提到的「交貨日」座標調整，這版程式碼內仍未找到對應動態欄位來源，因此本版未宣稱已修。
