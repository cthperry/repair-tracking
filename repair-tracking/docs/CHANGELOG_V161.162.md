# CHANGELOG｜V161.162

日期：2026-01-09

## 修正

- 機台保養（Maintenance）儀表板「前往設定」捷徑修正：
  - 修正錯誤呼叫 `Router.navigate()` 導致 `Router is not defined` 的致命錯誤。
  - 改為透過 `MaintenanceUI.gotoSettings()` 安全導向（內部檢查 `window.AppRouter.navigate` 是否存在）。

## 影響範圍

- Desktop / Mobile 同步生效。

