# CHANGELOG V161.352

日期：2026-03-15
BUILD_NUMBER：352

## 本版修正
- 補上 `window.CustomerUI = CustomerUI`，修正客戶管理公司更名同步與跨模組客戶明細開啟時的全域呼叫契約。
- 補上 `window.QuotesUI = QuotesUI`，修正零件、維修、全域搜尋等跨模組開啟報價明細時的全域呼叫契約。
- 補上 `window.OrdersUI = OrdersUI`，修正零件、維修、全域搜尋等跨模組開啟訂單明細時的全域呼叫契約。
- 補上 `window.KBUI = KBUI`，修正全域搜尋開啟 KB 檢視時的全域呼叫契約。
- 同步將 `CustomerUI / QuotesUI / OrdersUI` 單例註冊到 `AppRegistry`，避免共用入口與 singleton 脫鉤。
- `core/config.js` 進版至 `BUILD_NUMBER = 352`。
