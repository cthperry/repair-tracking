# V161.143 變更記錄（P2-3｜dead code 清理與 window.* 收斂）

> 原則：不動功能、不改 UI；僅做瘦身與維護性（小批次）。

## 1) 修復 core/utils.js（dead code 清理 + 穩定性）
- `core/utils.js`
  - 移除不完整/語法損壞的片段（避免載入期 SyntaxError）。
  - 重新整理並保留既有對外 API：
    - `Utils.getTaipeiDateKey()`
    - `Utils.pickLatest()`
    - `Utils.ensureServiceReady()`
  - `ensureServiceReady()` 改為 **registry-first**：優先 `window._svc(name)`，再 fallback `window[name]`（行為不變、降低載入時序風險）。

## 2) window.currentUser 讀取收斂（偏好 AppState，保留 fallback）
- `features/*/*.service.js`（customers / parts / quotes / orders / repairs）
  - Firebase root uid 取得：優先 `window.AppState.getUid()`，再 fallback `window.currentUser.uid` / `AuthSystem.getCurrentUser().uid`。
  - soft delete 註記：`deletedBy` 優先使用 `AppState.getUid()`。

- `features/repairs/repairs.model.js`
  - 建單 owner 欄位與 history by* 欄位改為：優先 `window.AppState.getCurrentUser()`，再 fallback `window.currentUser`。

- `features/repairs/repairs.ui.js`
  - 篩選「owner = me」改為優先 `AppState.getUid()`（僅讀取來源收斂，結果不變）。

- `features/settings/settings.controller.js` / `features/weekly/weekly.controller.js`
  - 登入檢查改為 `AppState.getCurrentUser()` fallback `window.currentUser`。

- `features/settings/settings.service.js` / `features/weekly/weekly.service.js` / `features/templates/repairTemplates.service.js`
  - uid / scopeKey 取得改為優先 AppState（保留舊行為 fallback）。

## 3) 版號一致性
- `core/config.js`
  - `BUILD_NUMBER: '142'` → `BUILD_NUMBER: '143'`
