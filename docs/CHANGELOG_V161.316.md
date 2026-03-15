# CHANGELOG V161.316

## 修正摘要
- 重新定義 Weekly 週報案件輸出契約：週報不再直接讀取 Repair domain 原始物件來組字串，而是先轉成週報專用 view model。
- 週報 view model 僅保留顯示所需欄位：`caseLabel / status / owner / priority / createdText / updatedText / issue / billing / needParts / workLogs`，不再把 `repairNo` 或 `id` 暴露給輸出層。
- `core/config.js` 新增 `weekly.caseDisplay`，集中定義週報案件標題欄位與 fallback 規則，避免週報模組內再各自硬編碼。
- 版號推進至 `BUILD_NUMBER = 316`。

## 根因
- 先前 Weekly 仍直接以 Repair domain 物件進行排版，導致輸出層可任意存取 `repairNo / id`。
- 這不是單純某一行字串的問題，而是「週報輸出契約沒有被正式定義」，所以才會反覆發生把不該顯示的欄位帶回週報的風險。

## 本次結構性修正
1. 在 `_getWeeklyContext()` 建立 `reportRowsView / newRowsView / closedRowsView / activeRowsView`。
2. 透過 `_toWeeklyReportCase()` 把 Repair domain 轉成週報專用 view model。
3. `_buildWeeklyRepairBlock()` 與 `_buildWeeklyAttentionSummary()` 全改吃 view model，不再直接讀原始 repair。
4. 將週報案件標題規則集中到 `AppConfig.weekly.caseDisplay`。

## 驗證
- 新增 `tests/unit/weekly.no-repairno.spec.js`，驗證週報 view model 不包含 `repairNo / id`，且最終輸出不含維修單號。
- 另以 Node 直接載入 `WeeklyService` 執行實測，確認輸出符合新契約。
