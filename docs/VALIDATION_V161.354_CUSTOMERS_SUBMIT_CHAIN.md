# VALIDATION V161.354

日期：2026-03-15
BUILD_NUMBER：354

## 已完成的靜態檢查
- `node --check core/config.js`
- `node --check features/customers/customers.ui.js`
- `node --check features/customers/customers.ui-forms.js`

## 已確認的修正點
- `customer-form` 已移除 inline `onsubmit`，避免 submit 時同時走 inline 與 JS listener。
- `company-rename-form` 已移除 inline `onsubmit`，submit 契約與 customer form 對齊。
- `handleSubmit()` 已改用 `form.getAttribute('id')` 判斷表單身分，不再受 `<input name="id">` 影響。
- `BUILD_NUMBER` 已由 `353` 進版為 `354`。

## 仍需使用者實機驗證
- 客戶聯絡人編輯後按「儲存」是否正常寫入。
- 第二次進入客戶頁面後，搜尋 / 清除 / 新增聯絡人 / 公司更名同步按鈕是否仍正常。
- 公司更名表單儲存是否只觸發一次，不會重複送出。

## 尚未確認
- `quotes.ui.js` 的「交貨日」座標修正，本版尚未宣稱已完成。
