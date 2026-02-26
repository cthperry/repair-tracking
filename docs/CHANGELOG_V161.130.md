# V161.130 變更記錄（P2-3｜瘦身/維護性）

基底：V161.129（fixed）  
範圍：僅瘦身與維護性；不新增功能、不調整 UI、不改流程。

## 1) window.* 耦合收斂（registry-first）
- `core/registry.js`
  - 新增 `window._svc(name)`：以 AppRegistry/getService 為優先入口，並保留 window fallback（相容舊呼叫方式）。
- `core/config.js`
  - 讀取 SettingsService 改走 `window._svc('SettingsService')`（降低載入順序耦合）。
- `core/linkage.js`
  - 取得 RepairParts/Quote/Order 等服務改走 `window._svc()`（降低載入時序炸裂風險）。
- `features/customers/*`
  - CustomerService 取得改走 `window._svc('CustomerService')`（維持原行為）。
- `features/machines/machines.ui.js`
  - Repair/Parts/Quote/Order 等服務取得改走 `window._svc()`（維持原行為）。

## 2) 版號
- `core/config.js`
  - `BUILD_NUMBER` 更新為 `130`，確保頁面版本顯示一致。
