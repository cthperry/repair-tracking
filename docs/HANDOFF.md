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
- 穩定基底：`V161.304`
- BUILD_NUMBER：`304`
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
