# CHANGELOG V161.291

日期：2026-03-13

## 本版主題
P1 UI/UX 收斂第一波：狀態 badge、modal/sticky footer safe-area、FAB 避讓、WorkLog 卡片操作一致化。

## 變更摘要
1. 版號推進至 BUILD_NUMBER 291。
2. 新增核心狀態呈現規則：Repair / Quote / Order 可由 `AppConfig` 統一取得 badge class 與 accent。
3. Quote / Order 狀態顏色改為共用核心規則，避免各模組漂移。
4. `modal-footer.sticky` 補 safe-area 與內容底部保留空間，降低手機表單最後欄位被遮住的風險。
5. 手機 modal 改為 full-screen sheet 式表現，提升窄畫面可用性。
6. Quick Create FAB 補強 safe-area 與 `repair-mobile-actions` 避讓。
7. WorkLog 卡片與按鈕版面再收斂，手機操作改為直向滿版按鈕。

## 驗證項目
- JavaScript 語法檢查：core/config.js、features/quotes/quotes.ui.js、features/orders/orders.ui.js、features/quick-create/quick-create.js、features/worklogs/worklog.ui.js
- ZIP 維持單層結構

## 後續建議
下一版可進一步收斂：
1. Dashboard / Quote / Order / Repair detail 的 KPI 卡片尺寸與間距
2. 表單欄位錯誤訊息位置與必填星號規格
3. Badge / chip / tab 的完整 design token 化
