# VALIDATION V161.318 WEEKLY TEAM SPEC

- 日期：2026-03-14
- 版本：V161.318

## 驗證方式
1. 直接載入 `core/config.js`、`features/weekly/weekly.model.js`、`features/weekly/weekly.service.js`
2. 模擬兩筆本週案件資料，其中一筆為已完成案件
3. 模擬用料與 worklog 資料
4. 執行 `WeeklyService.getThisWeekRepairsText()` 驗證輸出文字

## 驗證結果
- 通過：輸出包含 `週報摘要`
- 通過：輸出包含 `本週案件總覽（依更新日產出）`
- 通過：輸出不包含 `本週新增案件`
- 通過：輸出不包含 `本週結案案件`
- 通過：輸出不包含 `repairNo`
- 通過：同一案件只在明細區出現一次

## 說明
本次驗證重點不是只看字串是否消失，而是確認 Weekly 已改為單一 view model 輸出契約。
