# CHANGELOG V161.337

## 本版重點
- 全站表單必填欄位自動補上 `*` 標記
- 以共用 DOM 掃描與觀察機制處理，不逐表單補丁式硬改
- BUILD_NUMBER 更新為 337

## 根因
- 目前系統僅對「手動加上 `required` class 的 label」顯示 `*`
- 多數表單雖然控制項本身有 `required`，但對應 label 未同步標示
- 因此使用者在不同模組看到的必填提示不一致

## 修正
- `core/ui.js`
  - 新增 `UI.syncRequiredMarkers()`
  - 新增 `UI.bindRequiredMarkers()`
  - 自動掃描 `input/select/textarea` 的 `required / aria-required / data-required` 狀態
  - 自動把對應 label 補上 `required` class
  - 透過 `MutationObserver` 支援 modal、動態表單、切換欄位顯示後的必填標示同步
- `core/ui.css`
  - 擴充 `label.required::after` 樣式，避免部分非標準 wrapper label 漏掉星號

## 影響範圍
- Repairs
- Customers
- Quotes
- Orders
- Parts
- Worklogs
- KB
- 其他使用共用表單樣式與 required 屬性的表單

## 驗證
- 語法檢查通過
- 以 jsdom 驗證：
  - 已存在 `required` 屬性的控制項，對應 label 會自動出現 `required` class
  - 動態加入的新表單控制項，也會自動補上星號
  - hidden 欄位不會誤加星號
