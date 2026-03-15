# VALIDATION V161.344

## 已做驗證
- node --check core/config.js
- node --check features/customers/customers.ui.js
- node --check features/customers/customers.ui-forms.js
- node --check features/quotes/quotes.ui.js
- customer-form 已具備 onsubmit 直連 CustomerUIForms.handleSubmit(event)
- company-rename-form 已具備 onsubmit 直連 CustomerUI.handleRenameCompany(event)
- Quotes PDF 品項欄改為逐行 drawText，不再一次性 drawWrappedText

## 尚待使用者實機驗證
- 編輯聯絡人儲存後是否仍會跳回登入頁
- 報價單 PDF 表格版面是否已回正
