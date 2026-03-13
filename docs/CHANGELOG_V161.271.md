# CHANGELOG｜V161.271

日期：2026-02-21（Asia/Taipei）

## SOP Hub

### 修正：Apps Script 上傳被 CORS 擋下（瀏覽器端 fetch 無法直連）
- 新增 `AppConfig.integration.gas.proxyUrl`：允許走「本機/伺服器端 Proxy」轉送 Apps Script，上傳可正常取得 JSON 回應。
- SOP 上傳流程改為：
  - 若 `proxyUrl` 有設定：呼叫 `proxyUrl`（payload 會包含 `uploadUrl`）
  - 若未設定：遇到 CORS/Failed to fetch 會顯示明確提示，要求改用 proxy。

## 工具
- 新增 `tools/sop_upload_proxy/`：Node.js（>=18）本機 Proxy（預設 `http://localhost:8787/upload`），處理 CORS 與 preflight。

## 設定
- `core/config.js`：新增 `integration.gas.proxyUrl`（預設空白，避免誤用）。
