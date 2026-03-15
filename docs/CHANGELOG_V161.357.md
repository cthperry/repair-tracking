# CHANGELOG V161.357

日期：2026-03-15

## 本版重點
- 週報模組整體回歸收斂：修正下週計畫編輯延遲寫入造成的預覽 / 寄送內容不同步。
- WeeklyUI 補上跨容器重掛綁定重置，避免切頁回到週報後操作事件失效。
- 下週計畫輸入改做安全 escaping，避免引號 / 特殊字元破壞 input / textarea DOM。
- 下週計畫輸出標題統一改用固定分隔符 `客戶 – 專案/機型`，空白資料回退為 `未命名計畫`。
- BUILD_NUMBER：356 → 357。

## 修改檔案
- core/config.js
- features/weekly/weekly.ui.js
- features/weekly/weekly.service.js
- docs/CHANGELOG.md
- docs/CHANGELOG_V161.357.md
- docs/VALIDATION_V161.357_WEEKLY_REGRESSION.md
