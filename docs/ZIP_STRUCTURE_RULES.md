# ZIP_STRUCTURE_RULES

## 固定交付規則
1. ZIP 必須採平面根目錄封裝。
2. 解壓後直接看到專案內容，例如：
   - `V161_Desktop.html`
   - `V161_Mobile.html`
   - `core/`
   - `features/`
   - `docs/`
3. 禁止出現雙層同名巢狀資料夾，例如：
   - `RepairTracking_V161.xxx/.../RepairTracking_V161.xxx/...`

## 交付前檢查
- 檢查 ZIP 第一層清單。
- 若第一層只有單一資料夾，必須再確認其內是否又包同名根目錄。
- 若有雙層同名根目錄，該 ZIP 不可交付。

## 本專案現行定義
- 採「平面根目錄」為唯一有效格式。
