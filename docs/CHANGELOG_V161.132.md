# V161.132 變更記錄（P2-3：瘦身 + 維護性）

> 範圍限定：僅瘦身與維護性；不新增功能、不調整 UI、不改流程。

## 1) window.* 耦合收斂（維持相容、降低載入時序風險）

- 將多處重複出現的服務取得寫法：
  - `typeof window._svc==='function' ? window._svc('X') : window.XService`
  
  收斂為較簡潔且等價的：
  - `window._svc ? window._svc('X') : window.XService`

- 涉及模組（行為不變）：
  - `features/customers/*`
  - `features/machines/*`
  - `features/orders/orders.ui.js`
  - `core/linkage.js`

## 2) 版號一致性

- `core/config.js`
  - `BUILD_NUMBER: '131'` → `BUILD_NUMBER: '132'`
