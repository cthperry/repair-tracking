# 維修紀錄追蹤系統 V161.157（nolegacy）變更摘要

版本資訊
- VERSION_DATE：2026-01-08
- BUILD_NUMBER：157

## MNT-3｜機台保養（Maintenance）與「機台序號」整合

### 1) 機台序號詳情頁新增「保養」摘要卡
位置：機台序號詳情頁（右側摘要區塊）新增 **🛠 保養** summary box，顯示：
- 狀態（逾期／即將到期／正常／尚無紀錄／未建立）
- 上次保養日期、下次到期日期
- 週期資訊（每 N 天／週／月）

### 2) 一鍵跳轉／一鍵建立
在 **🛠 保養** summary box 提供快速操作：
- **開啟**：跳轉至「機台保養管理」模組，並自動以該序號作為搜尋條件
  - 若該序號尚未建立設備：自動開啟「新增設備」視窗並預填序號與維修單帶入資訊
- **建立設備**：若設備不存在，直接建立（upsert）設備資料並開啟「編輯設備」
- **＋ 建紀錄**：若設備不存在會先建立設備，再自動開啟「新增保養紀錄」視窗

### 3) Maintenance 模組新增 Deep Link 支援
新增 `window.__maintenanceDeepLink` 消費機制，支援：
- 指定 tab（dashboard/equipments/records/reports）
- 預設搜尋（searchEquip）
- 指定 filterEquipmentId（紀錄列表依設備過濾）
- 指定 action：createEquipment（含 prefill）、editEquipment、createRecord

### 4) 新增設備視窗支援預填（prefill）
`MaintenanceUI.openCreateEquipment(prefill)` 支援外部呼叫預填：
- 設備編號、名稱、型號、位置、負責、Email、安裝日期
- 週期（cycleEvery/cycleUnit）、提醒天數（remindDays）
- Tags、Checklist 模板（checklistTemplate）

## 變更檔案
- 修改：features/machines/machines.ui.js
- 修改：features/machines/machines.controller.js
- 修改：features/maintenance/maintenance.ui.js
- 修改：core/config.js
- 新增：docs/CHANGELOG_V161.157.md
