# CHANGELOG - V161.180

日期：2026-01-11

## 修正

### 訂單/採購追蹤：明細視窗「消失/被遮罩」問題

- 強化共用 Modal 堆疊順序（z-index）與 Host 容器樣式，避免在部分瀏覽器/版面組合下，明細內容被 backdrop 蓋住而看似「明細消失」。
- 新增共用 `.modal-host` 樣式，確保使用 `modal-host` 的模組（Orders/Quotes）之 Modal 內容可穩定置中與顯示。
- 補齊 `.modal-xlarge` 寬版明細樣式（寬表格/明細用）。

## 變更檔案

- core/ui.css
- core/config.js
- docs/CHANGELOG_V161.180.md
