# 維修追蹤系統 V161.333（完整包 / full_nolegacy / flat-zip-root）

## 目前穩定基底
- V161.333
- BUILD_NUMBER：333
- 日期：2026-03-14（Asia/Taipei）

## 本版整體收斂重點（V161.333）
- Repairs 首屏改為單一 `repairs-main-stack` 結構，KPI 與列表共用同一層穩定版面，不再混用舊 flex shell 與新 ops grid。
- `#repairs-stats` 改回明確 grid 版型，移除模組本地 flex 與 shared grid grammar 互相打架的結構衝突。
- Repairs 列表 header / 搜尋 / cards 補上 `min-width: 0` 與桌機欄寬約束，避免桌機首屏在寬度計算時被擠成異常垂直堆疊。
- 新增 `CHANGELOG_V161.333.md`、`VALIDATION_V161.333_REPAIRS_LAYOUT_ZIP.md`、`ZIP_STRUCTURE_RULES.md`。

## 入口
- 建議：Index_V161.html
- Desktop：V161_Desktop.html
- Mobile：V161_Mobile.html

## 模組順序（已定案）
1. 維修管理
2. 零件追蹤
3. 報價管理
4. 訂單追蹤
5. 客戶管理
6. 週報
8. 設定

## 整體風格
- 企業系統風（乾淨、穩重、低彩度）
- 全站統一淺色系（Design Tokens 驅動）

## 介面（V161.077 視覺優化）
- 新增：core/ui.css（全站共用 UI Kit）
  - 統一 Desktop/Mobile：按鈕、輸入框、Badge/Chip、卡片、Modal、module-toolbar
  - 降低模組 CSS 互相依賴（例如 quotes/orders 不再仰賴 parts.css 的載入順序）
- App Shell 調整：Sidebar / Header 改為更一致的層次與排版，路由切換會同步更新頁首標題。
- 新增：core/ui.js（Toast / Confirm Modal）
  - 將原生 alert/confirm 逐步替換為一致的企業風格提示，Mobile 亦同。

- 全站表格（.table-wrap）自動增強：表格上方水平滑桿（避免只能在底部滑動）

- 報價管理（列表）升級：KPI 摘要列 + 快速 Chips + 排序 + 卡片資訊層級（與訂單列表一致）

## 維修狀態字典（固定 3 種）
- 進行中
- 需要零件
- 已完成

### 狀態/進度/零件連動規則
- 進度 = 100% → 自動切為「已完成」且 needParts=false
- 選擇「已完成」→ 進度自動為 100%
- needParts=true 或狀態選「需要零件」→ 狀態固定為「需要零件」
- 其餘一律為「進行中」

## 負責人（Owner）
- 維修單 ownerUid 來源：登入者 UID
- 維修管理提供「只看我的」篩選（以登入 UID 過濾）

## 週報
- 週區間固定：週一為起、週日為迄（Asia/Taipei）
- 本週工作：從維修單（更新時間落在本週）自動彙整（只讀）
- 下週計畫：可編輯（新增插入最上方；刪除不做 confirm）
- 唯一動作：📧 寄送（mailto）

## 週報（V161.319）
- 週報維持以登入者自己的案件產出，不再重複輸出負責工程師資訊。
- 週報移除摘要統計區，保留單一「本週案件總覽」詳細區塊。
- 案件明細不再輸出建立 / 更新日期行。
- 本週處置改為支援長文字自動換行，預覽與 mail 文字輸出一致。

## 設定
- 週報收件人：可編輯（內建名單預設載入）
- 簽名檔：可編輯（寄送週報時自動帶入）

## Firebase Database Rules
- database.rules.json（本版採用 **UID 命名空間**：資料僅讀寫 `data/<uid>/...`，並封鎖根節點舊路徑；管理面僅保留 `users / usersByEmail` 管理用途）


## 本版收斂重點（V161.292）
- Repair / Quote / Order / WorkLog / SOP / Settings 表單第一波工程級收斂
- 表單章節、欄位層級、提示文字、動作列改為正式企業級規格
- 不再接受怪異、拼裝感或明顯實驗性的表單排版
