# VALIDATION V161.343

## Auth / 表單保護
- 已檢查 `core/ui.js` 語法。
- 已檢查 `core/auth.js` 語法。
- 已確認存在 document capture submit guard，會攔截 SPA 表單原生 submit。
- 已確認 Firebase shadow session 與 guarded grace period 已加入。

## PDF
- 已檢查 `features/quotes/quotes.ui.js` 語法。
- 已確認製表日期改為輸出當天。
- 已確認品項欄改為三層排版與自動換行。

## 注意
- 本版仍需使用者以實機驗證：
  1. 客戶/維修/報價/訂單等表單儲存後是否不再跳回登入頁。
  2. 報價單 PDF 版型是否已接近範例。
