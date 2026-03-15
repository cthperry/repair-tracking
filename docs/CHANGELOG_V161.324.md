# V161.324 變更紀錄

- BUILD_NUMBER：323 → 324
- 日期：2026-03-14

## 本版主題
- Customers 詳情層級重整
- Parts 首屏 / 篩選 / modal 事件委派收斂

## 主要修正
1. Customers 詳情 modal 改採 enterprise detail hero / overview board 結構。
2. Parts toolbar、summary、filters、batch modal 改用 `data-action` / delegated handlers，降低高頻內聯事件依賴。
3. Parts KPI 卡片補上更清楚的狀態 accent 與 hover 節奏，讓首屏更接近全站企業級 surface。

## 影響檔案
- `core/config.js`
- `features/customers/customers.ui-forms.js`
- `features/customers/customers.css`
- `features/parts/parts.ui.js`
- `features/parts/parts.css`
- `docs/README.md`
- `docs/CHANGELOG.md`
- `docs/HANDOFF.md`
