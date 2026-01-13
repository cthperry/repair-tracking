# V161.142 變更記錄（P2-3｜dead code 清理與 window.* 收斂）

> 原則：不動功能、不改 UI；僅做瘦身與維護性（小批次）。

## 1) window.* 耦合再收斂（registry-first）
- `core/linkage.js`
  - 將多處重複的 `(window._svc ? window._svc('X') : window.XService)` 讀取，收斂為：
    - 先取得一次 `const xxxSvc = window._svc('X')`
    - 再依 `typeof xxxSvc.method === 'function'` 判斷呼叫
  - 目的：降低重複 window/ternary 造成的可讀性與維護成本，並保持既有行為不變。

- `features/customers/customers.ui.js`
  - 新增 `CustomerUI._getService()`：集中取得 `CustomerService`（registry-first）。
  - `renderStats()` / `renderCompanyGroups()` / `updateList()` / `openForm()` / `openDetail()` 改為使用 `_getService()`，移除重複的 window ternary。

- `features/customers/customers.controller.js`
  - 初始化改為先取得 `svc` 後再呼叫 `init()` / `onChange()`，並在服務不存在時給出明確錯誤（避免靜默失敗）。

## 2) 版號一致性
- `core/config.js`
  - `BUILD_NUMBER: '140'` → `BUILD_NUMBER: '142'`
  - `VERSION_DATE` 更新為 `2026-01-06`

