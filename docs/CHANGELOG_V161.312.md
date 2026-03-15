# V161.312｜Weekly Output Format Hardening

## 核心目標
強化週報輸出格式，讓週報從單純資料條列，提升為可直接寄送主管與團隊的正式管理摘要。

## 根因
- 原本週報雖然已有資料，但段落層級與閱讀節奏不夠穩定，管理摘要、關注事項與案件明細混在同一閱讀流裡。
- 單一案件條列缺少固定節奏，使用者需要自行在問題、進度、商務與報價訂單之間來回掃描。
- 若週報、Dashboard、Analytics 各自使用不同商務語意，會造成管理輸出與主系統畫面不一致。

## 本版修正
1. `weekly.service.js` 改為固定段落順序：`摘要 / 需要主管關注 / 本週新增案件 / 本週結案案件 / 進行中案件總覽`。
2. 單一案件摘要固定為 `標題行 / 基本資訊 / 問題 / 本週進度 / 零件 / 商務 / 報價 / 訂單` 多行區塊。
3. 商務資訊持續走 `AppConfig.getBillingFlowMeta()`，避免週報與主流程語言不一致。

## 驗證
- `node --check core/config.js`
- `node --check features/weekly/weekly.service.js`
- `BUILD_NUMBER = 312`
