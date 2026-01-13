# V161.124 變更摘要

## 修正
- 修正「新增/編輯維修單」表單中的「常用公司」區塊長時間停在「載入中...」無法使用。
  - afterRenderForm 內改為 await refreshCompanyQuickPicks() 並加入失敗降級顯示。
  - refreshCompanyQuickPicks() 增加防禦式設定讀取與立即顯示 loading，避免非同步失敗導致 UI 永久卡住。

## 影響範圍
- 僅影響維修表單「常用公司/最近使用」chips 的刷新流程；不更動資料結構與 UI 版面。
