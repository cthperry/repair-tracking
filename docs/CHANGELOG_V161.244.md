# V161.244（Phase 2）變更摘要

日期：2026-02-09（Asia/Taipei）

## 測試保護網（Phase 2 起手式）

### 單元測試（Vitest）
- 新增 `vitest` 測試架構（jsdom）
- 新增 `tests/helpers/loadScript.js`：以 VM 方式載入既有 IIFE 前端檔案
- 先落地可跑的最小測試：
  - `AppRegistry.ensureReady()`：集中化 init/loadAll，且 idempotent
  - `window._svc()`：唯一 service 入口（回 AppRegistry.get）
- 另外保留待補齊測試（先 skip）：
  - `renameCompanyEverywhere`
  - `worklog merge migration`

### E2E（Playwright）
- 新增 `playwright` 設定與最小 smoke：`Index_V161.html` 可載入

## Firebase Emulator
- 新增 `firebase/emulator.test.md`：RTDB emulator 驗證指引
- 新增 `firebase/firestore.rules`：保守 deny-all（避免誤以為已開放）

## 版本資訊
- BUILD_NUMBER：243 → 244
