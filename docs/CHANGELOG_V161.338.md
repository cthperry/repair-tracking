# CHANGELOG V161.338

## 現象
- 客戶管理「新增聯絡人 / 編輯聯絡人」表單視窗尺寸異常，出現外層空白與整體比例失衡。
- 維修表單右上角 X 位置異常，看起來沒有貼齊同一個 modal header。

## 根因
Customers 與 Repairs 模組的 modal 容器，外層仍使用 `.modal-content`，但實際內容又再渲染一層 `.modal-dialog`。

這會形成 **modal shell 裡再包 modal shell** 的雙層結構：
- 外層 `.modal-content` 先套用預設寬度 / 最大高度 / 邊框 / 背景
- 內層 `.modal-dialog` 再套用自己的寬度 / 高度 / header / footer

因此造成：
- Customer form 視窗比例異常
- Repairs form 的 X 位置相對外框看起來偏移
- 內外層 scroll / 尺寸責任混雜

## 修正
- `features/customers/customers.ui.js`
  - 將 `#customer-modal-content` 由 `.modal-content` 改為 `.modal-host`
- `features/repairs/repairs.ui.js`
  - 將 `#repair-modal-content` 由 `.modal-content` 改為 `.modal-host`
- `core/config.js`
  - 版本推進到 V161.338 / BUILD_NUMBER 338

## 修正層級
- 屬於結構性修正
- 非補丁式 CSS 偏移微調
