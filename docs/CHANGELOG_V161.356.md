# V161.356（2026-03-15）

## 本版重點
- 修復週報案件明細格式漂移，恢復固定契約：`問題描述 / 工作內容 / 完成狀態 / 收費`。
- 移除案件標題前的狀態前綴（例如 `[需要零件]`），避免標題結構被改壞。
- 將零件摘要併回 `工作內容`，不再額外輸出 `料件摘要` 欄位。
- 修正 `WeeklyService` 在組裝週報案件時過早依賴 context cache 的問題，改為直接使用當次 ctx 傳入的 `repairPartSvc`。
- `BUILD_NUMBER`：`355` → `356`。

## Root cause
1. `weekly.service.js` 的 `_buildWeeklyRepairBlock()` 仍停留在舊的摘要式 schema，固定輸出：
   - `問題摘要`
   - `本週處置`
   - `商務摘要`
   - `料件摘要`
2. 案件標題仍強制帶入 `[status]` 前綴，與固定週報契約不一致。
3. `partsSummary` 在 `_toWeeklyReportCase()` 建構期間透過 `this._getWeeklyContextCache` 取資料，但 cache 尚未寫入，導致料件資訊只能退回不穩定 fallback。

## 結構性修正
- `core/config.js`
  - 新增 / 收斂週報固定契約設定：`issueLabel / workSummaryLabel / completionLabel / billingLabel / titleIncludeStatus / mergePartsIntoWorkContent`。
  - 將案件標題分隔符改為 ` – `。
- `features/weekly/weekly.service.js`
  - `_getWeeklyCaseDisplayConfig()` 改為讀取固定契約欄位。
  - `_toWeeklyReportCase()` 加入 `completionText`，並改由 `ctx.repairPartSvc` 直接組裝料件資訊。
  - `_getWeeklyWorkSummary()` 改為回傳工作內容行陣列，供週報輸出層統一排版。
  - 新增 `_formatWeeklyLineListBlock()`，固定 `工作內容` 多行輸出格式。
  - 新增 `_getWeeklyCompletionSummary()`，統一輸出 `已完成 (100%) / 進行中 (x%)`。
  - `_getWeeklyBillingSummary()` 改為固定收斂到：
    - `需收費（已下單）`
    - `需收費（下單狀態未確認）`
    - `需收費（未下單：...）`
    - `不需收費`
    - `尚未決定`
  - `_buildWeeklyRepairBlock()` 恢復固定案件式結構：
    1. `客戶 – 機台`
    2. `問題描述`
    3. `工作內容`
    4. `完成狀態`
    5. `收費`
