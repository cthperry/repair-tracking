# CHANGELOG｜V161.262

日期：2026-02-12（Asia/Taipei）

## Phase 4｜簡易模式（Simple Mode）實裝

### 修正/新增
- **簡易模式設定正式生效**：讀取 `settings.simpleMode`，並由 `UIMode` 套用介面模式。
- **側邊選單 / Mobile Tab**：自動隱藏非允許模組（僅保留：儀表板 / 維修 / 客戶 / 週報 / 指南 / 設定）。
- **路由保護**：簡易模式下，導向到被隱藏模組會被阻擋並返回「維修管理」。
- **全域搜尋（Ctrl+K）政策**：簡易模式下停用並提示使用者切回標準模式。

### 相容性
- 兼容既有判斷：同步寫入 `body.dataset.uiMode` 與 `body.dataset.mode`，避免舊邏輯（如 GlobalSearch）誤判。

