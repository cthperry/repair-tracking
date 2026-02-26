# V161.245（Phase 2）變更摘要

日期：2026-02-09（Asia/Taipei）

## 單元測試（Vitest）補齊最小覆蓋

### Customers：renameCompanyEverywhere
- 新增可跑測試 `tests/unit/renameCompanyEverywhere.spec.js`
- 覆蓋最小行為：
  - 同公司所有聯絡人（Customers）公司名同步更新
  - 透過 Phase 1 的 registry-first 方式呼叫 `RepairService.renameCompany` / `QuoteService.renameCustomer` / `OrderService.renameCustomer`

### WorkLogs：Legacy 搬移（repairLogs/repairWorkLogs → workLogs）
- `WorkLogModel.fromLegacy()`：新增穩定 ID + 基本欄位對應（idempotent）
- `WorkLogService.migrateLegacy()`：新增手動搬移入口（一次性、可控、不自動）
- 新增可跑測試 `tests/unit/worklog.migration.spec.js`

## 版本資訊
- BUILD_NUMBER：244 → 245
