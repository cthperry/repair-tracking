# CHANGELOG V161.309

日期：2026-03-13
時區：Asia/Taipei

## 本版定位
- KB / Settings 企業級收斂第二波
- 根因修正知識庫欄位契約與 submit 流程不一致

## 根因與修正

### 1. KB 表單不是正式 submit 流程
- 舊版 KB modal 依賴 `#kb-save-btn` click handler 儲存，Enter 提交與表單驗證摘要不穩定。
- 本版改為真正 `<form>` submit 流程，save button 改為 `type="submit"`，並保留 inline validation 與按鈕 loading state。

### 2. KB 欄位命名漂移
- Failure UI 使用 `diagnostics/actions`，Case UI 使用 `rootCause/notes`，與 model/service 的主欄位不一致。
- 本版統一收斂為：
  - Failure：`symptom / failureMode / rootCause / fix`
  - SOP：`title / summary / steps / precautions`
  - Case：`title / summary / problem / analysis / solution / outcome`
- 檢視畫面保留舊資料 fallback 讀取，避免既有資料突然空白。

### 3. Settings 頁首缺少正式總覽層
- 舊版設定頁只有 toolbar 與 tab，收件人、釘選公司、產品線等核心設定量沒有首屏上下文。
- 本版新增 hero、摘要統計與 command bar，並修正簡易模式提示文字與實際可用路由不一致的問題。

## 主要更新檔案
- `features/kb/kb.ui.js`
- `features/kb/kb.css`
- `features/settings/settings.ui.js`
- `features/settings/settings.css`
- `core/ui-mode.js`
- `core/config.js`
- `docs/CHANGELOG.md`

## 驗證
- `node --check features/kb/kb.ui.js`
- `node --check features/settings/settings.ui.js`
- `node --check core/ui-mode.js`
- `node --check core/config.js`
