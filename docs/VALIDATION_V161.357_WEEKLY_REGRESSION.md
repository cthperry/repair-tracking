# VALIDATION V161.357 - WEEKLY REGRESSION

日期：2026-03-15

## 本次目標
1. 週報案件格式固定契約持續維持。
2. 下週計畫編輯後，預覽與 mailto 寄送內容必須與畫面輸入一致。
3. 重新進入週報頁後，按鈕與輸入事件不得失效。
4. 下週計畫輸入含特殊字元時，不可破壞 DOM 結構。

## Root Cause
### 1. 預覽 / 寄送不同步
- WeeklyUI 原本只在 input 後 250ms debounce 才呼叫 `WeeklyService.updatePlan()`。
- 使用者若在 debounce 尚未落盤前直接點「預覽 / 寄送」，`getEmail()` 讀到的是舊的 `nextPlans`。

### 2. 第二次進入週報頁操作失效風險
- WeeklyUI 只有 `_delegationBound` 旗標，沒有追蹤目前綁定的 container。
- 若 router 或頁面重掛後 container DOM 換掉，事件委派可能不會重綁。

### 3. 下週計畫輸入特殊字元風險
- `renderPlans()` 原本只 escape `<` / `>`。
- 若內容包含 `&`、`"`、`'`，可能破壞 input value / textarea 內容與 dataset。

## 修正摘要
- WeeklyUI 新增 `_boundContainer`、`_pendingPlanDraft`、`_queuePlanPatch()`、`_flushPendingPlanUpdates()`。
- preview / send / toggle-preview / add-plan 先 flush pending draft，再產生內容或切換畫面。
- render 時若 container 改變，重置 delegation guard。
- renderPlans 改做完整 HTML escaping。
- WeeklyService `getNextWeekPlansText()` 收斂為固定 `客戶 – 專案/機型` 標題格式，空白回退 `未命名計畫`。

## 靜態檢查
- `node --check core/config.js`
- `node --check features/weekly/weekly.ui.js`
- `node --check features/weekly/weekly.service.js`
- `node --check features/weekly/weekly.model.js`
- `node --check features/weekly/weekly.controller.js`

## 需實機驗證
1. 下週計畫修改內容後立即點「預覽」。
2. 下週計畫修改內容後立即點「寄送週報」。
3. 切到別頁再回週報頁，測：預覽 / 寄送 / 新增 / 刪除。
4. 下週計畫輸入含 `&`、單引號、雙引號、尖括號，確認不跑版。
