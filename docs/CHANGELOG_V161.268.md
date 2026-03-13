# CHANGELOG — V161.268

日期：2026-02-21（Asia/Taipei）  
基底：V161.267

## 修正
### SOP Hub（SOP-1）
- 修正「建立 SOP」仍無法建立：
  - 建立/上傳按鈕改為 **click action（`data-action`）** 觸發，不再只依賴 `submit` 事件（避免被其他模組的全域委派攔截）。
  - `Enter` 送出仍保留：`submit` 事件依然可用，但主要路徑以 click 為準。
- 避免建立/更新因雲端寫入卡住：
  - SOPService 的雲端寫入改為 **本機先落地 + 雲端背景同步（含 3.5s 逾時警告）**。
  - 若雲端同步失敗/逾時，會觸發 `sops:sync-error` 並以 toast 顯示原因（例如：網路、Rules、權限）。

## 影響範圍
- 僅影響 SOP Hub 的表單觸發方式與雲端同步等待策略；資料結構不變。
