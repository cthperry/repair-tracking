# CHANGELOG V161.353

日期：2026-03-15
BUILD_NUMBER：353

## 本版修正
- `features/customers/customers.ui.js`：在 `render()` 補上 DOM 綁定狀態重置，並記錄目前掛載容器，修正第二次進入客戶頁面時 delegated handlers 未重綁造成按鈕失效。
- `features/customers/customers.ui-forms.js`：移除 `handleSubmit()` 內重複的 `event.stopPropagation()` 呼叫，避免 submit 鏈出現重複攔截。
- `core/config.js` 進版至 `BUILD_NUMBER = 353`。
