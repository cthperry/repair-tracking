# CHANGELOG_V161.298

日期：2026-03-13
版本：V161.298
BUILD_NUMBER：298

## 本版主題
客戶 / 聯絡人表單正式化收斂（Form & Detail Convergence）

## 根因與處理方式
### 1. 送出流程過度依賴 data-action click delegation
- 舊版客戶表單的儲存按鈕為 `type="button"`，實際送出流程完全依賴 `customers.ui.js` 的 `saveCustomer` click delegation。
- 這種結構讓表單本身不是正式 submit 流程，也使鍵盤 Enter、欄位驗證、按鈕狀態與 footer 交互都綁在 UI 特例上。
- 本版改為真正的 `<form id="customer-form">` 提交，footer 直接放在同一個表單結構內，移除舊式繞路。

### 2. 客戶表單與詳情頁缺乏正式企業級視覺節奏
- 舊版欄位雖可使用，但 section、helper、footer、詳情區塊仍偏向臨時管理頁風格。
- 本版將客戶 / 聯絡人表單改為 enterprise-form 語言，補齊 section 描述、summary pill、sticky footer 與正式 detail block。

### 3. 欄位驗證仍停留在 service 拋錯後由 toast 顯示
- 本版在前端送出前先透過 `CustomerModel.validate()` 執行檢查，若有錯誤會直接套用到欄位與表單 summary。

## 實作內容
- `features/customers/customers.ui-forms.js`
  - 重構聯絡人表單 DOM 結構
  - 新增欄位 helper text、summary pill、detail block
  - 送出前導入 `CustomerModel.validate()`
- `features/customers/customers.ui.js`
  - 移除舊版 `saveCustomer` click delegation 特例
  - modal 開啟後自動 focus 第一個可編輯欄位
- `features/customers/customers.css`
  - 新增 customer form / detail 視覺規格
- `core/config.js`
  - BUILD_NUMBER 推進至 `298`

## 驗證
- `node --check features/customers/customers.ui.js`
- `node --check features/customers/customers.ui-forms.js`
- `node --check core/config.js`

## 建議實測
1. 新增聯絡人（新公司 / 舊公司）
2. 編輯聯絡人
3. 刪除聯絡人
4. Enter 提交表單
5. Email 格式錯誤時的欄位提示
6. 手機 modal 的 footer 與欄位閱讀順序
