## V161.333 補充
- Repairs 首屏本輪不再只改 KPI 卡片輸出，而是把首屏 DOM 結構改成 `repairs-main-stack -> repairs-stats + repairs-content`。
- 根因判定更新：問題不是只有 `renderStats()` 內層 wrapper，而是 Repairs 模組仍殘留舊 flex shell，與新 shared layout grammar 疊加後造成首屏寬度計算不穩。
- `features/repairs/repairs.css` 已把 `repairs-stats` 改為單一 grid，並補上 `repairs-list-header / repairs-list-right / repairs-search / repairs-cards` 的 `min-width:0` 與桌機欄寬約束。
- 這版屬於結構性修正，不是用條件遮蔽；但目前仍只完成靜態 / DOM 驗證，尚未取得使用者實機確認。

## V161.332 補充
- 維修管理列表空白的根因已確認在 `renderRepairCard()` 直接讀取未正規化的 `statusConfig / priorityConfig`；若資料含空值或舊值，會在增量渲染期中斷。
- 後續 Repairs 列表卡片必須先走 `_toRepairCardViewModel()`，不要再讓渲染層直接碰原始狀態 / 優先級設定。
- `renderCardsIncrementally()` 已改為單筆錯誤隔離；之後若擴充卡片內容，也必須維持「單筆異常不可拖垮整個列表」的原則。

## V161.327 交接補充

- 本版重點：Machines detail 正式切到 enterprise detail surface，並同步把 Machines 的高頻互動改為 delegated handlers。
- Parts editor / tracker / batch modal 的 section head 已收回共用 `UI.enterpriseSectionHeaderHTML()`，後續若再調整欄位層級，可優先改共用 helper。
- 本版驗證文件：`docs/VALIDATION_V161.327_MACHINES_PARTS_SURFACE.md`

## V161.324 交接補充

- 本輪收斂主軸：Customers / Parts 首屏與互動狀態一起回到同一套 page grammar。
- 已進入全站第二波收斂：先處理 `Repairs + Settings`。
- Repairs 已把列表控制列抽成單一 helper，之後若再調整 scope / status / sort 結構，不需要同時改兩份 template。
- Repairs 篩選面板與主 modal 已改走 `hidden` 狀態管理；後續若再收斂其他 modal，可沿用同一做法。
- Settings 已對齊目前 Weekly 規格文案，並把 admin 建立列改成 `hidden` 控制。
- 本版驗證文件：`docs/VALIDATION_V161.324_DETAIL_SURFACE_AND_PARTS_DELEGATION.md`

## V161.321 交接補充
- 已啟動全站第一波整體收斂，先把共用 `ops` grammar 寫進 `core/ui.css` 與 `core/ui.js`。
- Maintenance / Machines 已導入第一批共用 shell / toolbar / KPI / empty state / panel grammar。
- 後續若要繼續做全站收斂，下一優先是 `Repairs → Settings → Maintenance/Machines 深化 → docs 治理`。
- 本版規劃文件：`docs/SITE_CONVERGENCE_PLAN_V161.321.md`

## V161.320 交接補充
- Weekly 標題已固定為 `本週案件總覽`，不再顯示 `（依更新日）` 或 `（依建立日）`。
- `created / updated` basis 仍只保留在資料篩選層，閱讀層不再暴露這類系統判定文字。

## V161.319 交接補充
- Weekly 已改為只輸出 `本週案件總覽`，不再輸出摘要統計區。
- Weekly 明細已移除登入者重複資訊（負責工程師 / 建立日 / 更新日）。
- Weekly 長篇處置文字已由 `WeeklyService._wrapWeeklyLine()` / `_wrapWeeklyTextLines()` 統一換行；後續若要調整寬度，只改 `core/config.js > weekly.caseDisplay.workSummaryWrapWidth`。
- Weekly 仍以登入者 own repairs 為資料來源；後續不可再把 owner 名稱補回明細區，避免重複。

- V161.312：週報輸出已改為固定管理段落（摘要 / 需要主管關注 / 本週新增案件 / 本週結案案件 / 進行中案件總覽），單一案件摘要也固定為 `標題 / 基本資訊 / 問題 / 本週進度 / 零件 / 商務 / 報價 / 訂單` 多行區塊。

- V161.317：週報詳細輸出改為單一案件總覽，取消重複的新增 / 結案案件段落，避免同案重複出現。
- V161.310：目前專案尚無獨立 Billing 模組，本版先針對既有 `repairs.billing` domain 做企業級收斂；`core/config.js` 已新增 `getBillingFlowMeta()`，Repair / Dashboard / Analytics / Weekly 的 billing 顯示與統計改由單一語意來源提供。
# 最新修正摘要（V161.310）

- Repair 詳情頁新增 `請款 / 商務追蹤` support card，商務 summary chip 與備註顯示改由 billing flow helper 統一輸出。
- Dashboard 與 Analytics 已補上 billing board，可直接查看收費判定、流程節點、未下單狀態與原因分布，不再只剩零散數字。
- 本版沒有虛構新的 Billing 模組，而是先把既有 billing domain 收斂乾淨。

- V161.309：KB modal 已改為正式 submit 流程，並將 Failure / SOP / Case 欄位命名收斂回單一資料契約；Settings 首屏同步補上 hero / command bar 與正確文案。
# 最新修正摘要（V161.309）

- KB 檢視 / 編輯 modal 已統一為 `hero → overview / command bar → 分段內容 / sticky footer`，不再維持舊式長表單與 click-only 儲存流程。
- KB 欄位命名已與 model / service 契約對齊，Failure / SOP / Case 不再混用舊欄位別名。
- Settings 頁首已補上總覽層，且簡易模式說明不再殘留已移除的 Guide 文案。

- V161.308：SOP 詳情頁已收斂為 `hero → overview board → command bar → 主檔欄位 / 上傳新版本 / 版本列表`，Parts editor modal 也統一為 `form-context-bar + 分段表單 + sticky footer`。
# 最新修正摘要（V161.308）

- SOP 詳情頁已從 `topbar + 散落 panel` 改為單一 detail 結構，主檔欄位、版本上傳與版本列表被固定到同一閱讀脈絡。
- Parts 模組的新增/編輯/批次編輯 modal 已收斂為正式表單流程，零件主檔與用料追蹤不再只是一層舊式表單殼。

- V161.307：已移除 Order 詳情 command bar 的教學說明文案，並從路由、載入清單與 feature 檔案層清除 Guide 模組。
# 最新修正摘要（V161.304）

- 已確認根因位於 `features/repairs/repairs.ui-forms.js`：新版 overview board 上線後，舊版 `repair-detail-side` sidebar 與 `repair-action-card` 仍持續輸出，導致詳情頁新舊結構併存。
- 本版直接從 render tree 切除舊右側 sidebar/action panel，改為 `command bar + support board` 單一主視圖架構，不採用 CSS 隱藏或條件遮蔽。
- 維修詳情頁桌機版目前結構：`hero → command bar → overview board → 問題描述 / WorkLog / 時間軸 → support board`。

# 最新修正摘要（V161.303）

- 維修詳情頁 `總覽` 已改為正式 overview board，資訊重點集中且閱讀順序固定。
- `案件總覽 / 客戶與聯絡資訊 / 設備與機台資訊 / 收費與下單追蹤` 四個主區塊已建立企業級版型。
- 問題描述與內部備註已收斂到主閱讀區，右側重複資訊卡已移除。

# 最新修正摘要（V161.295）

- 訂單明細 modal 的事件委派範圍已修正。
- 先前表單 submit 沒被 OrdersUI 攔截，瀏覽器直接做原生 GET 送出，會把欄位塞進網址並整頁重新整理，看起來像跳回登入。
- 這版屬於根因修正，不是單純 auth workaround。

# 專案交接摘要｜RepairTracking

日期：2026-03-13
時區：Asia/Taipei
Repo：`https://github.com/cthperry/repair-tracking`

## 1. 目前版本基底
- 穩定基底：`V161.310`
- BUILD_NUMBER：`310`
- 版本線規則：只往前進，不可倒退
- GitHub `main` 已由使用者以 force push 覆蓋為主線

## 2. 最近已完成的穩定化項目
1. Mobile Safe Tap / ghost click 防誤觸
2. Firebase Auth persistence（local）
3. FAB 浮動按鈕安全區與避讓
4. WorkLog / Detail 版面穩定化
5. Quote PDF 業務經辦欄位輸出修正
6. P1 UI/UX 第一波收斂（狀態 badge / modal safe-area / FAB 避讓 / WorkLog 手機操作）
7. Form System Audit 第一波（Repair / Quote / Order / WorkLog / SOP / Settings 表單企業級收斂）

## 3. 專案定位
RepairTracking = 企業級維修管理戰情室 + 現場維修作業工具 + 商務流程追蹤平台

核心流程：
```text
Repair → Quote → Order → Billing → Analytics
```

## 4. 結構與開發規則
### 核心結構
- `core/`
- `features/`
- `firebase/`

### Service 呼叫規則
禁止：
- `window.getService`
- `window[serviceName]`
- Controller 內直接 `svc.init()`

只允許：
- `AppRegistry.ensureReady([...])`
- `window._svc('XxxService')`

## 5. 使用者固定偏好
- 一律繁體中文
- 禁止簡體中文
- 程式註解一律繁體中文
- 回答簡潔、直接、肯定
- 版本號只能往前進
- ZIP 交付只允許單層結構
- 文件統一放 `docs/`
- 預設時區 `Asia/Taipei`
- 手機與桌機必須同時考慮
- 修改後先自我驗證再交付

## 6. 目前已載入能力組合
- 程式規劃
- UI/UX 設計優化
- 軟體工程師
- 美工／視覺設計
- QA／測試工程師
- 產品經理／系統分析師
- DevOps／部署工程師
- 資料庫／資料模型設計師
- 資安／權限設計工程師
- 技術文件／交接文件工程師

## 7. 已建立的工程化文件
- `ARCHITECTURE.md`
- `HANDOFF.md`
- `DEPLOYMENT.md`
- `FIREBASE_RULES.md`
- `VERSION_POLICY.md`
- `UI_UX_GUIDELINE.md`
- `DATA_MODEL.md`
- `QA_CHECKLIST.md`
- `CHANGELOG.md`

## 8. 最新完成（V161.301）
- 客戶 / 聯絡人表單已從側欄式雙欄改為主資料段 + 補充資料段的正式垂直配置，避免右側補充文字在窄欄中被截斷。
- 狀態列改為可換行 grid，摘要資訊在桌機低寬度條件下仍可完整閱讀。
- 基本資訊欄位節奏固定為公司全寬、聯絡人/電話同列、Email 全寬，桌機與手機邏輯一致。

## 8.1 近期已完成（V161.299）
- 客戶 / 聯絡人表單已改為真正 `<form>` submit 結構，不再依賴舊式 `saveCustomer` click delegation 特例。
- 客戶 / 聯絡人 modal 與詳情頁已收斂成正式企業級版面，補齊 section、helper text、sticky footer、detail block。
- 送出前已導入 `CustomerModel.validate()`，欄位錯誤可直接顯示在表單，不再只靠 toast。

## 8.2 近期已完成（V161.297）
- 表單驗證正式提升到核心層，不再只靠各模組 toast。
- Quote / Order 項目驗證已可直接標示錯誤欄位。
- WorkLog 已改成真正 form submit 流程，便於後續持續共用與測試。

## 9. 建議下一階段執行順序
### P1：UI/UX 收斂
- 統一 Dashboard / Detail / WorkLog / Settings / FAB / Modal 規範
- 固化 badge / footer / safe-area / card / toolbar 樣式
- 第二波補表單錯誤訊息、必填提示、驗證區塊規則

### P2：資料模型收斂
- 整理 Repair / Quote / Order / Billing / SOP 關聯
- 統一欄位命名、狀態值、歷程記錄策略

### P3：QA 制度化
- 固定 smoke test
- 補強 regression checklist
- 針對 mobile tap / auth / quote PDF 建立回歸案例

## 10. Git 推送方式（使用者慣例）
```bash
git init
git branch -M main
git remote remove origin 2> /dev/null || true
git remote add origin https://github.com/cthperry/repair-tracking.git
git add -A
git commit -m "Release: V161.xxx"
git push -u -f origin main
```

## 11. 交接注意事項
1. 每次修改後先自行驗證
2. 不可再出現版本倒退
3. 不可只修局部而不檢查整體互動
4. 優先用工程級收斂方式，不再持續臨時 patch


## V161.293
- 修正訂單儲存可能誤觸發重新登入的問題，並補強儲存鎖與 Firebase Auth 穩定性。

## V161.301 交接補充
- 客戶管理表單已修正補充資訊在右側窄欄被截斷的問題。
- 根因不是單一文字太長，而是將次要欄位與說明固定放進右側側欄，版型與 modal 寬度不相容。
- 現在 customer form 改為主資料段 + 補充資料段的正式垂直配置，status bar 也改成可換行 grid。


## V161.305 交接補充
- 商務狀態語意第一波已集中到 `core/config.js`：`quoteStatus / orderStatus / partStatus / billingNotOrderedStage / billingNotOrderedReason` 現在同時承載 label、顏色、badge、rank、終態資訊。
- 若後續要新增狀態，不可再直接改 `orders.ui.js` 或 `parts.ui.js` 的本地 map，必須先改 `core/config.js` 的狀態定義。
- `orders.ui.js` 與 `parts.ui.js` 的逾期判斷已改為看 `terminal`，後續要變更「哪些狀態算結束」時，只改中央字典即可。


## V161.306 交接補充
- Quote / Order 詳情已改為與 Repair 相同的企業級閱讀順序：`hero → overview board → command bar → editable sections`。
- 後續若要調整 Quote / Order 總覽，不可再把狀態、金額、關聯案件、操作按鈕拆回 `modal-header` 或 `form-context-bar`；這兩個模組現在的主資訊層應維持單一總覽輸出。
- `core/ui.css` 的 `enterprise-detail-*` 已成為主模組詳情頁的共用樣式基底，下一步可沿用到 Billing / KB / SOP 詳情頁，不要各自再造一套 hero / overview / command bar。


## V161.309｜KB / Settings 收斂
- KB modal 已改為正式 submit flow，欄位命名與 KBModel / KBService 契約一致。
- Settings 頁首已新增 hero 與 command bar；簡易模式文案已與移除 guide 後的實際路由一致。

## V161.311 重點
- Dashboard 已新增主流程漏斗、交期監控與工程師負載，首頁已具備更明確的戰情室視角。
- Analytics 已新增 funnel / risk / aging / stale repairs 聚合，管理層不需再自行拼湊 KPI 與 billing 資訊。


- V161.314：週報恢復以建立日／更新日產出當週案件，移除「需要主管關注」段落與案件區塊中的「報價 / 訂單」輸出。

## V161.330 補充
- PartsUI 已修正 `update()` 直接引用 render 區域變數 `containerId` 的問題；後續若再擴充 delegated handlers，必須沿用 `_containerId / _boundContainerId / _ensureDomHandlers()` 這組掛載生命週期寫法。
- 這次錯誤屬於結構性生命週期斷裂，不是樣式或單純 typo；之後各模組若把 inline handler 收回 delegated handlers，必須先確認 update / rerender 週期不再依賴區域變數。

## V161.329 補充
- 全站已建立共用 chip helper：`UI.chipHTML()`。
- Repairs / Parts / Machines 的高頻狀態 chips 與 quick filters 已改走 tone grammar，後續 Quotes / Orders 若再收斂 chips，應沿用同一套 helper。
- Parts summary stats 已改走 `stat-card tone-*` 類別，不要再回頭使用 inline `--accent`。