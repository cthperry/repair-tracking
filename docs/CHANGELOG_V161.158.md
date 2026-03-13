# CHANGELOG - V161.158 (MNT-4)

VERSION_DATE：2026-01-08  
BUILD_NUMBER：158

---

## MNT-4 完成內容

### 1) 自動 Email 提醒（非 mailto）
- 新增 `functions/`（Firebase Cloud Functions）
  - `maintenanceDailyReminder`：每日 08:00（Asia/Taipei）自動寄送保養提醒
  - `maintenanceSendTestEmail`：Callable 測試寄信
- 新增設定欄位（儲存在 `data/<uid>/maintenance/settings`）
  - `autoEmailEnabled`：是否啟用自動寄信
  - `autoEmailIncludeNoRecord`：是否包含「尚無紀錄」設備
- 前端保養設定頁：新增「✅ 啟用自動 Email（需 Cloud Functions）」與「提醒包含尚無紀錄」
- 保留原本「📧 手動 Email（mailto）」作為備援

> 部署方式與 SMTP 設定：請參考 `docs/MNT-4_SETUP_CloudFunctions_AutoEmail.md`

### 2) 維修單結案 → 一鍵寫入保養紀錄
- 維修單詳情頁新增「🛠 保養 / 結案連動」區塊
  - 顯示序號對應的保養狀態（逾期/即將到期/正常/尚無紀錄/未建立）
  - 支援一鍵：開啟保養、建立設備、＋建保養紀錄
  - 新增「✅ 結案並寫入保養」：
    - 自動確保設備存在（以維修單序號建立/對應 equipmentNo）
    - 若無對應保養紀錄則建立（並用 tags 去重：`repair:<repairId>`）
    - 以維修單資訊與「零件追蹤（已更換）」自動帶入保養紀錄內容
    - 將維修單狀態同步為「已完成」、進度 100%
    - 跳轉至保養模組並自動開啟該筆保養紀錄（編輯）

### 3) Maintenance Deep Link 強化
- 新增 action 支援：`editRecord`、`viewRecord`（供 MNT-4 結案後直接開啟紀錄）

---

## 變更檔案清單

### 修改
- `core/config.js`
- `features/maintenance/maintenance.service.js`
- `features/maintenance/maintenance.ui.js`
- `features/repairs/repairs.ui.js`
- `features/repairs/repairs.ui-forms.js`

### 新增
- `functions/package.json`
- `functions/index.js`
- `docs/MNT-4_SETUP_CloudFunctions_AutoEmail.md`
- `docs/CHANGELOG_V161.158.md`
