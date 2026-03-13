# V161.117 變更摘要

本版目的：修正 P2-1（utils / ErrorHandler）導入後造成的啟動階段（Bootstrap）斷點，確保 Desktop/Mobile 可正常啟動，不再白畫面。

## 修正內容

1. **core/error-handler.js**
   - 修正 class method 結構：`handle()` 從 `init()` 內部移出，避免語法/初始化失敗造成 `window.ErrorHandler` 未定義。
   - 保持既有 `window.ErrorHandler` 與 `window.guard` 相容輸出。

2. **core/bootstrap.js**
   - `Initialize Error Handler` 改為防禦式呼叫：若 `window.ErrorHandler.init` 不存在，不中斷整個啟動流程。
   - Bootstrap 失敗時的 CRITICAL log 改為安全 fallback，避免再次引用 `window.ErrorHandler` 造成二次錯誤。

## 驗證重點（P2-1 sanity）
- Desktop/Mobile 開啟不再白畫面。
- Console 不再出現 `Cannot read properties of undefined (reading 'init')` 於 bootstrap。
