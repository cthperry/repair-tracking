# RepairTracking V161.275 — 架構重新驗證報告

**版本**：V161.275 (2026-02-27)
**審查類型**：優化後完整重新驗證
**審查範圍**：core/ × 9、features/ × 12 services、HTML 入口 × 2、database.rules.json
**前次審查**：ARCH_REVIEW_V161.271.md（執行 6 項優化）

---

## 一、本次優化執行驗證（P1/P2/P3 六項）

本節確認前次提議的所有優化均已正確落地。

### ✅ P3-2：ERROR_SEVERITY 補齊 CRITICAL

**檔案**：`core/constants.js`

```js
ERROR_SEVERITY: {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'   // ← 新增
}
```

`error-handler.js` 內 `severity === APP_CONSTANTS.ERROR_SEVERITY.CRITICAL` 的分支不再有 undefined 比對問題。**✓ 正確**

---

### ✅ P2-3：AppConfig 新增 auth 區塊 + 補齊 Object.freeze

**檔案**：`core/config.js`

```js
auth: {
  adminEmails: ['perry_chuang@premtek.com.tw'],
  defaultRole: 'engineer'
},
// ...
Object.freeze(AppConfig.auth);
Object.freeze(AppConfig.integration);
Object.freeze(AppConfig.integration.gas);
```

`AppConfig.auth`、`AppConfig.integration`、`AppConfig.integration.gas` 三個子物件均已凍結，與其他已凍結子物件（`AppConfig.features`、`AppConfig.colors` 等）一致。**✓ 正確**

---

### ✅ P2-1：CSS 並行載入

**檔案**：`core/module-loader.js`

```js
// 修改後
await Promise.all(styles.map(href => _loadStyle(href)));  // CSS 並行
for (const src of scripts) await _loadScript(src);         // JS 保持循序（order matters）
```

repairs 模組有 3 個 CSS 檔案，並行載入可縮短約 100–200 ms 初始化時間。JS 仍循序（依賴順序）。**✓ 正確**

---

### ✅ P1-1：admin email 移至 config，不再 hardcode

**檔案**：`core/auth.js` — `_defaultRoleByEmail()`

```js
_defaultRoleByEmail(email) {
  const e = (email || '').toString().trim().toLowerCase();
  try {
    const adminEmails = Array.isArray(AppConfig?.auth?.adminEmails)
      ? AppConfig.auth.adminEmails : [];
    const defaultRole = AppConfig?.auth?.defaultRole || 'engineer';
    return adminEmails.some(ae => ae.toLowerCase() === e) ? 'admin' : defaultRole;
  } catch (_) { return 'engineer'; }
}
```

後續新增管理員只需修改 `config.js`，不需碰業務邏輯。**✓ 正確**

---

### ✅ P2-4：Firebase 模式下不重複寫入 localStorage session

**檔案**：`core/auth.js` — `onLoginSuccess()` + `handleAuthStateChanged()`

```js
// onLoginSuccess：只在非 Firebase 模式寫入
if (this.authMode !== 'firebase') {
  this.saveUserSession(this.currentUser);
}

// handleAuthStateChanged：移除多餘的 saveUserSession 呼叫
this.isAuthenticated = true;
// 觸發登入成功（Session 寫入已移至 onLoginSuccess，由 authMode 決定是否需要）
await this.onLoginSuccess();
```

Firebase SDK 自行管理 IndexedDB persistence；移除後可避免每次 `onAuthStateChanged` 觸發都覆寫 localStorage。**✓ 正確**

---

### ✅ P1-2：database.rules.json 修正 usersByEmail + 移除冗餘規則

**修正 1 — usersByEmail 允許使用者自寫自己 email key：**

```json
"usersByEmail": {
  ".read": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'",
  "$emailKey": {
    ".read": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'",
    ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() == 'admin' || !data.exists() || data.child('uid').val() == auth.uid)"
  }
}
```

**修正 2 — 移除 repairLogs / repairWorkLogs 的冗餘規則：**

父節點 `$uid` 已有 `.read`/`.write`，子節點只需保留 `.indexOn`：

```json
"repairLogs":     { "$rid": { ".indexOn": ["tsStart", "createdAt"] } },
"repairWorkLogs": { "$rid": { ".indexOn": ["visitDate", "createdAt"] } }
```

規則更簡潔，不再有「子規則覆寫父規則」的歧義。**✓ 正確**

---

## 二、新發現問題（重新驗證期間）

以下為本輪深入審查新發現的問題，**前次報告未涵蓋**。

---

### 🔴 N-1（P1）：`getUser()` 方法不存在於 AuthSystem

**影響檔案**：
- `features/orders/orders.service.js:516`
- `features/quotes/quotes.service.js:734`

**問題**：`AuthSystem` 類只有 `getCurrentUser()` 方法（`auth.js:975`），沒有 `getUser()` 方法。由於使用了可選鏈 `?.`，呼叫靜默回傳 `undefined`，導致 `owner` 欄位永遠存為 `null`，建立訂單／報價時無法記錄操作者。

```js
// ❌ 錯誤（getUser 不存在）
const owner = window.AuthSystem?.getUser?.() || null;

// ✅ 修正
const owner = window.AuthSystem?.getCurrentUser?.() || null;
```

**注意**：`quotes.service.js:477`（`_getActor()` 內）雖然也呼叫 `getUser()`，但有多層 fallback：
```js
window.AuthSystem?.getUser?.() || window.currentUser || window.AuthSystem?.getCurrentUser?.()
```
此處實際上會透過 `window.currentUser` fallback 取得使用者，功能正常，但邏輯不一致，建議清理。

---

### 🟡 N-2（P2）：`UIMode.FULL_ROUTES` 缺少 `analytics` 路由

**檔案**：`core/ui-mode.js:18`

```js
// 現況：13 個路由（缺 analytics）
const FULL_ROUTES = ['dashboard', 'repairs', 'machines', 'maintenance',
  'customers', 'parts', 'quotes', 'orders', 'kb', 'sops', 'weekly',
  'guide', 'settings'];

// ROUTE_CONFIG 有 14 個路由（含 analytics）
// router.js 第 21 行：analytics: { icon: '📈', title: '分析', ... }
```

**影響**：Standard 模式下，`UIMode.isRouteAllowed('analytics')` 回傳 `false`，analytics 路由永遠被 Simple Mode 邏輯過濾掉。但 `ROUTE_CONFIG` 明確定義了分析模組，導致路由設定與模式設定不一致。

**修正**：
```js
const FULL_ROUTES = ['dashboard', 'repairs', 'machines', 'maintenance',
  'customers', 'parts', 'quotes', 'orders', 'analytics', 'kb', 'sops',
  'weekly', 'guide', 'settings'];
```

---

### 🟡 N-3（P2）：`repairs.service.js` AuthSystem 缺少可選鏈

**檔案**：`features/repairs/repairs.service.js:112`（init 方法）

```js
// ❌ 無可選鏈，AuthSystem 若未初始化則 throw
this.isFirebase = (window.AuthSystem.authMode === 'firebase' && typeof firebase !== 'undefined');

// 其他所有 Service 均使用安全寫法：
this.isFirebase = (window.AuthSystem?.authMode === 'firebase' && typeof firebase !== 'undefined');
```

在正常流程（Bootstrap → AuthSystem.init() → 事件觸發 Service init）下不會出問題，但若直接測試或有競態條件則會 `TypeError: Cannot read properties of undefined`。建議與其他 Service 保持一致。

---

### 🟢 N-4（P3，已自行修正，前次未列入）：customers.ui.js 靜態方法呼叫

**檔案**：`features/customers/customers.ui.js`（已含於本批 git diff）

前次已有人修正 `this.openRenameCompany()` → `CustomerUI.openRenameCompany()` 等三處，因為這些是 `static` 方法，在實例上呼叫會取得 `undefined`。此修正**已正確落地**，不需再處理。

---

## 三、既有未執行優化（前次報告已知，尚未實作）

| 編號 | 優先 | 說明 | 狀態 |
|------|------|------|------|
| P3-1 | P3  | Router nav items 使用 inline `onclick="AppRouter.navigate(...)"` → 應改 event delegation | **未實作** |
| P2-2 | P2  | Feature flags（`enableOrders`、`enableQuotes`）未連接 Router nav 顯示 | **未實作** |

---

## 四、已知預提交變更（非本輪優化）

以下為 git diff 中顯示的其他未提交變更，已逐一確認：

| 檔案 | 變更摘要 | 評估 |
|------|---------|------|
| `V161_Desktop.html` | 新增 `mobile-safe-tap.js` script 引入 | ✅ 正常，行動裝置點擊事件修補 |
| `V161_Mobile.html` | 同上 | ✅ 正常 |
| `core/shared.css` | 補充若干共用樣式 | ✅ 無架構影響 |
| `features/settings/settings.service.js` | Firebase 超時 4500 ms + `Promise.race()` + `.info/connected` | ✅ 改善離線可用性 |
| `features/customers/customers.ui.js` | 靜態方法呼叫修正（見 N-4） | ✅ 已修正 |
| `core/config.js` | `uploadUrl`/`proxyUrl`/`token` 移除敏感值 + BUILD_NUMBER 更新 | ✅ 安全性改善 |

---

## 五、架構健康度評估（更新）

| 面向 | 前次分數 | 本次分數 | 說明 |
|------|---------|---------|------|
| 啟動流程 | 9/10 | 9/10 | 無變化 |
| 模組化 / Service Locator | 8/10 | 8/10 | 無變化 |
| 安全性（Auth / DB Rules） | 6/10 | **8/10** | P1-1, P1-2, P2-4 修正 |
| 效能（載入） | 7/10 | **8/10** | P2-1 CSS 並行 |
| 設定管理 | 7/10 | **9/10** | P2-3 config 集中 + freeze |
| 錯誤處理 | 7/10 | **8/10** | P3-2 CRITICAL 補齊 |
| 路由一致性 | 7/10 | 7/10 | N-2 FULL_ROUTES 缺 analytics 尚未修正 |
| 資料完整性 | 7/10 | 7/10 | N-1 getUser() bug 尚未修正 |
| **總體** | **7.4/10** | **8.0/10** | 顯著改善 |

---

## 六、建議修復優先順序

```
🔴 立即修復（本輪）
  N-1  orders.service.js:516  getUser() → getCurrentUser()
  N-1  quotes.service.js:734  getUser() → getCurrentUser()

🟡 下輪迭代
  N-2  ui-mode.js FULL_ROUTES 補上 'analytics'
  N-3  repairs.service.js:112 補上可選鏈 ?.
  N-1  quotes.service.js:477 _getActor() 清理 getUser() fallback 冗余邏輯

🟢 技術債（未來排期）
  P3-1 Router inline onclick → event delegation
  P2-2 Feature flags 連接 Router nav
```

---

## 七、附錄：本輪驗證執行命令摘要

```bash
# 確認 6 項優化均已落地
grep "CRITICAL" core/constants.js             # P3-2 ✓
grep "auth:" core/config.js                   # P2-3 ✓
grep "Promise.all" core/module-loader.js      # P2-1 ✓
grep "adminEmails" core/auth.js               # P1-1 ✓
grep "authMode !== 'firebase'" core/auth.js   # P2-4 ✓
grep "data.child('uid')" database.rules.json  # P1-2 ✓

# 確認 AppRegistry 完整性（12 services 全部已 register）
grep -r "AppRegistry.register" features/      # 12 ✓

# 確認 getUser/getCurrentUser 問題
grep -n "getUser\b" features/orders/orders.service.js    # :516
grep -n "getUser\b" features/quotes/quotes.service.js    # :477, :734
grep -n "getCurrentUser" core/auth.js                    # :975 (唯一實作)

# 確認路由不一致
grep "FULL_ROUTES" core/ui-mode.js   # 13 routes, 缺 analytics
grep "analytics" core/router.js      # 確認存在於 ROUTE_CONFIG
```

---

*報告產出時間：2026-02-27 | 審查者：Claude (Cowork)*
