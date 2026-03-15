# WEEKLY MODULE SPEC

## 版本
- V161.318
- BUILD_NUMBER：318
- 時區：Asia/Taipei

## 模組定位
Weekly 是管理週報，不是案件流水帳。

## 固定輸出結構
1. `週報摘要`
2. `本週案件總覽`

## 明細規則
- 同一案件在明細區只能出現一次。
- 明細輸出只允許使用 Weekly view model，不可直接讀 Repair 原始物件。
- 案件標題固定為 `客戶｜機台`。
- 不顯示維修單號。
- 不顯示案件 ID。
- 不額外輸出 `本週新增案件` / `本週結案案件` 詳細段。

## 摘要規則
- 摘要保留：總數 / 新增 / 更新 / 已完成處理 / 維修中 / 待報價 / 待料 / 待下單 / 高風險。
- 已完成處理只作為摘要數字，不作為獨立強調段落。

## View Model 契約
Weekly 明細輸出只能使用以下欄位：
- `caseLabel`
- `statusLabel`
- `ownerLabel`
- `basisDateLabel`
- `basisDateText`
- `issueText`
- `workSummaryText`
- `billingSummaryText`
- `partsSummaryText`
- `sortKey`

## 禁止事項
- 不可再從輸出層直接讀 `repairNo`。
- 不可再從輸出層直接讀 `id`。
- 不可讓 `newRows / closedRows` 直接進入明細輸出。
- 不可再以畫面條件隱藏方式處理週報重複問題。
