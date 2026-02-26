# 變更記錄｜V161.133（nolegacy）

基底：RepairTracking_V161.132_full_nolegacy

## 目標
P2-3（瘦身 + 維護性）：僅做維護性調整，不動功能、不改 UI。

## 變更摘要
### 1) 新增維修單：取消「上一次選擇」的內建值
- 移除新增模式下從 localStorage 帶入「優先級 / 產品線 / 設備」的行為。
- 同步移除儲存成功後寫入 localStorage 的 recent defaults。
- 保留 AppConfig 的系統預設值（status / progress / priority），避免 <select> 落到第一個 option。

## 影響範圍
- features/repairs/repairs.ui-forms.js
- core/config.js（BUILD_NUMBER）

## 自我驗證清單（最小集）
- 新增維修單開啟時：產品線/設備名稱不再自動帶入上一次選擇。
- 編輯既有維修單：資料顯示不受影響。
