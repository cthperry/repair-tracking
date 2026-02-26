# V161.122 變更摘要（P2-3 第一段）

基底：V161.121（唯一基底）

## 目標
- 清理重複 helper，統一使用 `core/utils/strings.js`。
- 降低 helper 名稱/實作不一致造成的爆錯。
- 不改 UI 外觀、不改 Firebase 資料結構。

## 變更

### A. 統一 HTML 轉義（escapeHTML / escapeHtml）
- `core/ui.js`
  - `escapeHtml` 優先使用 `window.StringUtils.escapeHTML()`（保留 fallback）。
- `features/machines/machines.ui.js`
  - `escapeHtml` 優先使用 `window.StringUtils.escapeHTML()`（保留 fallback）。
- `features/repairs/repairs.ui.js`
  - `escapeHTML` 優先使用 `window.StringUtils.escapeHTML()`（保留 fallback）。

### B. 版本號
- `core/config.js`：`BUILD_NUMBER` 升至 `122`。

## 行為影響
- 無 UI 變更。
- 無資料結構變更。
- 僅減少重複 helper，並降低 helper 遺漏導致的 runtime error 風險。
