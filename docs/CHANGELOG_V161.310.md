# CHANGELOG V161.310

日期：2026-03-13  
版本：V161.310  
主題：Billing Enterprise Convergence 第一波

## 本版定位
本版先處理現有程式碼中已存在的 **billing domain**，而不是虛構一個尚未落地的獨立 Billing 模組。

目前系統的請款 / 商務追蹤資料仍掛在：
- `repairs.billing`
- `analytics` 的 billing 統計
- `dashboard` 的商務待辦摘要
- `weekly` 的週報輸出

因此本版採取的正確做法是：
**先把既有 billing domain 的資料語意、總覽呈現與統計視角收斂成企業級結構。**

## 根因
先前系統的 billing 資訊有三個結構問題：

1. `chargeable / orderStatus / notOrdered.stage / reason / note` 的語意分散在多個模組各自判斷。  
2. Repair 詳情頁雖然有「收費與下單追蹤」，但缺少正式的 **商務追蹤支援卡**，資訊只停留在 overview 一角。  
3. Dashboard / Analytics 對 billing 的呈現停留在數字堆疊，缺少「判定總覽 / 流程節點 / 未下單狀態 / 原因」的管理視角。

## 結構性修正

### 1. `core/config.js`
- 新增 `billingChargeable`
- 新增 `billingOrderDecision`
- 新增 `getBillingFlowMeta(billing)`

用途：
- 統一收費判定
- 統一下單決策
- 統一未下單狀態 / 原因 / 備註解析
- 讓 Repair / Dashboard / Analytics / Weekly 共用同一份 billing 語意

### 2. Repair 詳情頁
- `features/repairs/repairs.ui-forms.js`
- `features/repairs/repairs.css`

已新增：
- `請款 / 商務追蹤` support card
- overview 內的商務 summary chip 改由 billing flow helper 輸出
- 商務備註顯示固定化

### 3. Dashboard
- `features/dashboard/dashboard.ui.js`
- `features/dashboard/dashboard.css`

已新增：
- `收費 / 請款追蹤` board
- 判定總覽
- 流程節點
- 未下單狀態 Top 分布
- 未下單原因 Top 分布

### 4. Analytics
- `features/analytics/analytics.controller.js`
- `features/analytics/analytics.ui.js`
- `features/analytics/analytics.css`

已新增：
- `stageCount` 統計
- billing 卡由單純 KPI 改為 enterprise board
- 直接顯示未下單狀態與原因分布

### 5. Weekly
- `features/weekly/weekly.service.js`

已改為：
- 週報文字輸出也走 `getBillingFlowMeta()`
- 避免週報與畫面呈現使用不同語意

## 驗證
- `node --check core/config.js`
- `node --check features/repairs/repairs.ui-forms.js`
- `node --check features/dashboard/dashboard.ui.js`
- `node --check features/analytics/analytics.controller.js`
- `node --check features/analytics/analytics.ui.js`
- `node --check features/weekly/weekly.service.js`

## 備註
本版 **沒有假裝已經存在獨立 Billing 模組**。  
目前是先把既有 billing domain 收斂乾淨，這才符合根因導向與企業級工程處理方式。
