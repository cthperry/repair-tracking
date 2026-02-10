# V161.118 變更摘要（P2-2 第一段）

基底：V161.117（full_nolegacy）

## 1) DOM Query 減量（Repair UI）
- 新增 RepairUI 表單 DOM 快取：`_getRepairForm()` / `_getFormEl(name)` / `_clearFormCache()`
- `handleCustomerPick()` / `applyHistoryToForm()` 等流程改用快取取欄位（避免重複 `document.querySelector('#repair-form ...')`）
- `RepairUI.closeModal()` 追加清除表單快取，避免下一次開啟殘留舊引用。

## 2) DomUtils 增強（供後續事件委派/快取使用）
- `core/utils/dom.js` 新增：
  - `DomUtils.byName(formEl, name)`：依欄位 name 取得 input/select/textarea
  - `DomUtils.cacheSelectors(root, map)`：建立簡易 selector 快取

## 3) 版本號
- `core/config.js`：BUILD_NUMBER 升至 `118`
