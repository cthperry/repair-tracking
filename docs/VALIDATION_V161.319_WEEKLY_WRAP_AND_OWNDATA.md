# VALIDATION V161.319｜Weekly own-data + wrap

日期：2026-03-14

## 驗證方式
使用 Node VM 載入 `core/config.js`、`features/weekly/weekly.model.js`、`features/weekly/weekly.service.js`，建立登入者 own repair 測資後執行 `getThisWeekRepairsText()`。

## 驗證項目
1. 不輸出摘要統計區。
2. 不輸出登入者重複資訊（負責、建立、更新）。
3. 長篇 `content` 會轉為多行 `本週處置`。
4. 週報仍維持 `本週案件總覽（依更新日）` 主結構。

## 驗證結果
- `HAS_OWNER = false`
- `HAS_SUMMARY = false`
- `HAS_WRAP = true`

## 範例輸出
```text
本週案件總覽（依更新日）

1. [維修中] 台積電｜FlexTRAK-S
   問題摘要：真空建立異常
   本週處置：
      機台健檢並training Charlie Leaking rate to high
      (415mT) Unloader SMEMA cable 缺少一條 Unloader
      氣管破損建議更新 Shuttle loader side lane 1/3 oring
      缺損需更換
   商務摘要：需收費 / 尚未確認
   料件摘要：無
```
