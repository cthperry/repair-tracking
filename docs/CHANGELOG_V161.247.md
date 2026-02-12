# Changelog V161.247 (2026-02-10)

## 修正
- Dashboard：修正 `features/dashboard/dashboard.controller.js` 語法錯誤（`init()` 缺少結束括號，導致 `Unexpected identifier 'reload'`）。
- Dashboard：將 `DashboardController` 實例化移出 class 區塊，避免 class body 內出現 top-level 宣告造成解析失敗。

## 備註
- 本版僅修正語法/載入錯誤，不變更 Phase 1 DoD 規則（Service 入口仍為 AppRegistry / window._svc）。
