# CHANGELOG — V161.246

日期：2026-02-10（Asia/Taipei）

## Phase 2：Dashboard + Notification Center

### 新增
- `dashboard` 儀表板首頁（總覽/待辦/通知）
  - `features/dashboard/dashboard.controller.js`
  - `features/dashboard/dashboard.ui.js`
  - `features/dashboard/dashboard.css`
- 通知/提醒中心（純前端彙算；已讀狀態存 localStorage）
  - `features/notifications/notification-center.js`

### 整合與設定
- `core/router.js`：新增 `dashboard` 路由並設為預設（登入後進入）
- `core/module-loader.js`：加入 dashboard manifest（CSS/JS 延後載入）
- `core/theme.js`：新增 dashboard accent
- `core/ui-mode.js`：FULL/SIMPLE routes 加入 `dashboard`
- `V161_Desktop.html` / `V161_Mobile.html`：載入 NotificationCenter
- `core/app.js`：MainApp.init() 完成預設路由後啟動 NotificationCenter.init()

### Phase 1 相容性修正
- Dashboard/NotificationCenter 僅透過 `AppRegistry` / `window._svc()` 取得 service，不使用 `window[ServiceName]` fallback。
