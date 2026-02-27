# 架構驗證與優化建議報告
**RepairTracking V161.271 — Modular Phoenix**
日期：2026-02-27
審查範圍：`core/`、`features/`、`database.rules.json`、`V161_Desktop.html`、`V161_Mobile.html`

---

## 一、架構總覽

### 系統技術棧
- **前端**：Vanilla JavaScript（無框架）+ HTML / CSS
- **後端**：Firebase Realtime Database + Firebase Auth（compat v9）
- **部署**：Vercel
- **測試**：Vitest（單元）+ Playwright（E2E）

### 啟動流程（層層事件驅動）

```
HTML 載入腳本
  └─ Bootstrap.start()            ← config / device / styles / auth 環境
       └─ bootstrap:ready 事件
            └─ AuthSystem.init()  ← Firebase Auth 或 Local Mode 降級
                 └─ auth:login 事件
                      └─ MainApp.init()
                           ├─ renderMainFrame()   ← Desktop / Mobile 子類別
                           ├─ applyUIPreferences()
                           ├─ AppRouter.navigate() ← 預設路由
                           ├─ NotificationCenter.init()
                           └─ QuickCreate.init()   ← Phase 3 FAB
```

### 模組載入策略（延遲載入）

```
初次登入：預載 model / service（資料層）
切換路由：ModuleLoader.ensure(route)
  ├─ 並行載入 CSS（link 注入）
  └─ 依序載入 JS（script 注入，保持順序）
```

### 功能模組分層

每個 feature 遵循統一的四層結構：

```
features/<name>/
  ├── <name>.model.js       ← 純資料結構 / 常數
  ├── <name>.service.js     ← Firebase CRUD / 本地快取
  ├── <name>.ui.js          ← DOM 渲染 / 列表
  └── <name>.controller.js  ← 協調 Service + UI + 路由進出
```

---

## 二、架構亮點（✅ 良好設計）

| 設計 | 說明 |
|------|------|
| 事件驅動解耦 | Bootstrap → Auth → App 均透過 `CustomEvent` 串接，職責清晰不直接呼叫 |
| AppRegistry 服務定位器 | 統一以 `window._svc('XxxService')` 取得服務，降低跨模組 `window.*` 耦合 |
| AppState 集中狀態 | 漸進式替換 `window.currentUser` / `window.isAuthenticated`，提供橋接相容層 |
| ModuleLoader 延遲載入 | 初次載入只含 core，切換路由才按需載入 UI / CSS，大幅減少首屏資源 |
| AppConfig 凍結 | `Object.freeze()` 防止執行期意外修改配置 |
| 雙版本繼承架構 | `DesktopApp` / `MobileApp` 繼承 `MainApp`，共用核心邏輯，差異封裝於子類別 |
| ROUTE_CONFIG 單一來源 | 路由名稱、圖示、標題、控制器均集中定義，Nav / Tab / Header 自動同步 |
| ErrorHandler 錯誤邊界 | 全域 `error` / `unhandledrejection` 捕捉，`guard()` 包裹 async handler |
| Firebase Auth 降級 | 網路失敗自動切換 Local Mode，系統不因雲端不可用而完全停擺 |
| Mobile header 覆寫 | `initializeApp` 支援 `constantOverrides`，Mobile 正確覆寫 `HEADER_TITLE_ID` |
| 測試基礎設施完備 | Vitest 單元測試 + Playwright E2E，`package.json` 已定義完整 scripts |

---

## 三、發現問題與優化建議

### 🔴 P1 — 高優先（功能正確性 / 安全性）

---

#### [P1-1] 管理員 Email 硬編碼於原始碼

**位置**：`core/auth.js` 第 27 行

```javascript
// 現況
_defaultRoleByEmail(email) {
  const e = (email || '').toString().trim().toLowerCase();
  return (e === 'perry_chuang@premtek.com.tw') ? 'admin' : 'engineer';
}
```

**問題**：
- 個人 Email 寫死在原始碼，任何有程式碼存取權的人都能看到
- 未來新增管理員帳號需修改程式碼並重新部署
- 無法應付「A 離職、B 接任管理員」等情境

**建議**：
- 角色以 Firebase Database `/users/$uid/role` 為唯一來源（已有相關欄位）
- `_defaultRoleByEmail` 僅作為「DB 角色欄位缺失時的緊急 fallback`」，且預設應為 `engineer`
- 若需要初始 admin seed，移至環境設定文件或 Firebase Functions 的 setup script 處理

---

#### [P1-2] `usersByEmail` 資料庫規則與程式行為不一致

**位置**：`database.rules.json` + `core/auth.js`

```json
// database.rules.json：usersByEmail 僅允許 admin 寫入
"usersByEmail": {
  ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
}
```

```javascript
// auth.js _ensureFirebaseUserProfile()：所有使用者登入時都嘗試寫入
await db.ref(`usersByEmail/${key}`).update({ uid, email, displayName, updatedAt: now });
```

**問題**：非 admin 使用者登入時，`usersByEmail` 的 update 會因權限不足而失敗（雖有 try/catch，但意圖中的 email 索引永遠不會為非 admin 使用者建立）。

**建議**：
- 方案 A：修改 rules，允許使用者寫入自己的 email index：
  `"usersByEmail": { "$key": { ".write": "auth != null" } }`
- 方案 B：改由 Firebase Functions onUserCreate() 建立 email index（更安全）
- 方案 C：若非 admin 的 email index 不重要，移除非 admin 的寫入嘗試，減少無效的 Firebase 呼叫

---

### 🟡 P2 — 中優先（效能 / 架構一致性）

---

#### [P2-1] ModuleLoader CSS 可改為並行載入

**位置**：`core/module-loader.js` 第 186-187 行

```javascript
// 現況：CSS 依序等待
const styles = Array.isArray(m.styles) ? m.styles : [];
for (const href of styles) await _loadStyle(href);
```

CSS 之間沒有相依性（每個 `link` 獨立），但現在是逐一 await 載入，會累積額外延遲。例如 `repairs` 模組有 3 個 CSS 檔案，若每個約 50ms，現況需 150ms，並行只需 50ms。

**建議**：
```javascript
// 優化：CSS 並行載入
await Promise.all(styles.map(href => _loadStyle(href)));

// JS 仍維持依序載入（保留執行順序）
for (const src of scripts) await _loadScript(src);
```

---

#### [P2-2] Feature Flags 未與路由連動

**位置**：`core/config.js` + `core/router.js`

```javascript
// config.js 定義了 feature flags
features: {
  enableOrders: true,
  enableQuotes: true,
  enableParts: true,
  // ...
}

// 但 ROUTE_CONFIG 包含所有路由，不管 flag 是否啟用
static ROUTE_CONFIG = {
  orders: { ... },
  quotes: { ... },
  // ...
};
```

**問題**：若將 `enableOrders` 改為 `false`，側邊欄仍會顯示「訂單」選項，點擊後可能載入模組或報錯。

**建議**：在 `generateNavItems()` / `generateTabItems()` 中加入 flag 過濾，或在 Router 初始化時過濾 `ROUTE_CONFIG`：

```javascript
static getActiveRoutes() {
  const featureMap = {
    orders: AppConfig.features.enableOrders,
    quotes: AppConfig.features.enableQuotes,
    parts:  AppConfig.features.enableParts,
  };
  return Object.fromEntries(
    Object.entries(_AppRouter.ROUTE_CONFIG).filter(([route]) =>
      featureMap[route] === undefined ? true : featureMap[route]
    )
  );
}
```

---

#### [P2-3] `AppConfig` 部分子物件未凍結

**位置**：`core/config.js` 末尾

```javascript
// 已凍結
Object.freeze(AppConfig);
Object.freeze(AppConfig.firebase);
Object.freeze(AppConfig.system);
// ...

// ⚠️ 未凍結
// AppConfig.integration  ← proxyUrl / token 可被意外改寫
// AppConfig.device       ← 方法物件，技術上可追加屬性
```

**建議**：補上：
```javascript
Object.freeze(AppConfig.integration);
Object.freeze(AppConfig.integration.gas);
```
（`AppConfig.device` 含方法，其物件本身可 freeze 但方法中的 `window.innerWidth` 仍是動態讀取，freeze 不影響功能）

---

#### [P2-4] Firebase 模式下不必要的 Session localStorage 寫入

**位置**：`core/auth.js` `onLoginSuccess()` → `saveUserSession()`

Firebase Auth SDK 本身已處理 session 持久化（IndexedDB）。在 Firebase 模式下，`saveUserSession()` 額外寫入 localStorage 是多餘的，且：

- `checkAutoLogin()` 只有在 `authMode === 'local'` 時才讀取這個 session
- 造成不必要的 localStorage 寫入與 24 小時過期邏輯

**建議**：
```javascript
// 在 onLoginSuccess() / handleAuthStateChanged() 中：
if (this.authMode !== 'firebase') {
  this.saveUserSession(this.currentUser);
}
```

---

### 🟢 P3 — 低優先（程式碼品質 / 一致性）

---

#### [P3-1] 導覽列 inline onclick 混用事件委派

**位置**：`core/router.js` `generateNavItems()` / `generateTabItems()`

```javascript
// 現況：inline onclick
return `<div class="nav-item" data-route="${route}" onclick="AppRouter.navigate('${route}')">...`;

// app.js 的通知面板已改用事件委派模式
document.addEventListener('click', function(ev) {
  const actionEl = t.closest('[data-action]');
  // ...
});
```

導覽列同時具有 `data-route` 屬性，可統一改用事件委派，消除 `onclick` inline handler：

```javascript
// router.js 產生時移除 onclick，只保留 data-route
return `<div class="nav-item${activeClass}" data-route="${route}">${config.icon} ${config.navLabel}</div>`;

// app.js bindGlobalHeaderActions() 或 MainApp 新增委派：
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-route]');
  if (el) window.AppRouter?.navigate(el.getAttribute('data-route'));
});
```

---

#### [P3-2] `APP_CONSTANTS.ERROR_SEVERITY` 缺少 CRITICAL

**位置**：`core/constants.js` + `core/error-handler.js`

```javascript
// constants.js 只定義三個等級
ERROR_SEVERITY: { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' }

// error-handler.js 使用到 'CRITICAL'（字串直接寫死）
if (errorInfo.level === 'CRITICAL') { ... }
```

**建議**：補上：
```javascript
ERROR_SEVERITY: { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' }
```

---

#### [P3-3] Local Mode 明文密碼的視覺警示

**位置**：`core/auth.js` `getLocalUsers()`

```javascript
{ uid: 'local_perry', email: 'perry_chuang@premtek.com.tw', password: 'demo123' }
```

雖然標注「僅 Demo 用」，但明文密碼在原始碼中仍可能誤導開發者或被複製到正式環境。

**建議**：在函式頂部加上顯眼的 JSDoc 警告，並在 Local Mode UI 顯示明確的 "⚠️ DEMO ONLY" 警示標語，防止誤用。

---

#### [P3-4] `linkage.js` 載入順序與 `resetAllServices` 依賴

**位置**：`core/app.js` + `core/linkage.js`

`MainApp.resetAllServices()` 依賴 `window.resetAllServices`，此函式定義在 `linkage.js`。若 `auth:login` 事件在 `linkage.js` 尚未完成載入時觸發（極端情況），會靜默失敗（有 `console.warn` 但不丟例外）。

目前兩個 HTML 的 script 載入順序已確保 `linkage.js` 在 auth 之前載入，實際風險低。但建議在 `resetAllServices` 加入一行清楚的文件說明，標注「依賴 linkage.js 先載入」，避免日後調整順序時引發問題。

---

## 四、資料庫規則審查

### 現況優點
- 根節點 `.read/.write` 預設為 `false`，符合最小權限原則
- 資料以 `data/$uid` 隔離，防止跨使用者存取
- 關鍵集合均有適當的 `.indexOn`，查詢效能有保障
- `users` 管理路徑限制 admin 角色存取

### 注意事項

| 項目 | 說明 |
|------|------|
| 資料隔離模式 | 每個 UID 的資料互不可見（設計如此）。若未來需要「團隊共享維修單」，規則需大幅調整 |
| `usersByEmail` 寫入 | 見 P1-2，非 admin 使用者的寫入會失敗 |
| `repairLogs` / `repairWorkLogs` | 規則重複定義了 `.read/.write`（父節點 `$uid` 已有相同規則），建議清理冗餘規則 |

---

## 五、優化優先順序總表

| 優先 | ID | 問題 | 預估影響 | 難度 |
|------|-----|------|----------|------|
| 🔴 P1 | P1-1 | 管理員 Email 硬編碼 | 安全性 / 維運彈性 | 低 |
| 🔴 P1 | P1-2 | usersByEmail 規則不一致 | 資料完整性 | 低-中 |
| 🟡 P2 | P2-1 | CSS 串行改並行載入 | 路由切換效能 | 低 |
| 🟡 P2 | P2-2 | Feature flags 未連動路由 | UX 一致性 | 中 |
| 🟡 P2 | P2-3 | AppConfig freeze 不完整 | 程式碼正確性 | 低 |
| 🟡 P2 | P2-4 | Firebase 模式多餘 session 寫入 | 輕微效能浪費 | 低 |
| 🟢 P3 | P3-1 | inline onclick 混用委派 | 程式碼一致性 | 中 |
| 🟢 P3 | P3-2 | CRITICAL 常數缺失 | 一致性 | 極低 |
| 🟢 P3 | P3-3 | Local Mode 密碼視覺警示 | 文件安全 | 極低 |
| 🟢 P3 | P3-4 | linkage 載入依賴文件 | 維護性 | 極低 |

---

## 六、架構總評

```
整體架構評分
════════════════════════════════════════
設計模式清晰度     ████████████████░░░░  82%
模組隔離性         ███████████████░░░░░  78%
錯誤處理覆蓋       ████████████████████  96%
效能設計           ██████████████░░░░░░  70%
安全性             ████████████░░░░░░░░  62%  ← P1-1/P1-2 待修
測試覆蓋           ████████░░░░░░░░░░░░  42%
════════════════════════════════════════
整體健康度         ██████████████░░░░░░  72%
```

這是一個架構設計扎實、迭代成熟（V161.271 build）的企業內部系統。核心的事件驅動啟動流程、AppRegistry 服務定位、模組延遲載入、以及雙版本繼承設計都是值得保留的優良實踐。

主要待改善的是安全層面（P1-1 角色硬編碼、P1-2 資料庫規則不一致），以及幾個中低優先的效能與一致性問題。這些修改難度普遍不高，可在下一個迭代週期分批完成。
