# CHANGELOG_V161.299

日期：2026-03-13
版本：V161.299
BUILD_NUMBER：299

## 本版主題
客戶 / 聯絡人表單可視範圍與版面結構收斂

## 根因與處理方式
### 1. 表單資訊層級配置錯誤，重要欄位被次要摘要擠出首屏
- V161.298 把摘要卡、基本資訊、地址備註全部縱向堆疊在同一個 modal 內容流中。
- 在高度較低的桌機視窗與瀏覽器裝置模擬下，`Email` 會被擠到首屏以下，造成使用者一開表單就看不到主欄位，閱讀順序失真。
- 本版改為：
  - 摘要改成精簡 status bar
  - 表單主體改為桌機雙欄、手機單欄
  - 公司 / 聯絡人 / 電話 / Email 保持在主要資訊區，不再被補充資訊擠壓

### 2. Modal 捲動責任落在整個對話框，導致可視區域使用效率差
- 舊版 `.customer-form-dialog` 沿用通用 modal，整個對話框一起捲動，header / body / footer 沒有正式分層。
- 本版將 customer form dialog 改為固定 header + 可捲動 body + sticky footer 的正式結構，讓可視高度集中給表單欄位而不是重複外框與留白。

## 實作內容
- `features/customers/customers.ui-forms.js`
  - 移除大型 summary card
  - 新增精簡 `customer-form-statusbar`
  - 將表單主體改為 `customer-form-layout` 雙欄結構
  - 將 `Email` 納入主欄位區固定呈現
- `features/customers/customers.css`
  - customer form dialog 改為 flex column
  - body 改為獨立滾動區
  - 新增桌機雙欄 / 平板雙欄 / 手機單欄規則
  - footer 保持 sticky，但不再壓縮首屏欄位
- `core/config.js`
  - BUILD_NUMBER 推進至 `299`

## 驗證
- `node --check features/customers/customers.ui-forms.js`
- `node --check core/config.js`

## 建議實測
1. 客戶管理 → 新增聯絡人
2. 客戶管理 → 既有公司新增聯絡人
3. 桌機低高度視窗（含 DevTools 開啟）確認 Email 是否可直接看到
4. 手機模式確認 footer 是否遮擋最後欄位
