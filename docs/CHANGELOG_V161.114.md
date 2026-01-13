# V161.114 變更摘要（P0：模板 needParts 覆寫修正）

## 修正重點

### 1) 模板 needParts 欄位型別修正（string -> boolean）
- **問題**：模板 `needParts` 以字串儲存，且在套用到維修單時以 `value` 寫入，導致維修單畫面上的「需要零件」勾選狀態無法被模板正確覆寫。
- **修正**：
  - `RepairTemplateModel` 將 `needParts` 統一改為 **boolean**（並兼容舊資料）。
  - 模板 Modal 改為 checkbox UI（與維修單一致）。
  - 套用模板時，對 checkbox 使用 `checked` 進行覆寫。

### 2) 模板 Modal UI 調整
- 「需要零件」改為 checkbox + 說明文字。
- 新增小範圍 scoped 樣式（不影響其他 modal）。

## 影響範圍
- `features/templates/repairTemplates.model.js`
- `features/settings/settings.ui.js`
- `features/settings/settings.css`
- `features/repairs/repairs.ui.js`

## 相容性說明
- 舊模板資料若 `needParts` 為字串（例如 `"true"` 或任何非空字串），會在 normalize 階段自動視為 `true`。

