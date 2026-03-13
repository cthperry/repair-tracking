# Firebase Rules 說明

依據目前 `database.rules.json` 整理。

## 1. 根規則
```json
".read": false,
".write": false
```

預設全部拒絕，僅開放明確白名單節點。

## 2. 使用者資料命名空間
```text
data/$uid/...
```

規則：
- `.read`：`auth != null && auth.uid == $uid`
- `.write`：`auth != null && auth.uid == $uid`

結論：
- 每位使用者只能讀寫自己的資料
- 使用者之間不能互相讀寫 `data/<uid>`

## 3. 已建立索引的節點
### repairs
- `updatedAt`
- `completedAt`
- `status`
- `createdAt`
- `serialNumber`

### quotes
- `updatedAt`
- `createdAt`
- `quoteNo`
- `repairId`

### orders
- `updatedAt`
- `createdAt`
- `orderNo`
- `quoteId`
- `repairId`

### customers
- `updatedAt`
- `createdAt`
- `companyName`
- `name`

### parts
- `updatedAt`
- `createdAt`
- `mpn`
- `name`

### maintenance/equipments
- `updatedAt`
- `createdAt`
- `equipmentNo`
- `name`
- `model`
- `location`
- `owner`
- `cycleUnit`
- `cycleEvery`
- `_search`

### maintenance/records
- `updatedAt`
- `createdAt`
- `performedAt`
- `equipmentId`
- `equipmentNo`
- `equipmentName`
- `_search`

### maintenance/settings
- `updatedAt`

### workLogs
- `workDate`
- `repairId`

### repairLogs / repairWorkLogs（舊節點兼容）
- `tsStart`
- `createdAt`
- `visitDate`
- `createdAt`

## 4. 週報計畫
```text
weeklyPlans/$uid
```
- 只有登入且 `auth.uid == $uid` 才可讀寫
- 索引：`weekKey`、`updatedAt`

## 5. 管理員資料
### users/
- 全域讀寫僅限 admin
- 個人節點 `users/$uid`：本人或 admin 可讀寫

### usersByEmail/
- 讀取：僅 admin
- 寫入：admin，或新建/維護自己對應索引時可寫

## 6. 目前規則意義
1. `data/<uid>` 已是主資料區
2. `users` / `usersByEmail` 僅用於權限與帳號管理
3. `weeklyPlans` 仍是獨立根節點，不在 `data/<uid>` 下

## 7. 後續建議
1. 持續清理舊節點相容依賴（`repairLogs`、`repairWorkLogs`）
2. 若未來擴充共享資料，必須新增明確白名單規則
3. 權限仍應以 `users/$uid/role` 為主，不可只靠前端顯示控制
