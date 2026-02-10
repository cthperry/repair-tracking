# V161.156（MNT-2）變更摘要

日期：2026-01-08

## 機台保養（Maintenance）

### 設備資料欄位擴充
- 新增：負責人 Email（ownerEmail）
- 新增：安裝日期（installDate）。若設備尚無任何保養紀錄，會以安裝日期作為週期起算基準計算下次到期日。
- 新增：提醒天數（remindDays）。設備可自訂提醒天數；留白則使用系統預設提醒天數（defaultRemindDays）。

### 提醒設定（Dashboard 設定區）
- 新增：預設提醒天數（defaultRemindDays，預設 3/7）
- 新增：是否優先使用設備負責人 Email（useOwnerEmail）
- 新增：CC（emailCc）
- Email 提醒：依收件人分組產生多個 mailto 連結，並提供可複製提醒內容。

### 報表與匯出
- 報表新增：依位置統計、依負責人統計、最近 6 個月保養次數趨勢。
- Excel 匯出：設備清單新增欄位（負責Email/安裝日期/提醒天數/基準日期），並包含統計與趨勢表。
- CSV 匯出：同上，並加入 UTF-8 BOM 以避免 Excel 亂碼。


## V161.166 (2026-01-10)
- 報價單：新增「輸出 PDF」功能（套用母版 PDF：assets/quote/quote_template.pdf），支援下載 PDF。
- 內嵌中文字型：assets/fonts/bsmi00lp.ttf（Arphic）。


## V161.236 (2026-02-08)
### Phase 1 改善（持續收斂）
- KB：移除 inline onclick/oninput/onkeydown，改為事件委派（data-action）並集中在 KBUI._bindDelegation。
- Orders/Quotes/Parts/Machines/Maintenance：UI 層統一改用 _svc / AppRegistry 取用 Service（避免直接 window.XxxService）。
- core/ui-mode：initFromSettings 改為 registry-first 取得 SettingsService（避免直接 window.SettingsService）。
## V161.237 (2026-02-08)
### Phase 1 改善（持續收斂）
- Repairs/Settings：UI 與表單層 Service 存取統一改為 registry-first（_getSvc → window._svc），降低 window.*Service 直接耦合。
- Weekly：移除 inline onclick/oninput/onchange，改事件委派（data-action），並統一 Service 存取走 registry-first。
- WorkLog：移除 inline onclick，改事件委派（data-action），並統一 Service 存取走 registry-first。
- 清理：移除無引用備份檔 features/settings/settings.ui.js.orig。

## V161.239（2026-02-09）
- Phase 1A：移除 Quotes/Machines 的 top-level `_svc` 重複宣告，統一改用 `window._svc(...)`；修正 Orders UI 內誤寫的 `window.window..._svc`；移除多餘備份檔 `orders.ui.js.bak`。
- Phase 1B：Repairs（含 forms/detail）全面移除 inline `on*` 事件，改為 `data-action` + 委派事件（click/input/change/keydown/submit）；`RepairUI.sync` 支援從委派事件帶入 event。

## V161.240（2026-02-09）
- Phase 1A：全面移除 core/features 內對 `window.<X>Service` 的直接讀取（改用 `window._svc(...)` / `AppRegistry.get(...)`）。
- Phase 1A：移除各 Service 檔案的 `window.<X>Service = ...` 全域輸出（改僅 `AppRegistry.register`），降低全域污染。
- Phase 1A：Controllers 全面收斂為只呼叫 `AppRegistry.ensureReady(...)`，不再自行 `svc.init()`（移除 fallback 手動 init）。
- Weekly：reload 時一併 ensureReady Settings/Repair/WorkLog/Weekly，避免週報內容依賴「先開過 Repairs/WorkLogs」。
- core/user-admin：UserAdminService 改註冊到 AppRegistry（移除 window 全域輸出）。

## V161.241（2026-02-09）
- Phase 1A（更嚴格收斂）：`AppRegistry.get/has` 移除 window fallback（Service 必須由各 service 檔自行 `AppRegistry.register`）。
- Phase 1A：移除 `window[name]` 動態 fallback（core/global-search、core/utils、orders.service、kb.service），Service 取得統一走 `window._svc(...)` / `AppRegistry.get(...)`。
- MachinesUI：MaintenanceService 未 ready 時改走 `AppRegistry.ensureReady`，UI 不再直接呼叫 `svc.init()`（避免分散初始化）。
- CustomersService：renameCompanyEverywhere 先集中 `ensureReady(Repair/Quote/Order)`，移除個別手動 `init()`。

