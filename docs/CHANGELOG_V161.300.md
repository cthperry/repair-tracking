# CHANGELOG_V161.300

日期：2026-03-13
版本：V161.300
BUILD_NUMBER：300

## 本版主題
客戶 / 聯絡人表單補充資訊區版面根因修正

## 根因與處理方式
### 1. 將補充資訊做成桌機側邊欄，導致說明文字與欄位被窄欄壓縮
- V161.299 雖然把主欄位拉回首屏，但仍沿用「左主區 + 右側補充區」的雙欄模式。
- 在目前 modal 寬度、瀏覽器縮放與 DevTools 開啟的條件下，右側欄位實際可用寬度不足，補充說明文字被擠壓後出現截斷與閱讀破碎。
- 這不是單純文字太長，而是把次要資料固定放進窄側欄的版型決策不適合目前表單。

### 2. 狀態列也沿用左右對齊思維，說明文字缺少穩定換行空間
- 舊版 status bar 將 pills 與補充說明硬塞在同一列兩端，當可用寬度下降時，說明文字容易被擠壓。
- 本版將 status bar 改為可換行 grid 結構，保留資訊層次但不再依賴窄欄右對齊。

## 實作內容
- `features/customers/customers.ui-forms.js`
  - 縮短補充文案，避免側欄式長句造成視覺負擔
  - 保留主欄位與補充欄位分區，但改為正式上下段配置
- `features/customers/customers.css`
  - `customer-form-layout` 改為垂直分段，不再使用左右側欄
  - `customer-form-statusbar` 改為 grid，可在中等寬度下穩定換行
  - `customer-form-grid-basic` 固定為公司全寬、聯絡人/電話同列、Email 全寬
  - 手機下所有欄位回到單欄，避免桌機規則殘留
- `core/config.js`
  - BUILD_NUMBER 推進至 `300`

## 驗證
- `node --check features/customers/customers.ui-forms.js`
- `node --check core/config.js`

## 建議實測
1. 客戶管理 → 新增聯絡人
2. 客戶管理 → 既有公司新增聯絡人
3. 桌機視窗 + DevTools 開啟確認補充說明與地址/備註不再截斷
4. 手機模式確認欄位順序是否仍為公司 → 聯絡人 → 電話 → Email → 地址 → 備註
