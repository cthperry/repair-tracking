# V161.295 變更紀錄

日期：2026-03-13

## 問題摘要
- 訂單明細 modal 在 DOM 上是 `.orders-module` 的同層節點，不在模組容器內。
- `OrdersUI.bindDelegatedEvents()` 原本用 `closest('.orders-module')` 判斷事件來源，造成 modal 內事件未被視為 Orders 範圍。
- 結果是表單 submit 沒有執行 `preventDefault()`，瀏覽器直接用原生 GET 送出，整頁重新整理，表現看起來像「儲存後跳回重新登入」。

## 本版修正
1. 擴大 Orders 事件委派範圍
   - 納入 `#orders-modal`
   - 納入 `#orders-modal-content`
   - 納入 `.order-detail-modal`
   - 納入 `.create-order-modal`

2. 恢復 modal 內互動
   - 儲存
   - 關閉
   - 新增零件
   - 移除零件
   - 即時計算總額

## 驗證重點
- 編輯訂單 `O20260111-001`
- 修改狀態為 `已下單`
- 設定 `收貨日 / 預計到貨日`
- 按儲存後不應再整頁重載
- 網址不應再被加上表單 query string

