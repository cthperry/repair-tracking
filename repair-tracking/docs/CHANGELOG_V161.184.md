# CHANGELOG｜V161.184（2026-01-12）

本版目標：補完「兩個收尾」並強化整體穩定性與效能，避免跨模組開啟明細時的空白問題。

## 1. 核心｜延遲載入（Module Loader）
- 新增：`core/module-loader.js`
  - 初次載入僅預載各模組的 **model/service**（資料層）。
  - 各模組的 **UI / Controller / Feature CSS** 改為 **首次切換到該模組** 才載入。
  - 採 DOM 注入 `script/link`，不依賴 fetch/XHR，降低 `file://` 模式下的載入限制。
  - CSS 加入 timeout 保底，避免極少數瀏覽器 `link.onload` 不觸發導致卡死。

## 2. Router｜切換模組先 ensure() 再 render
- Desktop / Mobile：`_AppRouter.navigate()` 增加：
  - `await ModuleLoader.ensure(route)`
  - 若模組尚未載入，先顯示「載入中…」占位，載入失敗則顯示錯誤。

## 3. 轉訂單｜服務層防呆（避免重複、強制簽核）
- `features/orders/orders.service.js`
  - `createFromQuote(quoteId, options)`：
    - `options.requireApproved=true` 時，會檢查報價狀態是否為「已核准/已簽核」；不符合直接拒絕。
    - 同一張 `quoteId` 已存在訂單時，**直接回傳既有訂單**，避免重複建立。
    - 新建訂單預設狀態改為 `建立`（與系統狀態列一致）。

## 4. 跨模組開啟明細｜避免空白（Repair / Parts → Quote / Order）
- `features/repairs/repairs.ui.js`
  - `openOrCreateQuote()` / `openOrCreateOrder()`：
    - 先 `ensure()` 目標模組，再 `await AppRouter.navigate()`，最後呼叫 `openDetail()`。
- `features/parts/parts.ui.js`
  - `openRepair()` / `openQuote()` / `openOrder()`：
    - 同樣改為 `ensure()` → `await navigate()` → `openDetail()` 的流程，避免延遲載入造成開啟空白。

## 5. HTML｜移除 UI/Controller 預載（由 Module Loader 接管）
- `V161_Desktop.html` / `V161_Mobile.html`
  - 移除所有模組 `*.ui.js / *.controller.js / *.ui-forms.js` 與 `features/*/*.css` 的預載。
  - 保留 model/service 預載。
  - 新增載入：`core/module-loader.js`

