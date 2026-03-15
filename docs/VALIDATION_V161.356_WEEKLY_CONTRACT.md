# V161.356 週報契約修正驗證

## 已做靜態檢查
- `node --check core/config.js`
- `node --check features/weekly/weekly.service.js`
- `node --check features/weekly/weekly.model.js`
- `node --check features/weekly/weekly.ui.js`
- `node --check features/weekly/weekly.controller.js`

## 已做結構檢查
- ZIP 交付將採平面根目錄，不包第二層同名資料夾。
- `core/config.js` BUILD_NUMBER 已更新為 `356`。
- `docs/CHANGELOG.md` / `docs/CHANGELOG_V161.356.md` 已同步。

## 已做功能模擬驗證
以 VM stub 建立 1 筆樣本案件，驗證 `WeeklyService.getThisWeekRepairsText()` 輸出已符合固定契約：

```text
本週案件總覽

1. TI – FasTRAK
   問題描述：PCB 7 issue
   工作內容：
      03-10 Software checks were conducted with
      March's software engineers. All motor
      functions were checked, and it was found
      that the input conveyor motor was not
      working. A new motor will be installed. → 待續
      需要零件（尚無用料追蹤明細）
   完成狀態：進行中 (50%)
   收費：需收費（下單狀態未確認）
```

## 仍需實機驗證
- 週報頁面預覽與 mailto 內容是否與你現場資料完全一致。
- 長文字在實際資料集下是否仍有超出你可接受的換行位置。
- 多筆案件時排序、每筆分段間距、下週計畫是否未被連帶影響。
