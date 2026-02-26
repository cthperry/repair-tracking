# Changelog V161.178

日期：2026-01-11

## 新增功能

### 1) 報價單版本控制（Versioning + History）

- 報價單新增欄位：`version / updatedAt / updatedByUid / updatedByName / updatedByEmail`。
- 每次儲存（含由維修單建立、一般編輯儲存、批次更名客戶、刪除）都會寫入「變更歷史」節點：
  - Firebase：`data/<uid>/quoteHistory/<quoteId>/<pushKey>`
  - Local：`localStorage: quote_history_<scope>`
- 變更歷史內容包含：版本號、時間、操作者、動作類型、變更摘要、變更欄位（from/to）、以及當次快照（snapshot）。
- 報價明細視窗新增「版本與變更歷史」區塊，可即時查看歷史紀錄並支援重新整理。

### 2) 已簽核報價「轉訂單」

- 報價狀態為「已核准（簽核）」時才允許轉訂單。
- 新增/調整按鈕：
  - 報價列表卡片：`轉訂單`（未簽核時顯示為 disabled）
  - 報價明細頁面：`轉訂單`（未簽核時顯示為 disabled）
- 轉單防重複：若已存在相同 `quoteId` 的訂單，會優先直接開啟該訂單。
- 轉單行為同時寫入報價變更歷史（`CONVERT_TO_ORDER`），便於追蹤。

## 變更檔案

- `features/quotes/quotes.model.js`
- `features/quotes/quotes.service.js`
- `features/quotes/quotes.ui.js`
- `features/quotes/quotes.css`
- `core/config.js`
