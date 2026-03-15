# CHANGELOG V161.339

## 本版重點
- 統一 Customers / Repairs 表單 modal header 契約
- 修正客戶管理表單標題被裁切與關閉按鈕視覺位置偏移
- 讓新增聯絡人表單寬度回到與新增維修單一致的 modal-large 骨架

## 根因
Customers 表單沿用自訂 header 版型，把標題與副說明都放在 `.modal-header` 內，與 Repairs 的 header 契約不同；再加上共用 `.modal-header` 使用 `overflow:hidden`，造成標題裁切、X 位置判讀偏移，以及 Customers 與 Repairs 看起來不是同一組 modal shell。

## 修正
- `features/customers/customers.ui-forms.js`
  - Customer form 改用與 Repairs 相同的 header 骨架：標題 + 關閉按鈕
  - 將副說明移出 header，放到 modal body 開頭
  - 表單套用 `modal-large` 寬度契約
- `features/customers/customers.css`
  - 客戶表單寬度統一為 `1040px / 94vw`
  - 新增 `customer-form-intro` 樣式
- `core/ui.css`
  - `.modal-header` 移除 `overflow:hidden`
  - 補上 header 內容區與關閉按鈕的對齊契約
  - `h3` 與 `.modal-close` 補上顯式 line-height / flex 對齊
- `core/corporate-enhancement.css`
  - 同步 desktop 覆寫層，避免被後載樣式覆蓋
