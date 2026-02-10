# V161.131 變更記錄（P2-3｜瘦身/維護性）

基底：V161.130  
範圍：僅瘦身與維護性；不新增功能、不調整 UI、不改流程。

## 1) window.* 耦合再收斂（registry-first）
- `V161_Desktop.html` / `V161_Mobile.html`
  - `applyUIPreferences()` 取得設定來源改為：`window._svc('SettingsService')` 優先、`window.SettingsService` fallback。
  - 目的：降低載入順序耦合（避免設定服務尚未掛載導致偏好無法套用）。

- `features/machines/machines.controller.js`
  - 初始化 repairs/repairParts/quotes/orders 的 Service 取得改為 registry-first（`window._svc()`），保留 window fallback。

- `features/orders/orders.ui.js`
  - 全面將 `window.OrderService / window.QuoteService / window.RepairService` 直取，改為 registry-first（`window._svc()`）並保留 window fallback。
  - 目的：降低模組間互相依賴 `window.*` 的硬耦合、避免載入時序炸裂。

## 2) 版號
- `core/config.js`
  - `BUILD_NUMBER` 更新為 `131`，確保頁面版本顯示一致。
