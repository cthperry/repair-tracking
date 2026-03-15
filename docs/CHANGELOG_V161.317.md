# CHANGELOG V161.317

日期：2026-03-14
BUILD_NUMBER：317

## 現象
- 週報不需要特別強調結案資料。
- 同一個案例在週報中出現太多次。

## 根因
- Weekly 服務同時把 `newRows`、`closedRows`、`reportRows` 三組資料都當成詳細輸出來源。
- 同一案件只要同時符合「本週新增」「本週結案」「本週報表範圍」就會被重複列出。
- 這不是畫面問題，而是週報資料結構設計錯誤：摘要統計與詳細輸出沒有切開。

## 修正
1. 將 Weekly 詳細輸出統一收斂為 `reportRowsView` 單一 view model。
2. `newRows`、`closedRows` 改為只保留摘要統計，不再輸出獨立案件段落。
3. 新增 `AppConfig.weekly.caseDisplay`，把週報案件顯示規則集中在設定層。
4. 詳細輸出層只使用 `caseLabel / statusLabel / ownerLabel / issueText / workSummaryText / partsSummaryText / billingSummaryText` 等週報欄位，不再直接暴露 `repairNo` 與 `id`。

## 結果
- 週報改為：摘要 + 本週案件總覽。
- 結案資料仍可在摘要統計看到，但不再被獨立強調。
- 每個案件在詳細區只會出現一次。

## 驗證
- VM 載入 `core/config.js`、`features/weekly/weekly.model.js`、`features/weekly/weekly.service.js` 後實測。
- 確認輸出不包含 `本週新增案件` / `本週結案案件` 詳細段落。
- 確認同一案件在詳細區只出現一次。
- 確認 `reportRowsView` 不含 `repairNo` / `id`。
