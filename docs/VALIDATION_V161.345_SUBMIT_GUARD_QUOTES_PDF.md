# VALIDATION V161.345

## 靜態驗證
- customers.ui-forms.js: customer-form inline submit 已改為同步 return false wrapper。
- customers.ui.js: delegated submit / direct submit 已補 preventDefault + stopPropagation。
- quotes.ui.js: quote create/save inline submit 已改為同步 return false wrapper。
- orders.ui.js / parts.ui.js / worklog.ui.js: delegated submit 已補 preventDefault。
- quotes.ui.js: PDF rowStep=48, maxPerPage=6。

## 待實機
- 編輯聯絡人儲存是否不再跳登入頁且資料有更新。
- 報價 PDF 表格列高是否回到母版。
