# 全站整體收斂規劃 V161.322

## 這一輪已完成
- Repairs：首頁 shell / KPI / 空狀態 / 列表控制列收回共用 grammar。
- Repairs：篩選面板與主 modal 改走 `hidden + helper`。
- Settings：Weekly 規格文案同步，admin 建立列切回結構化 hidden 控制。

## 下一輪收斂順序
1. Repairs detail / form / support board 再拆層
2. Settings 模板 / 備份 / 權限區的 panel grammar 對齊
3. Parts / Customers 導入同一套 ops section grammar
4. docs 治理：將高價值活文件與封存文件分層

## 共同規格
- 模組首屏：`ops-module-shell + module-toolbar + ops-kpi-grid + panel`
- 空狀態：統一走 `UI.emptyStateHTML()`
- 主顯示狀態：優先 `hidden + helper`，不要把主要開關狀態散在 `style.display`
- 列表控制列：只保留單一 render helper，不再複製 template
