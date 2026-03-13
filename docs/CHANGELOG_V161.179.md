# 變更記錄｜V161.179

日期：2026-01-11  
基底：V161.178

## UI/UX

### 訂單｜從報價建立後的「訂單明細」表單視窗過窄

- 修正 Orders 模組 Modal 外層容器不再使用 `.modal-content`（預設 860px），改為 `modal-host` 由內層 `.modal-dialog.modal-xlarge` 控制寬度。
- 訂單明細視窗可正確套用 `modal-xlarge`（寬表格/明細），改善欄位擠壓與可讀性。

## 變更檔案

- `features/orders/orders.ui.js`
- `core/config.js`
