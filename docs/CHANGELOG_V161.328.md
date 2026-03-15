# CHANGELOG V161.328

## 主題
移除未再使用的「機台保養」模組，並同步清除全站相依鏈。

## 結構性修正
- 移除 router / module-loader / Desktop / Mobile 對 maintenance 的入口與載入。
- 移除 Dashboard / Analytics / Notifications / Machines / Repairs / Settings 對 MaintenanceService 或保養狀態的依賴。
- 移除 RTDB rules 內 maintenance 索引設定。
