# CHANGELOG V161.335

日期：2026-03-14  
時區：Asia/Taipei

## 本版主題
修正 Repairs 表單 modal 無法取消 / 關閉，且成功建立後仍被誤判為失敗的結構性問題。

## 現象
- 新增維修單按「建立」後仍停留在視窗內。
- 右上角關閉與底部取消無效。
- 使用者體感為「不能建立、不能取消、不能關閉」。

## 根因
- Repairs modal 的事件系統統一走 `data-action="repairs.closeModal"` 與 `window.RepairUI.closeModal()`。
- 但 V161.334 實際上沒有提供 `RepairUI.closeModal` bridge，也沒有 instance `closeModal()` 實作。
- 因此：
  - 取消 / 關閉按鈕點了沒有可執行目標。
  - 建立成功後，`handleSubmit()` 在呼叫 `window.RepairUI.closeModal()` 時拋錯，造成流程被 catch 成「儲存失敗」，但主寫入可能其實已經完成。

## 修正
- 在 `features/repairs/repairs.ui.js` 新增 instance `closeModal(options)`。
- 新增 `RepairUI.closeModal()` / `RepairUI.isModalOpen()` static bridge，統一轉呼叫 `window.repairUI`。
- `closeModal()` 會一併：
  - 關閉公司 / 聯絡人下拉
  - 清理表單快取與事件控制器
  - 清除 modal content
  - 清除 modal 尺寸 class
  - 重置 currentRepair / currentView
- `features/repairs/repairs.ui-forms.js` 的成功送出路徑改為優先呼叫 instance `this.closeModal()`，不再只依賴 static bridge。

## 影響範圍
- Repairs 新增表單
- Repairs 編輯表單
- Repairs 詳情 modal 關閉流程
- Repairs 成功送出後的收尾流程

## 判定
本次屬於結構性修正，不是補丁式處理。
