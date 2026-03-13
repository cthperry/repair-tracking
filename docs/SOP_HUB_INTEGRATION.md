# SOP Hub 整合說明（SOP-1）

本版將「SOP（作業流程）」功能整合進 RepairTracking（維修追蹤系統）內，並對齊 OrderSOPHub Phase 1 的資料模型與 My Drive（Apps Script）上傳規格。

---

## 1) 模組入口
- 進入系統後，在側邊欄/底部 Tab 可看到：**🧾 SOP Hub**
- 功能：
  - 列表頁：類別 + 關鍵字（標題/標籤/摘要）查詢 + 表格列出
  - 新增頁：先建立 SOP 主檔
  - 詳情頁：主檔唯讀顯示 + 上傳新版本（版本號固定為 latestVersion + 1，對齊 OrderSOPHub）+ 版本列表

---

## 2) 維修單關聯 SOP
在「維修單詳情」新增區塊：**🧾 SOP（作業流程）**
- **關聯 SOP**：在彈窗搜尋並選擇要關聯的 SOP
- **版本**：查看該 SOP 的版本列表
- **移除**：解除此維修單與 SOP 的關聯

> 關聯資料寫入欄位：`repairs/{repairId}.sopRefs = [{ sopId, version? }]`

---

## 3) 資料模型（對齊 OrderSOPHub Phase 1）
### SOP 主檔
- `data/<uid>/sophub/sops/{sopId}`
  - `title`（必填）
  - `category`：`machine | part | repair | general`
  - `scopeCustomerId`：空白/`null` 代表通用
  - `tags`：string[]
  - `abstract`：空白時寫入 null（對齊 OrderSOPHub）
  - `latestVersion`
  - `latestDriveWebViewLink`
  - `createdAt / updatedAt`

### Versions
- `data/<uid>/sophub/versions/{sopId}/{version}`
  - `version`（number）
  - `driveFileId`
  - `driveWebViewLink`
  - `changeLog`
  - `createdAt`
  - `createdByUid`

---

## 4) Apps Script（My Drive）上傳設定
SOP Hub 版本上傳使用 **Apps Script Web App**（與 OrderSOPHub Phase 1 相同 API）。

### 4.1 設定位置
請在 `core/config.js` 填入：
- `AppConfig.integration.gas.uploadUrl`
- `AppConfig.integration.gas.token`

> ⚠️ token 請不要提交到公開倉庫。

### 4.2 API 格式（POST JSON）
```json
{
  "token": "...",
  "path": "SOP/Machine",
  "filename": "xxx.pdf",
  "mimeType": "application/pdf",
  "base64": "..."
}
```
回傳：
```json
{
  "ok": true,
  "driveFileId": "...",
  "webViewLink": "https://drive.google.com/...",
  "name": "xxx.pdf",
  "path": "SOP/Machine"
}
```

### 4.3 Drive 目錄規則
- `SOP/Machine`
- `SOP/Part`
- `SOP/Repair`
- `SOP/General`

---

## 5) 不使用上傳（手動貼連結）
若未設定 GAS 或配額不足：
- 在 SOP「詳情頁 → 上傳新版本」區塊展開 **進階：手動貼上 WebViewLink**
- 不選檔案，直接貼上 `WebViewLink` 也能建立版本（不會執行上傳）



---

## V161.267 補充
- SOP Hub 事件改為 document 層級委派（capture），避免主容器重繪造成按鈕/表單無反應。


---

## 6) 雲端同步策略（V161.268 起）
- 建立/更新 SOP、上傳版本會先寫入本機快取，再嘗試同步到 Firebase RTDB。
- 若雲端同步逾時（預設 3.5 秒）或失敗，系統會提示 toast（事件：`sops:sync-error`）。
- 建議確認：
  - 網路可連線 Firebase
  - RTDB Rules 允許 `data/<uid>/sophub/*`（本專案 `database.rules.json` 在 `$uid` 節點已允許讀寫）
