# CHANGELOG V161.331

BUILD_NUMBER：331

## 修正重點
- 修正維修管理列表空白：Repair card renderer 直接讀取未正規化的狀態 / 優先級資料，遇到舊資料或空值時會在卡片渲染期中斷。
- RepairUI 新增 `_getRepairStatusMeta()`、`_getRepairPriorityMeta()`、`_toRepairCardViewModel()`，先把資料正規化後再交給列表卡片。
- `renderCardsIncrementally()` 改為逐筆錯誤隔離；單筆異常只會顯示提示卡，不再拖垮整個列表。

## 影響檔案
- `core/config.js`
- `features/repairs/repairs.ui.js`
- `features/repairs/repairs.css`
- `docs/README.md`
- `docs/CHANGELOG.md`
- `docs/HANDOFF.md`
- `docs/CHANGELOG_V161.331.md`
- `docs/VALIDATION_V161.331_REPAIRS_CARD_RENDER.md`
