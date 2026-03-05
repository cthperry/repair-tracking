# CHANGELOG - V161.280

日期：2026-03-05（Asia/Taipei）

## 目標
- 修正行動裝置維修表單無法輸入問題。
- Enterprise Auth：登入狀態持久化 + 強化 Auth Gate，避免未登入仍可進入系統。
- 修正 SettingsService 在網路慢/首次連線時的 timeout 誤判，降低誤回退 local 的機率。
- Mobile SafeTap 僅影響真正的行動裝置，避免干擾桌機（含觸控筆電）。

## 變更摘要

### 1) Enterprise Auth（持久化 + Auth Gate）
- `core/config.js`
  - BUILD_NUMBER：277 → 280
  - 新增：`auth.allowLocalFallback=false`（預設不允許降級 local）
  - 新增：`auth.persistence='local'`（關閉瀏覽器後仍保留登入）
- `core/auth.js`
  - Firebase Auth 初始化時設定 persistence（local/session/none）
  - Firebase 初始化失敗時：預設不降級 local，改為顯示錯誤並維持登入門禁
  - `checkAutoLogin()` 僅在 `allowLocalFallback=true` 時才允許 local 自動登入
  - `onAuthStateChanged(user=null)` 且曾登入過時，會主動觸發 `auth:logout`，避免 UI/Service 殘留狀態
  - 將 `AuthSystem` 註冊為 `AuthService`（`AppRegistry.register('AuthService', AuthSystem)`），讓其他服務可用 `AppRegistry.ensureReady(['AuthService'])`

### 2) 行動裝置表單無法輸入（Mobile SafeTap）
- `core/mobile-safe-tap.js`
  - touchend / ghost click 邏輯全面略過：`input / textarea / select / contenteditable`
  - 更嚴格的裝置判斷：
    - 優先 `pointer: coarse`
    - `maxTouchPoints > 0` 時，只有在小螢幕（≤1024px）才啟用
  - 目的：避免觸控筆電被誤判成 mobile，導致桌機 click 行為被干擾

### 3) SettingsService timeout 改善
- `features/settings/settings.service.js`
  - Firebase load timeout：4.5s → 9s
  - timeout 時先回退 local，但會自動重試一次（2.5s 後）
  - `.info/connected` 快速判斷 timeout：0.6s → 1.5s

## 檔案異動
- core/config.js
- core/auth.js
- core/mobile-safe-tap.js
- features/settings/settings.service.js
- docs/CHANGELOG_V161.280.md
