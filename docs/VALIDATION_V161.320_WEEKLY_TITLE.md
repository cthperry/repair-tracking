# VALIDATION V161.320｜Weekly title cleanup

日期：2026-03-14

## 驗證方式
使用 Node VM 載入 `core/config.js`、`features/weekly/weekly.model.js`、`features/weekly/weekly.service.js`，建立登入者 own repair 測資後執行 `getThisWeekRepairsText()`。

## 驗證項目
1. 週報標題包含 `本週案件總覽`。
2. 週報標題不包含 `（依更新日）`。
3. 週報標題不包含 `（依建立日）`。
4. 既有 long text wrap 與 own-data 規則不受影響。

## 驗證結果
- `HAS_TITLE = true`
- `HAS_UPDATED_SUFFIX = false`
- `HAS_CREATED_SUFFIX = false`
- `HAS_OWNER = false`
- `HAS_WRAP = true`

## 範例輸出
```text
本週案件總覽

1. [已完成] 台積電｜FlexTRAK-S
   問題摘要：更換模組
   本週處置：
      （未填）
   商務摘要：需收費 / 尚未確認
   料件摘要：無

2. [維修中] 日月光｜AP-1000
   問題摘要：軸承異音
   本週處置：
      機台健檢並training Charlie Leaking rate to high
      (415mT) Unloader SMEMA cable 缺少一條 Unloader
```
