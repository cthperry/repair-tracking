# V161.141 變更記錄（P2-3｜dead code 清理與 window.* 收斂）

> 基底：V161.140（RepairTracking_V161.140_full_nolegacy.zip）

## 1) window.* 收斂：新增 AppState（單一狀態來源）
- 新增：`core/app-state.js`
  - 集中管理：`currentUser`、`isAuthenticated`、`deviceInfo`
  - 提供：`AppState.getCurrentUser()` / `AppState.isAuthenticated()` / `AppState.getDeviceInfo()`
  - 提供：`AppState.getUid()` / `AppState.getScopeKey()`（供 storage scope / 資料隔離使用）
  - 相容層：保留 `window.currentUser` / `window.isAuthenticated` / `window.deviceInfo`（透過 getter/setter bridge）

## 2) 核心模組改用 AppState（降低耦合與載入順序風險）
- `core/bootstrap.js`
  - 裝置資訊改寫入 `AppState.setDeviceInfo()`（仍保留相容 window.deviceInfo）
  - `device-*` body class 改讀取 AppState
  - 快捷鍵判斷登入狀態改用 `AppState.isAuthenticated()`
- `core/auth.js`
  - 登入/自動登入/登出：改呼叫 `AppState.setAuth()` / `AppState.clearAuth()`
  - 相容 fallback：在極端情況仍會回寫 `window.currentUser` / `window.isAuthenticated`
- `core/user-admin.js`
  - 讀取使用者角色改用 `AppState.getCurrentUser()`
- `core/linkage.js`
  - `getUserScopeKey()` 優先讀取 `AppState.getCurrentUser()`（避免依賴 window.currentUser）

## 3) dead code 清理（維護性整理）
- 將「狀態散落寫入 window.*」的重複邏輯收斂至 AppState（避免多處同步、降低日後誤用風險）

## 4) 兼容性與風險控管
- 既有 inline handler（例如 `oninput="QuotesUI..."`）仍需依賴 window namespace：本版不改動。
- 既有程式若直接讀取 `window.currentUser` / `window.isAuthenticated` / `window.deviceInfo`：仍可正常運作。

