# V161.322 變更紀錄

## 版本資訊
- BUILD_NUMBER：321 → 322
- 日期：2026-03-14（Asia/Taipei）

## 本版重點
1. Repairs 第二波整體收斂：把頁首 shell、KPI、空狀態與列表控制列回收進共用 grammar。
2. Repairs 篩選面板 / 主 modal 改走 `hidden + helper`，不再直接以 `style.display` 控制主要頁面狀態。
3. Settings 對齊 Weekly 目前真實規格，移除過期 hint，並把 admin 新增列切回結構化 hidden 狀態。

## 影響檔案
- `core/config.js`
- `features/repairs/repairs.ui.js`
- `features/repairs/repairs.css`
- `features/settings/settings.ui.js`
- `features/settings/settings.css`
- `docs/README.md`
- `docs/CHANGELOG.md`
- `docs/HANDOFF.md`
- `docs/SITE_CONVERGENCE_PLAN_V161.322.md`
- `docs/VALIDATION_V161.322_REPAIRS_SETTINGS_CONVERGENCE.md`

## 根因
- Repairs 的頁面 grammar 雖已部分收斂，但列表控制列仍在 `renderList()` / `renderListShell()` 內重複存在，造成後續任何一個控制項調整都要維護兩份 template。
- Repairs / Settings 仍持續用 `style.display` 管理主要區塊狀態，導致頁面結構與顯示狀態耦合。
- Settings 內週報說明文案仍殘留舊 Weekly 結構，與目前正式規格不一致。

## 驗證
- `node --check core/config.js`
- `node --check features/repairs/repairs.ui.js`
- `node --check features/settings/settings.ui.js`
