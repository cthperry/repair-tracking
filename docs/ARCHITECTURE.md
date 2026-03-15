# RepairTracking 架構總覽

## 1. 專案定位
RepairTracking 目前定位為：

**企業級維修管理戰情室 + 現場維修作業工具 + 商務流程追蹤平台**

核心流程：

```text
Repair → Quote → Order → Billing → Analytics
```

## 2. 目前技術形態
- 前端：Vanilla JavaScript + HTML + CSS
- 資料層：Firebase Realtime Database
- 身分驗證：Firebase Auth（local persistence）
- 部署：Vercel 靜態站
- 測試：Vitest + Playwright

## 3. 入口檔案
- `Index_V161.html`：自動導向入口
- `V161_Desktop.html`：桌面版入口
- `V161_Mobile.html`：行動版入口

## 4. 核心目錄（不可破壞）
```text
core/
features/
firebase/
```

### core/
負責共用基礎能力：
- `config.js`：版本、業務字典、功能開關、Firebase 設定
- `bootstrap.js`：啟動流程與環境檢查
- `auth.js`：Firebase Auth 與角色取得
- `app.js`：Desktop / Mobile app shell
- `router.js`：路由單一真實來源（SSOT）
- `module-loader.js`：按路由延遲載入 CSS / JS
- `registry.js`：AppRegistry / `window._svc()`
- `ui-mode.js`、`theme.js`、`global-search.js`、`linkage.js`：共用互動能力

### features/
每個功能模組大致遵循：
```text
features/<module>/
  ├─ *.model.js
  ├─ *.service.js
  ├─ *.ui.js
  ├─ *.controller.js
  └─ *.css
```

### firebase/
放置 Firebase 測試與模擬相關文件。

## 5. 路由模組（以 `core/router.js` 為準）
- `dashboard`：儀表板
- `analytics`：分析
- `repairs`：維修管理
- `machines`：機台歷史
- `customers`：客戶管理
- `parts`：零件追蹤
- `quotes`：報價管理
- `orders`：訂單追蹤
- `kb`：知識庫
- `sops`：SOP Hub
- `weekly`：週報
- `settings`：設定

## 6. 啟動與載入流程
```text
Index / Desktop / Mobile HTML
  → core/bootstrap.js
  → core/auth.js
  → App auth state ready
  → core/app.js 建立 shell
  → core/router.js 決定當前 route
  → core/module-loader.js 載入對應 feature
  → Controller 啟動 UI / Service
```

## 7. Service 呼叫規則（硬性規範）
### 禁止
- `window.getService`
- `window[serviceName]`
- 在 Controller 內直接 `svc.init()`

### 只允許
- `AppRegistry.ensureReady([...])`
- `window._svc('XxxService')`

## 8. AppRegistry 規則
`core/registry.js` 已提供：
- `AppRegistry.register(name, obj)`
- `AppRegistry.get(name)`
- `AppRegistry.ensureReady(names, opts)`
- `window._svc(name)`

`ensureReady()` 會集中處理：
1. `init()`
2. `loadAll()`
3. `__loadedOnce` 防重複載入

因此後續 Controller 不可再自行散落初始化邏輯。

## 9. 目前資料命名空間
### 使用者隔離資料
```text
data/<uid>/...
```
主要包含：
- repairs / repairHistory / workLogs
- customers / parts / quotes / orders / quoteHistory
- kb / sophub / meta

### 管理類資料
```text
users/
usersByEmail/
weeklyPlans/
```

## 10. 架構收斂原則
1. 優先修「共用規則」，不是局部硬補
2. Desktop / Mobile 必須同步思考
3. 新功能先對齊路由、資料節點、Service 規則再落碼
4. 文檔、版本、驗收標準要先於大改動
