# SOP Upload Proxy（解 CORS）

## 為什麼需要 Proxy
Google Apps Script Web App **無法自訂 `Access-Control-Allow-Origin`**，所以從瀏覽器（例如 `http://localhost:8000`）直接 `fetch(https://script.google.com/...)` 會被 CORS 擋下。

本 Proxy 會：
1. 接收前端 JSON（含 base64 檔案）
2. 伺服器端轉送到 Apps Script
3. 把 Apps Script 回傳的 JSON 再回傳給前端（含 CORS header）

## 使用方式（本機）
1. 安裝 Node.js **18+**
2. 啟動 proxy：
   - Windows：雙擊 `run_windows.bat`
   - macOS/Linux：`./run_mac_linux.sh`
3. 於 RepairTracking 的 `core/config.js` 設定：

```js
AppConfig.integration.gas.uploadUrl = "你的 Apps Script Web App URL";
AppConfig.integration.gas.token = "你的 TOKEN";
AppConfig.integration.gas.proxyUrl = "http://localhost:8787/upload";
```

完成後，SOP 詳情頁的「上傳 Vx」即可正常上傳。

## 參數（前端送到 proxy）
```json
{
  "uploadUrl": "https://script.google.com/macros/s/xxxx/exec",
  "token": "...",
  "path": "SOP/General",
  "filename": "xxx.pdf",
  "mimeType": "application/pdf",
  "base64": "..."
}
```
