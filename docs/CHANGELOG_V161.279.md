# CHANGELOG - V161.279（Phase 4）

日期：2026-02-27（Asia/Taipei）

## 修正
- 行動裝置：維修紀錄表單在「序號」之後的欄位無法 focus / 無法輸入。
  - 根因：`core/mobile-safe-tap.js` 會把帶有 `data-action` 的容器（例如 `<form data-action=...>`）視為可點元素，於 `touchend` 進行 `preventDefault()` + 合成 click，導致輸入元件無法取得焦點。
  - 修正：
    - 若觸控目標（或其祖先）是 `input/textarea/select/contenteditable`，則完全不介入。
    - 另外排除 `form` 作為 action 元件。
