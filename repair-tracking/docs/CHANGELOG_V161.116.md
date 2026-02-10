# CHANGELOG — V161.116

日期：2026-01-05  
基底：V161.115（full_nolegacy）

## P2-1：程式碼質量與維護性（第一階段）

### 1) 共用 utils 分拆（新增）
- `core/utils/strings.js`
  - `StringUtils.escapeHTML() / escapeAttr() / safeText()`
  - 提供相容全域別名：`escapeHTML`、`escapeAttr`
- `core/utils/time.js`
  - `TimeUtils.toEpoch()`：全站 timestamp 比較/排序統一使用 epoch(ms)
  - `TimeUtils.formatTaipeiDateTime()`：Asia/Taipei 顯示格式統一
  - 提供相容全域別名：`toEpoch`
- `core/utils/dom.js`
  - `DomUtils.qs/qsa/on/delegate`：集中 DOM query 與事件委派工具

### 2) ErrorHandler：單一入口與 guard（強化）
- `core/error-handler.js`
  - 新增 `ErrorHandler.handle(error, moduleName, level, context)`：統一錯誤入口
  - 新增全域 `guard(fn, moduleName, fallback)`：用於 async handler 包裝（避免散落 try/catch）

### 3) timestamp 標準化（第一波改造）
- 將分散的 `Date.parse(...)` 改為優先使用 `TimeUtils.toEpoch(...)`：
  - `features/orders/orders.service.js`
  - `features/quotes/quotes.service.js`
  - `features/repairs/repairs.service.js`
  - `features/repairs/repairs.ui.js`
  - `core/utils.js`（isoToMs / formatTaipeiDateTime 轉為委派至 TimeUtils）

## 檔案清單（主要變更）
- 新增：
  - `core/utils/strings.js`
  - `core/utils/time.js`
  - `core/utils/dom.js`
  - `docs/CHANGELOG_V161.116.md`
- 修改：
  - `V161_Desktop.html`（加入 utils scripts）
  - `V161_Mobile.html`（加入 utils scripts）
  - `core/config.js`（BUILD_NUMBER=116）
  - `core/utils.js`
  - `core/error-handler.js`
  - `features/orders/orders.service.js`
  - `features/quotes/quotes.service.js`
  - `features/repairs/repairs.service.js`
  - `features/repairs/repairs.ui.js`
