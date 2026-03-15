# 全站整體收斂規劃 V161.323

## 本輪定位
本輪不是單修 Customers 或 Parts，而是讓兩個列表型模組一起回到同一套 page grammar 與視覺節奏。

## Team 共同規格
- 產品 / 系統規劃：Customers 與 Parts 都屬於高頻維護型模組，首頁要強調搜尋、篩選、狀態摘要與快速操作。
- 架構：filters / modal 狀態不再直接用 `style.display`，統一回到 `hidden`。
- UI/UX：頁面 shell、toolbar、summary、filters、empty state 都吃同一套語法。
- 美工：Customers / Parts 的工具列、KPI、卡片、空狀態與手機版間距對齊。
- QA：要驗證搜尋/篩選、無資料狀態、modal 開關與桌機/手機的閱讀節奏。

## 本輪實作範圍
1. Customers 首屏
2. Parts 首屏（tracker + catalog 共用）
3. 相關 docs / changelog / validation
