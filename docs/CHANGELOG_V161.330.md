# CHANGELOG V161.330

BUILD_NUMBER：330
日期：2026-03-14（Asia/Taipei）

## 主題
修正 Parts 模組 delegated handlers 收斂後造成的致命錯誤。

## 現象
進入零件管理頁後，系統直接跳出全域錯誤頁：
- `containerId is not defined`
- 位置：`features/parts/parts.ui.js` 的 `update()`

## 根因
這不是單純變數名寫錯。
真正根因是：
- `render(containerId)` 內的區域變數 `containerId` 被錯誤延伸到 `update()` 生命週期使用
- `update()` 本身不接收掛載容器參數，卻直接呼叫 `_bindDomHandlers(containerId)`
- 當 `render()` 結束後，update 週期再執行就會失去該區域變數，造成 ReferenceError

## 修正
- `PartsUI` 新增 `_containerId` 與 `_boundContainerId`
- `render(containerId)` 先記錄掛載容器，再進入後續更新流程
- 新增 `_ensureDomHandlers()`，統一以實例掛載狀態決定是否綁定 delegated handlers
- `update()` 改為呼叫 `_ensureDomHandlers()`，不再直接依賴 render 區域變數

## 影響檔案
- `core/config.js`
- `features/parts/parts.ui.js`
- `docs/README.md`
- `docs/CHANGELOG.md`
- `docs/HANDOFF.md`
- `docs/CHANGELOG_V161.330.md`
- `docs/VALIDATION_V161.330_PARTS_CONTAINER_LIFECYCLE.md`
