## V161.352（2026-03-15）
- 補上 `window.CustomerUI / window.QuotesUI / window.OrdersUI / window.KBUI` 全域 API 契約，修正跨模組 detail/view 開啟與公司更名同步呼叫失敗。
- `CustomerUI / QuotesUI / OrdersUI` 同步註冊到 `AppRegistry`。
- `BUILD_NUMBER`：`351` → `352`。

## V161.333（2026-03-14）

- Repairs 首屏 root cause 改為直接做結構性修正：新增 `repairs-main-stack`，把 KPI 區塊與列表區塊放回單一穩定堆疊。
- `features/repairs/repairs.css`：`#repairs-stats` 改回明確 grid，不再讓模組本地 `display:flex` 與 shared `ops-kpi` grammar 互相覆蓋。
- Repairs 列表 header / 搜尋 / cards 補上 `min-width: 0` 與桌機欄寬約束，降低桌機首屏被壓成異常垂直排列的風險。
- BUILD_NUMBER：`332` → `333`。

## V161.332（2026-03-14）

- 修正維修管理 KPI 區塊的雙層 grid 結構，解除桌機版統計卡垂直堆疊問題。
- `features/repairs/repairs.ui.js`：`renderStats()` 改為直接輸出卡片，避免 `#repairs-stats.ops-kpi-grid` 內再包一層 `ops-kpi-grid`。
- BUILD_NUMBER：`331` → `332`。

## V161.332（2026-03-14）
- 修正維修管理列表空白問題：Repair card renderer 直接讀取未正規化的狀態 / 優先級設定，遇到舊資料或空值時會在卡片渲染期中斷。
- `RepairUI` 新增 `_getRepairStatusMeta()`、`_getRepairPriorityMeta()`、`_toRepairCardViewModel()`，先將原始 repair 轉成 card view model，再交由列表渲染。
- `renderCardsIncrementally()` 改為逐卡片錯誤隔離；單筆資料異常僅顯示校正提示卡，不再讓整個維修管理列表全空。
- BUILD_NUMBER：`330` → `332`。

## V161.330（2026-03-14）
- 修正 Parts 模組載入時的 `containerId is not defined` 致命錯誤，零件管理頁恢復可正常開啟。
- PartsUI 新增 `_containerId / _boundContainerId` 掛載狀態，將 DOM 綁定從 render 區域變數改為實例生命週期管理。
- 新增 `_ensureDomHandlers()`，update 週期僅在已掛載容器存在時才嘗試補綁 delegated handlers，避免未定義變數再次造成全域錯誤。
- BUILD_NUMBER：`329` → `330`。

## V161.329（2026-03-14）
- 導入全站共用 `UI.chipHTML()`，建立 Repairs / Parts / Machines 共用的 chip tone grammar。
- `core/ui.css` 新增 `.chip.tone-*`、`.enterprise-detail-chip.tone-*` 與 `.stat-card.tone-*`，讓高頻狀態 chips 與 summary stats 改走單一視覺系統。
- Parts quick filter chips 與 summary stats 不再依賴分散的 inline `--chip-color` / `--accent`。
- Machines 的序號清單、維修履歷與流程摘要 chips 改走共用 helper；Repairs 的 scope / status / history preset / quick summary 也同步收斂。
- BUILD_NUMBER：`328` → `329`。

## V161.327（2026-03-14）
- Machines detail 改為 enterprise detail hero / overview / history 結構，單機序號頁正式與全站 detail surface 對齊。
- Machines 高頻互動改走 delegated handlers，序號選取、搜尋、重新整理、維修履歷與保養動作不再依賴 inline onclick。
- Parts catalog / tracker / batch editor 的 section head 改用 `UI.enterpriseSectionHeaderHTML()`，統一表單與批次 modal 的資訊層級。
- BUILD_NUMBER：`326` → `327`。

## V161.325（2026-03-14）
- 以同一組 team 規格收斂 enterprise detail surface：`core/ui.js` 新增共用 detail helper（stat / overview item / note），不再讓 Repairs / Customers 各自拼接類似區塊。
- Repairs 詳情頁改吃 enterprise detail grammar，hero / overview / command bar 與 history tab 切換一起收斂；history tab 改走 `hidden`，不再依賴 `style.display`。
- Customers 詳情頁同步套用共用 detail helper，讓客戶主檔與維修主檔的資訊層級、排版節奏與視覺語言一致。
- `core/ui.css` 補上 enterprise detail tone-info 與 surface 細節樣式，讓商務、維護與狀態訊號的視覺層級更完整。

## V161.324（2026-03-14）

- Customers 詳情 modal 改採 enterprise detail hero / overview board / command footer，將公司、聯絡方式、維護資訊與備註重整為同一套閱讀層級。
- Parts 首屏與 modal 互動改為 data-action + delegated handlers，移除高頻 toolbar / filters / summary / batch modal 內聯事件依賴，降低 UI 與字串模板耦合。
- Parts KPI 卡片補上更明顯的狀態 accent 與 hover 節奏，讓 tracker / catalog 首屏更接近全站企業級 surface。
- 新增 `docs/CHANGELOG_V161.324.md`、`docs/VALIDATION_V161.324_DETAIL_SURFACE_AND_PARTS_DELEGATION.md`。

## V161.323（2026-03-14）
- Customers + Parts 納入同一輪 team 收斂，統一頁面 shell / 篩選面板 / empty state / modal 顯示規則。
- Customers KPI 改走共用 `ops-kpi` 語法，Parts summary / empty state / toolbar 對齊共用 page grammar。
- Customers / Parts 的 filters 與 modal 從 `style.display` 改為 `hidden` 控制，降低樣式與行為耦合。
- 新增 `docs/SITE_CONVERGENCE_PLAN_V161.323.md`、`docs/VALIDATION_V161.323_CUSTOMERS_PARTS_CONVERGENCE.md`、`docs/CHANGELOG_V161.323.md`。

## V161.322（2026-03-14）
- Repairs 第二波收斂：模組首頁改走共用 `ops` shell / toolbar / KPI grammar，列表控制列抽成 `renderListHeader()`，修掉 `renderList` / `renderListShell` 長期重複維護問題。
- Repairs 的篩選面板與主 modal 改用 `hidden + helper` 管理顯示狀態，將 UI 開關從 scattered `style.display` 收回單一入口。
- Repairs 空狀態改走 `UI.emptyStateHTML()`，避免維修模組再維持一套獨立空狀態字串。
- Settings 對齊 Weekly 新規格文案，並將 admin 新增使用者列改用 `hidden` 控制，讓設定頁也回到一致的頁面狀態管理方式。

## V161.321（2026-03-14）
- 啟動全站第一波整體收斂：建立共用 `ops` page grammar（module shell / toolbar / KPI / panel / empty state）。
- `core/ui.js` 新增 `UI.emptyStateHTML()`，將空狀態從各模組散落字串收斂為共用 helper。
- Maintenance / Machines 首批導入共用語法，並同步降低頁面層 inline style 與首屏結構差異。
- 新增 `docs/SITE_CONVERGENCE_PLAN_V161.321.md`，將後續全站收斂順序、模組優先級與治理方向正式寫回文件。

## V161.320（2026-03-14）
- 週報標題正式固定為 `本週案件總覽`，移除 `（依更新日）` / `（依建立日）` 這類 basis 說明文字。
- 根因修正位於 `WeeklyService.getThisWeekRepairsText()`：先前把資料篩選 basis 直接拼進標題，讓系統內部判定資訊外露到閱讀層。
- 保留 basis 作為案件集合篩選規則，但不再讓它污染週報閱讀標題。

## V161.319（2026-03-14）
- 週報取消摘要統計段落，改為單一「本週案件總覽」輸出，避免登入者自己的週報再重複顯示本週件數、新增、更新、結案等統計。
- 週報案件明細移除「負責 / 優先 / 建立 / 更新」基本資訊列；根因是週報本來就以登入者 own repairs 為來源，這些欄位屬於重複資訊，不應再次在明細區輸出。
- `WeeklyService` 新增文字換行排版器，將長篇 `content` / work log 轉成可閱讀的多行 `本週處置` 區塊，避免單行過長。
- `core/config.js` 新增 `weekly.caseDisplay` 排版設定，將摘要顯示、日期列顯示與本週處置換行寬度集中管理。

# 變更紀錄（最新在前）

## V161.317 - 2026-03-14

### 本版重點
- Weekly 週報改為「單一案件總覽」輸出，不再分開重複列出「本週新增案件」與「本週結案案件」。
- 結案資訊保留在摘要統計，不再用獨立案件段落強調，避免同一案例在週報內重複出現。
- Weekly 輸出正式改走 view model，輸出層不再直接持有 `repairNo` / `id` 等 Repair domain 原始欄位。

### 修正說明
- 根因：Weekly 先前同時以 `newRows`、`closedRows`、`reportRows` 三組原始 repair 集合各自輸出詳細區塊，導致同一案件可能在同一份週報中重複出現 2～3 次。
- 修正：改為只保留 `reportRowsView` 作為唯一詳細輸出資料來源；`newRows` / `closedRows` 僅保留摘要統計用途。
- 影響範圍：`features/weekly/weekly.service.js`、`core/config.js`、`tests/helpers/loadScript.js`、`tests/unit/weekly.report-structure.spec.js`
- 驗證：以 VM 載入實際前端腳本驗證，確認週報只保留單一案件總覽段落，且詳細區不再暴露維修單號與案件 ID。


## V161.308（2026-03-13）
- 針對 SOP 詳情頁做企業級 detail convergence：改為 `hero → overview board → command bar → 主檔表單 / 版本支援板`，移除首屏長段教學文字與工具列分散資訊。
- 針對零件模組 editor modal 做企業級收斂：零件主檔與用料追蹤改為 `form-context-bar + 分段表單 + sticky footer`，批次編輯 modal 同步整理成正式單一流程。

## V161.307（2026-03-13）
- 移除訂單詳情 command bar 的說明文案，保留精簡操作列，避免首屏出現非必要教學文字。
- 從系統路由、模組載入、介面模式與快捷建立規則中完整移除「使用者指南」模組，清除導覽與死碼殘留。

## V161.303 - 2026-03-13

### 維修管理總覽企業級重設計
- 將維修詳情頁 `總覽` 改為正式的 overview board，集中呈現案件總覽、客戶與聯絡資訊、設備與機台資訊、收費與下單追蹤。
- 將狀態、優先級、負責人、建立/更新時間、維修天數、進度拉回同一個總覽層，避免舊版資訊分散在不同卡片。
- 將問題描述重構為 `問題描述與處理背景`，並把內部備註整合進主閱讀區。
- 移除右側重複的收費 / 下單狀態與其他資訊卡，降低資訊重複與實驗性版面。
- 版號推進至 `V161.303`，`BUILD_NUMBER = 303`。

## V161.302 - 2026-03-13

### 企業級表單系統第二波收斂
- 將 Repair / Quote / Order / WorkLog / Customer 主要表單補上統一的 `form-context-bar`，讓模式、關鍵狀態、客戶/單號與表單用途在首屏即可判讀。
- 將 Repair / Quote / Order / Customer 大型表單 modal 改為正式的 `header + scroll body + sticky footer` 結構，避免整個 dialog 一起捲動造成首屏欄位壓縮。
- 收斂 enterprise-form section 視覺層級，統一區塊陰影、邊框、留白與只讀欄位提示，降低實驗性排版感。
- 在維修單表單中將公司名稱與 Email 提升為全寬主欄位，讓桌機與手機的聯絡資訊閱讀順序更穩定。
- 修正「既有公司下新增聯絡人」沿用可選公司欄位元件的語意錯置，改為鎖定公司名稱顯示，不再出現不合理的下拉暗示。
- 版號推進至 `V161.302`，`BUILD_NUMBER = 302`。

## V161.301 - 2026-03-13

### 維修單收費 / 下單狀態根因修正
- 修正手機版編輯維修單時，`是否收費`、`客戶是否下單` 變更後未進入 RepairsUI 委派流程的根因問題。
- 將 Repairs 的 change / input 事件委派改為可通用轉發 `data-action` 對應 handler，避免再次因硬編碼白名單漏接導致表單局部失效。
- 在維修單 billing 模型中新增 `billing.notOrdered.stageCode`，把「未下單狀態」從單純原因拆成正式流程欄位。
- 新增未下單內建狀態：`待報價`、`請購中`、`客戶評估中`、`預算確認中`、`暫緩`、`其他`。
- 補齊未下單原因選項中的 `規格/內容待確認`，並同步更新編輯表單、詳情顯示與資料正規化。
- 版號推進至 `V161.301`，`BUILD_NUMBER = 301`。

## V161.300 - 2026-03-13

### 客戶表單補充資訊區版面根因修正
- 修正客戶 / 聯絡人表單右側補充說明在雙欄側邊欄配置下被擠壓截斷的問題。
- 將 customer form 從主欄 + 側欄，改為主資料段與補充資料段的垂直分層，避免次要說明文字受窄欄限制而破版。
- 狀態列改為可換行的 grid 版型，補充說明不再依附右對齊窄欄。
- 基本資訊欄位固定為：公司名稱全寬、聯絡人/電話同列、Email 全寬；桌機與手機切換規則同步收斂。
- 版號推進至 `V161.300`，`BUILD_NUMBER = 300`。

## V161.298 - 2026-03-13

### 客戶 / 聯絡人表單正式化收斂
- 將客戶 / 聯絡人 modal 從舊式 `button + data-action` 送出，改為真正的 `<form>` submit 結構，移除跨表單送出的特殊繞路。
- 客戶 / 聯絡人表單改用企業級 section、helper text、sticky footer 與欄位節奏，避免看起來像臨時後台或實驗稿。
- 新增聯絡人詳情頁的正式資訊區塊與維護時間顯示，讓公司、聯絡方式、備註與維修數分層更清楚。
- 客戶表單儲存前先套用 `CustomerModel.validate()`，將欄位錯誤直接標在表單上，不再只靠 service 丟字串錯誤。
- 版號推進至 `V161.298`，`BUILD_NUMBER = 298`。

## V161.297 - 2026-03-13

### 客戶管理聯絡人儲存根因修正
- 修正既有公司下新增聯絡人時，儲存按鈕無法送出的根因問題。
- 統一 `customers.ui.js` 與 `customers.ui-forms.js` 的公開 API 契約，避免事件委派找不到表單處理器。
- 建立 `customerUIFormsApi` 作為唯一穩定入口，新增/編輯/刪除/詳情全部走同一份表單 API。
- 版號推進至 `V161.297`，`BUILD_NUMBER = 297`。

## V161.296 - 2026-03-13

### 收斂
- 將 Quote / Order / WorkLog 的表單驗證提升為核心能力，新增 form summary 與欄位就地錯誤顯示。
- Quote / Order 項目列驗證改為結構化流程，錯誤直接標示在對應欄位，不再只靠 toast。
- WorkLog 改為真正的 `<form>` submit 流程，補齊 `name`、`required`、Enter 提交與 inline validation。

## V161.295 - 2026-03-13

### 修正
- 修正 Orders modal 的事件委派範圍：原本只接受 `.orders-module` 內事件，導致訂單明細 modal 內的 submit / click / input / change 沒有被攔截。
- 修正訂單明細表單按下「儲存」時可能退回原生 GET submit，網址被拼上 `status`、`receivedAt`、`itemsCount` 等 query string，並觸發整頁重載。
- 這次一併修正 modal 內的 `關閉`、`新增零件`、`移除零件`、欄位即時計算等事件可正確落入 OrdersUI 委派流程。

## V161.294 - 2026-03-13

### 修正
- 修正 AuthSystem 缺少 `_clearAuthNullGraceTimer()` 與 `_applyLoggedOutState()` 導致頁面初始化時直接拋出 `is not a function` 的嚴重錯誤。
- 補回 Firebase auth null grace period 所需的 timer 清理函式。
- 補回登入失效後的統一登出狀態收斂函式，避免重新整理頁面時進入紅底錯誤頁。

## V161.292 - 2026-03-13
- 啟動 Form System Audit 第一波，收斂 Repair / Quote / Order / WorkLog / SOP / Settings 主要表單。
- 新增 enterprise-form 規格，統一 section、label、help、radio、動作列。
- WorkLog 表單改為正式企業級版型，不再維持舊式局部客製外觀。
- Settings / SOP 表單同步補齊欄位層級與對齊規則。
- 詳見 `docs/CHANGELOG_V161.292.md`。

## V161.291 - 2026-03-13
- 收斂 Quote / Order 狀態 badge 規則，改由核心配置統一。
- 補 modal / sticky footer safe-area 與手機 full-screen 行為。
- 補 FAB 與 repair mobile actions 的底部避讓。
- WorkLog 卡片與手機按鈕版型再收斂。
- 詳見 `docs/CHANGELOG_V161.291.md`。

# CHANGELOG（最新索引）

## 目前版本
- 穩定基底：`V161.310`
- BUILD_NUMBER：`310`
- 日期：2026-03-13（Asia/Taipei）

## 本次收斂重點
- 補齊工程化文件基礎：`ARCHITECTURE.md`、`HANDOFF.md`、`DEPLOYMENT.md`、`FIREBASE_RULES.md`、`VERSION_POLICY.md`
- 補齊執行面文件：`UI_UX_GUIDELINE.md`、`DATA_MODEL.md`、`QA_CHECKLIST.md`
- 將版本推進至 `V161.290`，建立後續收斂基準

## 最新單版變更
- `CHANGELOG_V161.298.md`
- `CHANGELOG_V161.296.md`
- `CHANGELOG_V161.295.md`
- `CHANGELOG_V161.293.md`
- `CHANGELOG_V161.290.md`
- `CHANGELOG_V161.281.md`（含 281~289 歷程）

## 使用方式
- 要看「最新工程方向」：先看 `HANDOFF.md`
- 要看「目前系統結構」：看 `ARCHITECTURE.md`
- 要看「資料節點與欄位」：看 `DATA_MODEL.md`
- 要看「UI 收斂標準」：看 `UI_UX_GUIDELINE.md`
- 要看「驗收與回歸」：看 `QA_CHECKLIST.md`


## V161.293
- 修正訂單儲存可能誤觸發重新登入的問題，並補強儲存鎖與 Firebase Auth 穩定性。

## V161.299｜客戶 / 聯絡人表單可視區收斂
- 將客戶表單從縱向堆疊改為桌機雙欄 / 手機單欄結構。
- 精簡摘要區，讓公司 / 聯絡人 / 電話 / Email 回到首屏可視範圍。
- customer form dialog 改為 header / scroll body / sticky footer 正式分層。


## V161.304
- 根因修正維修詳情頁 `總覽` 舊 sidebar 殘留：`repairs.ui-forms.js` 已從 render tree 切除舊版 `repair-detail-side` 與 `repair-action-card`，不再讓新版 overview 與舊右欄並存。
- 將 `編輯 / 複製 / 刪除` 重構為獨立 `command bar`，將保養 / 報價訂單 / 零件 / SOP / 附件改為主內容底部 `support board`。
- 詳見 `docs/CHANGELOG_V161.304.md`。


## V161.305
- 根因修正商務狀態語意分散：將 Quote / Order / Repair Parts / Billing 未下單階段與原因，集中到 `core/config.js` 單一狀態字典管理。
- `orders.ui.js`、`parts.ui.js`、`repairs.ui.js`、`repairs.ui-forms.js` 改為透過 AppConfig 取得 badge、accent、終態判定與排序，不再各模組硬編碼各一套。
- 詳見 `docs/CHANGELOG_V161.305.md`。


## V161.306
- 根因修正 Quote / Order 明細資訊碎片化：`quotes.ui.js`、`orders.ui.js` 的 detail modal 改為固定 `hero → overview board → command bar → editable sections` 結構，不再把狀態、總額、關聯資訊拆散在 header、form-context 與首段欄位。
- `core/ui.css` 新增企業級 detail 共用元件，讓 Repair / Quote / Order 可逐步收斂成同一套主模組詳情語言。
- 詳見 `docs/CHANGELOG_V161.306.md`。


## V161.309
- 根因修正知識庫（KB）欄位契約漂移：`kb.ui.js` 由正式 form submit 接管儲存流程，並將 Failure / SOP / Case 的欄位名稱收斂到 `rootCause/fix`、`precautions`、`analysis/outcome` 等單一結構，不再讓 UI 用舊欄位別名各寫一套。
- 知識庫檢視 / 編輯 modal 改為 `hero → overview / command bar → 分段內容 / sticky footer` 結構，移除舊式長表單與重複說明，讓 KB 條目也回到企業級 detail / form 語言。
- 設定頁新增企業級 hero 與 command bar，並修正簡易模式提示仍提到已移除的「使用者指南」問題；相關說明已與實際路由能力對齊。
- 詳見 `docs/CHANGELOG_V161.309.md`。


## V161.310
- 目前程式碼尚無獨立 Billing 模組，因此本版先針對既有 `repairs.billing` domain 做企業級收斂，而不是用假模組遮掩現況。
- `core/config.js` 新增 `billingChargeable`、`billingOrderDecision` 與 `getBillingFlowMeta()`，讓 Repair / Dashboard / Analytics / Weekly 共用同一份收費與下單語意。
- Repair 詳情頁新增「請款 / 商務追蹤」support card；Dashboard 與 Analytics 新增 billing board，補齊判定總覽、流程節點、未下單狀態與原因分布。
- 詳見 `docs/CHANGELOG_V161.310.md`。

## V161.311
- 根因修正 Dashboard / Analytics 仍停留在零散 KPI 與卡片集合：新增主流程漏斗、交期監控、工程師負載、風險雷達與案件 Aging 結構，將管理層真正需要的決策視角拉回首頁與分析頁。
- `dashboard.ui.js` 新增主流程漏斗、交期監控與工程師負載板；`analytics.controller.js` / `analytics.ui.js` 則新增 funnel、risk、aging 與 stale repairs 聚合，不再讓使用者自行拼湊 KPI、billing 與交期資訊。
- 詳見 `docs/CHANGELOG_V161.311.md`。


## V161.312
- 週報輸出結構正式收斂：`weekly.service.js` 由單純案件條列改為固定段落順序，包含 `摘要 / 需要主管關注 / 本週新增案件 / 本週結案案件 / 進行中案件總覽`，讓主管閱讀節奏固定且可快速掃描。
- 單一案件摘要改為正式多行區塊，固定輸出 `標題行 / 基本資訊 / 問題 / 本週進度 / 零件 / 商務 / 報價 / 訂單`，不再讓週報案件內容東一塊西一塊。
- 週報中的商務資訊持續透過 `AppConfig.getBillingFlowMeta()` 統一輸出，避免週報、Dashboard、Analytics 使用不同語言。
- 詳見 `docs/CHANGELOG_V161.312.md`。


## V161.313（2026-03-14）
- 週報輸出邏輯改為固定輸出全部維修案件，不再以建立日或更新日過濾。
- 週報畫面移除建立日 / 更新日切換，避免輸出範圍與實際需求不一致。
- 設定頁將週報範圍改為唯讀說明，固定說明為全部維修案件輸出。


- V161.314：週報恢復以建立日／更新日產出當週案件，移除「需要主管關注」段落與案件區塊中的「報價 / 訂單」輸出。
