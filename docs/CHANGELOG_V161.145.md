# Changelog - V161.145

日期：2026-01-06

## P3（UX / 可用性強化）啟動

### 新增
- core：新增 `core/form-validate.js`（輕量表單即時驗證工具）。
  - 僅針對已標示 `required` 或 `data-required` 欄位提供即時提示。
  - 不更動資料結構、不新增必填規則。

### 調整
- Repairs：新增/編輯維修單表單支援必填欄位即時提示與送出前驗證。
  - 未補齊必填欄位時：欄位以紅框標示、顯示「必填欄位」，並提示 toast。

### 相容性
- Desktop + Mobile 皆載入 `core/form-validate.js`；未綁定表單時不影響既有行為。
