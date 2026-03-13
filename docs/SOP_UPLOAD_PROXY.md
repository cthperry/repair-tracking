# SOP 附件上傳｜CORS Proxy 指南

## 問題：為什麼 Apps Script Web App 會被擋？
Google Apps Script Web App **無法自訂 `Access-Control-Allow-Origin`**。因此你在本機或任何網站上直接呼叫：
- `fetch("https://script.google.com/macros/s/.../exec")`

瀏覽器會因 CORS 而阻擋，Console 會看到：
- `blocked by CORS policy` / `Failed to fetch`

## 解法：使用 Proxy
用本機或伺服器端 Proxy 轉送 Apps Script。

### 本機快速使用（建議）
1. 安裝 Node.js 18+（Node 內建 fetch）
2. 啟動 Proxy：
   - Windows：`tools/sop_upload_proxy/run_windows.bat`
   - macOS/Linux：`tools/sop_upload_proxy/run_mac_linux.sh`
3. 設定 `core/config.js`：

```js
AppConfig.integration.gas.uploadUrl = "你的 Apps Script Web App URL";
AppConfig.integration.gas.token = "你的 TOKEN";
AppConfig.integration.gas.proxyUrl = "http://localhost:8787/upload";
```

完成後，SOP 詳情頁「上傳 Vx」即可正常運作。

## 前端 → Proxy payload
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
