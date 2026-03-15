# VALIDATION V161.328

## 已驗證
- `node --check core/router.js`
- `node --check core/module-loader.js`
- `node --check features/dashboard/dashboard.ui.js`
- `node --check features/analytics/analytics.controller.js`
- `node --check features/analytics/analytics.ui.js`
- `node --check features/machines/machines.ui.js`
- `node --check features/repairs/repairs.ui.js`
- `node --check features/repairs/repairs.ui-forms.js`
- `node --check features/settings/settings.ui.js`

## 目視檢查重點
- 導航列不再出現機台保養。
- Desktop / Mobile 預載入不再引用 maintenance model/service。
- Dashboard / Analytics / Notifications / Machines / Repairs / Settings 不再顯示保養資訊與入口。
- `database.rules.json` 不再包含 `data/<uid>/maintenance` 索引。
