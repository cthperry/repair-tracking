# VALIDATION V161.336 - USER EMAIL DIRECTORY

日期：2026-03-14
版本：V161.336
BUILD_NUMBER：336

## 驗證目標
確認前端執行路徑已不再依賴未授權的 `userEmailIndex`，並統一改以 `usersByEmail` 為正式 email directory。

## 已做驗證

### 1. 語法檢查
- `node --check core/auth.js`
- `node --check core/user-admin.js`
- `node --check core/config.js`

### 2. 規則對照
- 檢查 `database.rules.json`
- 結果：
  - `usersByEmail` 有明確 `.read/.write` 規則
  - `userEmailIndex` 無規則，會落入根層 `.write: false`

### 3. 靜態路徑檢查
- 全 repo 搜尋執行碼中的 `userEmailIndex`
- 結果：只剩註解說明，不再有實際 `ref('userEmailIndex/...')` 讀寫呼叫

### 4. 邏輯檢查
- Auth login 收尾：改由 `_syncUserEmailDirectory()` 寫入 `usersByEmail`
- UserAdmin create / repair / restore / repairUserIndexes：改由 `_syncUsersByEmail()` 統一路徑
- lookupUidByEmail fallback：改為 `usersByEmail` 後查 `/users.orderByChild('email')`

## 尚未完成
- 真實 Firebase 實機登入後主控台觀察
- 設定頁使用者管理的人工 smoke test

## 結論
V161.336 已把 email directory 的正式資料契約收斂到 `usersByEmail`，
並移除舊 `userEmailIndex` 對現行 rules 的持續衝撞。
