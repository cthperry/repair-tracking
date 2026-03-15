# CHANGELOG V161.341

## 重點
- Quotes / Orders 模組 shell、KPI、篩選與清單容器收斂為同一組 business convergence grammar
- Quotes / Orders 建立 modal 改為同一套大型表單骨架與 sticky footer
- Quotes / Orders 明細 footer 補上統一說明與 action 區塊，桌機 / 手機維持一致收尾節奏

## 調整檔案
- core/config.js
- core/ui.css
- features/quotes/quotes.ui.js
- features/quotes/quotes.css
- features/orders/orders.ui.js
- features/orders/orders.css

## 說明
這版主軸不是新增功能，而是把 Quotes 與 Orders 的 surface / list / create modal / detail footer 收斂到同一組結構語法，避免模組間長得像同功能卻維持不同骨架。
