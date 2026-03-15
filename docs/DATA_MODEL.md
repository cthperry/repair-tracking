# 資料模型整理

本文件依目前 model / service / rules 實際結構整理，作為後續資料收斂基準。

## 1. 命名空間總覽
```text
data/<uid>/
  repairs/
  repairHistory/
  workLogs/
  customers/
  parts/
  repairParts/
  quotes/
  quoteHistory/
  orders/
  kb/
  sophub/
  meta/

weeklyPlans/<uid>/
users/
usersByEmail/
```

## 2. 核心流程關聯
```text
Repair (1)
  ├─ WorkLog (N)        via workLogs.repairId
  ├─ RepairPart (N)     via repairParts.repairId
  ├─ Quote (N)          via quotes.repairId
  ├─ Order (N, 間接)    via orders.repairId 或 quoteId
  └─ SOP refs (N)       via repairs.sopRefs[]

Quote (1)
  ├─ QuoteHistory (N)   via quoteHistory/<quoteId>
  └─ Order (0..N)       via orders.quoteId
```

## 3. Repair
路徑：`data/<uid>/repairs/{repairId}`

主要欄位：
- `id`
- `repairNo`
- `customer`
- `contact`
- `phone`
- `email`
- `productLine`
- `machine`
- `serialNumber`
- `issue`
- `content`
- `status`：`進行中 | 需要零件 | 已完成`
- `progress`
- `priority`：`low | normal | high | urgent`
- `ownerUid` / `ownerName` / `ownerEmail`
- `createdAt` / `updatedAt` / `createdDate`
- `completedAt`
- `tags`
- `sopRefs[]`
- `billing`

### billing 子結構
- `chargeable`：`true | false | null`
- `orderStatus`：`ordered | not_ordered | null`
- `notOrdered.reasonCode`：`price | budget | internal | other | null`
- `notOrdered.note`
- `decidedAt`
- `decidedBy`

## 4. Repair History
路徑：`data/<uid>/repairHistory/{repairId}/{pushKey}`

用途：
- 維修單建立 / 更新 / 狀態變更 / 刪除等歷程
- Activity Timeline 會使用此資料

## 5. WorkLog
路徑：`data/<uid>/workLogs/{logId}`

主要欄位：
- `id`
- `repairId`
- `workDate`
- `action`
- `findings`
- `partsUsed`
- `result`：`completed | pending | need_parts`
- `createdAt`
- `updatedAt`

## 6. Customer
路徑：`data/<uid>/customers/{customerId}`

主要欄位：
- `id`
- `name`
- `contact`
- `phone`
- `email`
- `address`
- `note`
- `repairCount`
- `createdAt`
- `updatedAt`
- `version`
- `isDeleted`

## 7. Part / RepairPart
### Part 主檔
路徑：`data/<uid>/parts/{partId}`

欄位：
- `id`
- `name`
- `mpn`
- `vendor`
- `unit`
- `unitPrice`
- `stockQty`
- `note`
- `isActive`
- `createdAt`
- `updatedAt`

### RepairPart 關聯
路徑：`data/<uid>/repairParts/{repairId}/{itemId}` 或 service 管理的對應節點

欄位：
- `id`
- `repairId`
- `partId`
- `partName`
- `mpn`
- `vendor`
- `qty`
- `unit`
- `unitPrice`
- `status`：`需求提出 | 已報價 | 已下單 | 已到貨 | 已更換 | 取消`
- `quoteId`
- `orderId`
- `expectedDate`
- `arrivedDate`
- `replacedDate`
- `note`
- `createdAt`
- `updatedAt`
- `isDeleted`

## 8. Quote
路徑：`data/<uid>/quotes/{quoteId}`

主要欄位：
- `id`
- `quoteNo`
- `repairId`
- `customer`
- `status`：`草稿 | 已送出 | 已核准 | 已取消`
- `currency`
- `items[]`
- `totalAmount`
- `ownerUid` / `ownerName` / `ownerEmail`
- `version`
- `updatedByUid` / `updatedByName` / `updatedByEmail`
- `createdByUid` / `createdByName` / `createdByEmail`
- `approvedAt` / `approvedByUid` / `approvedByName` / `approvedByEmail`
- `note`
- `createdAt`
- `updatedAt`
- `isDeleted`

### Quote items[]
- `name`
- `mpn`
- `vendor`
- `qty`
- `unit`
- `unitPrice`

### Quote history
路徑：`data/<uid>/quoteHistory/{quoteId}/{pushKey}`

## 9. Order
路徑：`data/<uid>/orders/{orderId}`

主要欄位：
- `id`
- `orderNo`
- `quoteId`
- `repairId`
- `customer`
- `status`：`建立 | 已下單 | 已到貨 | 已結案 | 已取消`
- `supplier`
- `currency`
- `items[]`
- `totalAmount`
- `orderedAt`
- `expectedAt`
- `receivedAt`
- `ownerUid` / `ownerName` / `ownerEmail`
- `note`
- `createdAt`
- `updatedAt`
- `isDeleted`

## 10. Maintenance

### equipments/{equipmentId}
- `id`
- `equipmentNo`
- `name`
- `model`
- `location`
- `owner`
- `ownerEmail`
- `installDate`
- `cycleEvery`
- `cycleUnit`：`day | week | month`
- `remindDays[]`
- `checklistTemplate[]`
- `tags[]`
- `isDeleted`
- `createdAt` / `createdBy`
- `updatedAt` / `updatedBy`
- `_search`

### records/{recordId}
- `id`
- `equipmentId`
- `equipmentNo`
- `equipmentName`
- `equipmentModel`
- `performedAt`
- `performer`
- `checklist[]`
- `abnormal`
- `parts[]`
- `notes`
- `tags[]`
- `isDeleted`
- `createdAt` / `createdBy`
- `updatedAt` / `updatedBy`
- `_search`

### settings
- 保養模組設定，規則目前只對 `updatedAt` 建索引

## 11. KB
路徑：`data/<uid>/kb/{faqs,failureModes,sops,cases}`

類型：
- `faq`
- `failure`
- `sop`
- `case`

通用欄位：
- `id`
- `type`
- `title`
- `summary`
- `tags[]`
- `createdAt` / `updatedAt`
- `createdBy` / `updatedBy`
- `_search`

## 12. SOP Hub
路徑：
- `data/<uid>/sophub/sops/{sopId}`
- `data/<uid>/sophub/versions/{sopId}/{version}`

### sops
- `id`
- `title`
- `category`：`machine | part | repair | general`
- `scopeCustomerId`
- `tags[]`
- `abstract`
- `latestVersion`
- `latestDriveFileId`
- `latestDriveWebViewLink`
- `ownerUid`
- `createdAt`
- `updatedAt`
- `isDeleted`

### versions
- `version`
- `driveFileId`
- `driveWebViewLink`
- `fileName`
- `mimeType`
- `changeLog`
- `createdAt`
- `createdByUid`

## 13. Settings
路徑：`users/{uid}/settings`

目前主要欄位：
- `weeklyRecipients`
- `weeklyThisWeekBasis`：固定為 `all`（輸出全部維修案件）
- `signature`
- `uiDensity`：`comfortable | compact`
- `simpleMode`
- `pinnedTopN`
- `pinnedCompanies[]`
- `recentCompaniesLimit`
- `machineCatalog`
- `updatedAt`

## 14. Weekly Plans
路徑：`weeklyPlans/{uid}`

用途：
- 週報中的下週計畫
- 週區間以週一到週日（Asia/Taipei）

## 15. 後續資料收斂建議
1. `customer` / `name` / `companyName` 命名要再統一
2. Repair、Quote、Order 的 owner / createdBy / updatedBy 欄位可再做一致化
3. `weeklyPlans` 長期可評估是否併回 `data/<uid>` 命名空間
4. 舊節點 `repairLogs` / `repairWorkLogs` 持續只保留搬移用途


## 商務狀態語意（V161.305）
- `core/config.js` 為 Quote / Order / Repair Parts / Billing 未下單狀態的唯一真實來源。
- 每個狀態定義至少包含：
  - `value`
  - `label`
  - `semanticKey`
  - `stageKind`
  - `rank`
  - `terminal`
  - `badgeClass`
  - `accent`
  - `soft`
- 規則：
  - `stageKind = flow`：流程階段
  - `stageKind = result`：結果/終態
  - `stageKind = reason`：原因分類
- UI 模組不可自行再維護第二份狀態顏色、badge、排序、終態清單。


## 3. Billing domain（目前掛在 Repair 下）
目前專案尚未建立獨立 `billing/` collection；商務追蹤仍掛在 `repairs/<repairId>/billing` 內。

```text
repairs/<repairId>/billing/
  chargeable: true | false | null
  orderStatus: 'ordered' | 'not_ordered' | null
  notOrdered/
    stageCode: 'quote_pending' | 'procurement' | 'reviewing' | 'budget_review' | 'on_hold' | 'other'
    reasonCode: 'price' | 'budget' | 'internal' | 'spec' | 'other'
    note: string
```

說明：
- `chargeable`：是否需要向客戶收費
- `orderStatus`：需收費案件是否已下單
- `notOrdered.stageCode`：未下單案件目前卡在哪個流程節點
- `notOrdered.reasonCode`：未下單的主原因
- `notOrdered.note`：商務補充說明

目前 Dashboard / Analytics / Weekly 對 billing 的統計與輸出，皆應以此節點為唯一資料來源。
