# CHANGELOG V161.294

日期：2026-03-13

## 本版重點
- 修正 V161.293 認證模組 hotfix 遺漏函式，導致系統初始化時直接進入紅底錯誤頁。

## 修正內容
1. 在 `core/auth.js` 補回 `_clearAuthNullGraceTimer()`。
2. 在 `core/auth.js` 補回 `_applyLoggedOutState()`。
3. 保留 Firebase Auth grace period 邏輯，但不再因遺漏方法造成整體認證流程崩潰。

## 影響範圍
- Firebase Auth 初始化
- 自動登入
- Auth state 由 user -> null 或 null -> user 的切換
- 重新整理頁面後的登入畫面切換

## 驗證
- `node --check core/auth.js` 通過
- 重新搜尋 `core/auth.js` 中 `_clearAuthNullGraceTimer` / `_applyLoggedOutState` 皆已存在定義

## 備註
- 這一版是 V161.293 的立即修正版，先優先恢復可用性，再回到訂單儲存情境驗證。
