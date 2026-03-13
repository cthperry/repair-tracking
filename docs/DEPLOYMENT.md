# 部署說明

## 1. 目前部署形態
RepairTracking 目前為靜態前端專案，可直接部署於 Vercel。

關鍵檔案：
- `vercel.json`
- `Index_V161.html`
- `V161_Desktop.html`
- `V161_Mobile.html`

## 2. 本機啟動
建議在專案根目錄啟動靜態伺服器：

```bash
python -m http.server 8080
```

再以瀏覽器開啟：
- `http://localhost:8080/Index_V161.html`

## 3. Vercel 部署重點
- 專案為靜態站，不需 Next.js / Node server runtime
- `vercel.json` 目前僅做 rewrite，將所有路徑導回靜態資源
- 部署後入口建議直接使用 `Index_V161.html`

## 4. Firebase 必要設定
### Firebase Auth
- 已採用 local persistence
- 啟動時會先等待 `onAuthStateChanged` 首次結果
- `allowLocalFallback = false`

### Realtime Database
- 資料以 `data/<uid>/...` 為主命名空間
- 管理面資料在 `users/`、`usersByEmail/`
- 週報計畫在 `weeklyPlans/<uid>`

## 5. SOP 上傳整合
若啟用 SOP 附件上傳，需設定：
- `AppConfig.integration.gas.uploadUrl`
- `AppConfig.integration.gas.proxyUrl`
- `AppConfig.integration.gas.token`

本機代理工具位置：
- `tools/sop_upload_proxy/server.js`

## 6. 測試指令
```bash
npm install
npm test
npm run e2e
```

說明：
- `npm test`：Vitest 單元測試
- `npm run e2e`：Playwright E2E
- E2E 前要先啟動靜態站，預設 `BASE_URL=http://localhost:8080`

## 7. 發版前最低檢查
1. `core/config.js` 版號與日期已更新
2. `docs/CHANGELOG_V161.xxx.md` 已新增
3. Desktop / Mobile 入口可正常開啟
4. Firebase Auth 啟動流程正常
5. 核心流程 `Repair → Quote → Order` 至少 smoke test 一次
