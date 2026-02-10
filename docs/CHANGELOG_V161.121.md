# V161.121 變更摘要（P2-2 第三段：guard / ErrorHandler 統一入口）

基底：V161.120

## 目標
- 降低未捕捉 Promise Rejection 與事件處理器例外造成的 UI 中斷
- 將高風險 async 事件處理器統一套用 `guard()` 與 `ErrorHandler.handle()`

## 變更
### Repairs
- `features/repairs/repairs.ui.js`
  - 事件委派 click handler 改為 `guard(delegatedHandler, 'Repairs')`，並在各 action 呼叫時一律 `await`，確保 rejection 能被捕捉。
  - `RepairService.onChange` 增加防禦式 try/catch，統一導向 `ErrorHandler.handle`。
  - 表單「釘選公司 / 歷史帶入」按鈕事件改以 handler function + guard 綁定。
  - 歷史帶入列表 click handler 改以 handler function + guard 綁定。

### Settings
- `features/settings/settings.ui.js`
  - 使用者管理區：refresh/seed/role change/actions/import file 等 async handler 統一以 handler function + guard 綁定，避免未捕捉 rejection。

### 版本
- `core/config.js`：BUILD_NUMBER 升至 121
