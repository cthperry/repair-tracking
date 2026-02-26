# V161.126 變更摘要

## 修正
- 修正「常用公司」區塊長時間停留在「載入中...」無法使用的問題。
  - 根因：`RepairUI.openForm` 存在重複定義，後者覆蓋前者，導致表單渲染後未執行 `afterRenderForm()`，進而未刷新常用公司 chips。
  - 作法：移除重複的同步版 `openForm`，保留並統一使用 `static async openForm()`（含 Settings/Customer 初始化與 `afterRenderForm()`）。

## 改善
- `refreshCompanyQuickPicks()` 支援 `opts`，並在表單後處理強制刷新（`force: true`）。
- 常用公司 chips 的「載入中」提示改為在刷新流程內統一處理，避免空白或卡住。
