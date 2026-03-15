# CHANGELOG V161.343

## 本版重點
- 修正多個表單儲存後疑似觸發原生 submit / Firebase auth 短暫掉線造成的強制登出風險。
- 報價單 PDF 改為輸出當天製表日期，並重整品項欄三層排版與長文字換行。

## 主要修改
1. `core/ui.js`
   - 新增 SPA submit guard，攔截 enterprise/modal/worklog/KB 等表單原生 submit reload。
2. `core/auth.js`
   - 新增 Firebase shadow session。
   - unexpected auth null 改為 guarded grace period，避免短暫 auth 失聯就立刻跳回登入頁。
   - 明確登出時才清掉 shadow session。
3. `features/quotes/quotes.ui.js`
   - PDF 製表日期改為輸出當天。
   - 報價日期/失效日期計算重整。
   - 品項欄改為 Vendor / 品名 / MPN 三層排版，長文字在欄寬內換行。

## 版本
- BUILD_NUMBER = 343
