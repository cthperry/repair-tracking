# CHANGELOG V161.110

日期：2026-01-04（Asia/Taipei）

## 目標
以不改變既有功能行為為前提，進一步降低故障率並提升執行效率，特別針對「維修詳情頁 ↔ 報價/訂單」聯動的查詢與渲染效能。

## 變更摘要
### 1) Utils 增強
- 新增 `Utils.pickLatest(list, getTime?)`：
  - 以 O(n) 掃描取得最新資料，避免 UI 端 `slice().sort()` 造成額外負擔。

### 2) QuoteService / OrderService 增加索引（repairId）
- 新增 in-memory 索引（延遲重建、dirty flag）：
  - `getForRepair(repairId)`：快速取得該維修單相關單據
  - `getLatestForRepair(repairId)`：快速取得最新單據
  - `getSummaryForRepair(repairId)`：回傳 `{ count, latest }`
- `_notifyChanged()` 會標記索引 dirty，確保資料變動後索引可自動重建。

### 3) RepairUI 聯動區塊效能化
- `refreshQuoteOrderSummary()` / `openOrCreateQuote()` / `openOrCreateOrder()`：
  - 優先使用 service 的 `getLatestForRepair/getSummaryForRepair`
  - 移除多處重複的 `toMs()`、`slice().sort()`，降低 GC 與排序成本
- 行為不變：
  - 「建立訂單」在無報價時仍會先建報價再建訂單（由 `OrderService.createFromRepair()` 保證）

### 4) OrderService.createFromRepair() 精簡
- 取得最新報價邏輯改為優先使用 `QuoteService.getLatestForRepair/getSummaryForRepair`，減少不必要的資料搬移與排序。

## 版本
- BUILD_NUMBER：109 → 110
