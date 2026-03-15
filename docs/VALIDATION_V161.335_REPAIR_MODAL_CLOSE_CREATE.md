# VALIDATION V161.335 - Repair Modal Close / Create

## 已執行
- `node --check features/repairs/repairs.ui.js`
- `node --check features/repairs/repairs.ui-forms.js`
- `node --check core/config.js`
- 以 Node VM + fake DOM 驗證：
  - `window.repairUI.closeModal` 存在
  - `window.RepairUI.closeModal` 存在
  - 呼叫後 modal 會 hidden
  - `#repair-modal-content` 內容會清空
  - `modal-wide` 尺寸 class 會移除

## 已確認
- 關閉橋接缺失已補上
- 建立成功後不再因 closeModal 缺失而進入 catch
- ZIP 可用平面根目錄方式重新封裝

## 尚待使用者實測
- 新增維修單實際 Firebase 寫入
- 編輯維修單後的 modal 關閉
- 取消 / 右上角關閉 / 點背景關閉是否都正常
