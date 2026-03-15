# CHANGELOG V161.336

日期：2026-03-14  
版本：V161.336  
BUILD_NUMBER：336

## 本版主題
UserAdmin / Auth email directory 結構性收斂

## 現象
- 啟動後主控台持續出現多筆 `@firebase/database: ... /userEmailIndex/... permission_denied`
- 設定 / 使用者管理載入時，會反覆對同一批使用者寫入舊索引
- 登入收尾也會再碰一次舊索引，造成主控台噪音與除錯干擾

## 根因
- 現行 `database.rules.json` 已明確提供 `usersByEmail` 權限規則
- 但前端 Auth 與 UserAdminService 仍保留對舊路徑 `userEmailIndex` 的讀寫流程
- `userEmailIndex` 在目前 rules 中沒有對應規則，等同預設拒絕
- 結果不是單一地方偶發，而是「登入流程 + 使用者管理補索引流程」都在持續打未授權路徑

## 修正策略
- 將 `usersByEmail` 升級為唯一正式 email directory
- 將 `userEmailIndex` 從執行路徑移除，不再讀、不再寫
- 查詢 uid 的 fallback 改為：`usersByEmail -> /users orderByChild('email')`
- 保留資料修復能力，但不再依賴未授權舊索引

## 變更檔案
- `core/auth.js`
- `core/user-admin.js`
- `core/config.js`
- `docs/VALIDATION_V161.336_USER_EMAIL_DIRECTORY.md`

## 影響範圍
- Firebase 登入後 profile / email directory 同步
- 設定頁的使用者管理
- 預設使用者補索引流程
- 既有帳號 restore / repair 流程

## 風險說明
- 若某些極舊資料只有 `userEmailIndex`、沒有 `usersByEmail` 且 `/users.email` 也缺失，則仍需要後續資料修復
- 但以目前 repo 內 rules 與現行資料契約來看，`usersByEmail` 才是正規結構

## 判定
這次屬於 **結構性修正**，不是用條件遮蔽 warning。
