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
- 穩定基底：`V161.298`
- BUILD_NUMBER：`298`
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
