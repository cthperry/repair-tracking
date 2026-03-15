## V161.358（2026-03-15）

### 本版重點
- 週報模組再收斂：把「下週計畫」也納入固定契約設定，避免之後又各自硬寫欄位名稱。
- 新增 `tools/validate-weekly-contract.js`，用假資料直接驗證週報輸出不可再漂回 `問題摘要 / 本週處置 / 商務摘要 / 料件摘要`。
- 維修表單文案同步改為 `問題描述`，讓上游輸入欄位、詳情頁與週報輸出使用同一套語意。

### 修改摘要
- `core/config.js`
  - `BUILD_NUMBER`：`357` → `358`
  - `AppConfig.weekly.planDisplay`：新增 `fallbackLabel / planLabel / wrapWidth`
- `features/weekly/weekly.service.js`
  - 新增 `_getWeeklyPlanDisplayConfig()`
  - `getNextWeekPlansText()` 改讀 `planDisplay` 設定，不再硬寫 `計畫內容 / 未命名計畫`
  - 下週計畫排版改復用 `_formatWeeklyLabeledBlock()`，與本週案件欄位共用同一套換行邏輯
- `features/repairs/repairs.ui-forms.js`
  - `問題摘要` 文案統一改為 `問題描述`
  - 區塊說明文字同步改為週報契約一致語意
- `tools/validate-weekly-contract.js`
  - 新增週報固定契約驗證腳本

### 驗證
- `node --check core/config.js`
- `node --check features/weekly/weekly.service.js`
- `node --check features/weekly/weekly.ui.js`
- `node --check features/weekly/weekly.model.js`
- `node --check features/weekly/weekly.controller.js`
- `node --check features/repairs/repairs.ui-forms.js`
- `node tools/validate-weekly-contract.js`
