# Changelog V161.251

日期：2026-02-10（Asia/Taipei）

## 修正
- Weekly：修正進入「週報」時 `this._bindDelegation is not a function`（WeeklyUI 缺少事件委派方法）造成路由導覽失敗。

## 變更
- WeeklyUI：補齊 `_bindDelegation()`，以 container 事件委派處理：
  - 預覽切換、重新產生預覽、寄送 mailto、展開/收合本週工作
  - 新增/刪除下週計畫
  - 下週計畫欄位輸入使用 250ms debounce 後呼叫 `WeeklyService.updatePlan()`
  - 本週工作來源（建立日/更新日）切換改用 change 事件
