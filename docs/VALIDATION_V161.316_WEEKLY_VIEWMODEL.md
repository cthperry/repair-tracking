# V161.316 驗證紀錄｜Weekly view model 收斂

## 驗證目標
- 確認 Weekly 週報輸出不再直接讀取 Repair 原始物件。
- 確認週報 view model 不包含 `repairNo` 與 `id`。
- 確認最終週報文字不含維修單號。

## 驗證結果
1. `_getWeeklyContext()` 已建立 `reportRowsView / newRowsView / closedRowsView / activeRowsView`。
2. `_toWeeklyReportCase()` 產生的 view model 不含 `repairNo` 與 `id`。
3. `getThisWeekRepairsText()` 最終輸出僅顯示客戶與機台，不含維修單號與案件 ID。
4. 客戶與機台皆空白時，會顯示 `未命名案件`。

## 結論
本次修正屬於結構性修正，已將週報輸出從直接操作 Repair domain 原始物件，收斂為正式的週報專用輸出契約。
