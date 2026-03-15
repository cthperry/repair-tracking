# V161.355 靜態檢查

## 已做檢查
- node --check core/config.js
- node --check features/customers/customers.ui.js
- node --check features/customers/customers.ui-forms.js

## Root cause 摘要
- `form.id` 在 customer form 內會被 `<input name="id">` named access 覆蓋
- V161.354 雖已修 `customers.ui-forms.js`，但 `customers.ui.js` 的兩段 submit 入口仍使用 `form.id`
- 其中 modal direct submit handler 先執行 `stopImmediatePropagation()`，導致 fallback delegation 也被阻斷
- 結果是按下儲存後：事件被攔住，但沒有真正呼叫 `CustomerUIForms.handleSubmit()`
