# CHANGELOG V161.345

## 主題
- 客戶/報價/訂單/零件/工作記錄 submit 契約全面補強
- 報價 PDF 列高與最大列數改回母版規格

## 修正
- 所有已知可編輯表單提交流程補上 preventDefault / stopPropagation，避免原生 form submit 造成整頁 reload。
- 客戶表單與公司更名表單改為同步 return false inline submit wrapper。
- 報價表單建立/儲存改為同步 return false inline submit wrapper。
- 報價 PDF rowStep 由 46 改為 48。
- 報價 PDF maxPerPage 由 7 改為 6。
