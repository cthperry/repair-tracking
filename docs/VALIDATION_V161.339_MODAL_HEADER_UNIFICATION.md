# VALIDATION V161.339 modal header unification

## 已驗證
- `node --check core/config.js`
- `node --check features/customers/customers.ui-forms.js`
- 文字檢查確認：
  - Customers form 已改為 `modal-dialog modal-large customer-form-dialog`
  - Customers form header 已改為單列標題 + close button
  - 副說明已移至 `.customer-form-intro`
  - `.modal-header` 已移除 `overflow:hidden`
  - `.modal-close` 已補 `inline-flex + line-height:1 + align-self:flex-start`

## 尚未完成
- 使用者桌機實機再次確認
- Repairs form X 位置的實機比對
