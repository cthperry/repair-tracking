# VALIDATION V161.317 - Weekly Single Overview

日期：2026-03-14

## 驗證目標
- 週報不再特別強調結案資料。
- 同一案件在詳細區只出現一次。
- 週報輸出層不再持有維修單號與案件 ID。

## 驗證方式
- 以 VM 載入實際前端腳本：`core/config.js`、`features/weekly/weekly.model.js`、`features/weekly/weekly.service.js`
- 建立兩筆測試案件：
  - 案件 A：本週新增且本週結案
  - 案件 B：本週更新中的案件
- basis 設為 `updated`

## 驗證結果
1. 週報輸出包含 `摘要` 與 `本週案件總覽（依更新日）`
2. 週報輸出不包含 `本週新增案件`
3. 週報輸出不包含 `本週結案案件`
4. `台積電｜FlexTRAK-S` 在詳細區只出現一次
5. `reportRowsView[0]` 不含 `repairNo`
6. `reportRowsView[0]` 不含 `id`

## 結論
- 通過。V161.317 已把 Weekly 由多段重複明細輸出，收斂為單一案件總覽輸出。
