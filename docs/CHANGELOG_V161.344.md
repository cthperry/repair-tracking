# CHANGELOG V161.344

## 內容
- 客戶管理：customer-form 改成表單自有 submit 契約，並在 modal 開啟時再綁一次 direct submit fallback，避免只靠外層委派導致原生 reload。
- 客戶管理：company-rename-form 同步補上自有 submit 契約。
- 報價 PDF：品項欄位回到固定三層排版，並把換行邏輯改為詞彙優先，不再用整段字元硬切。
- 版本推進至 BUILD_NUMBER 344。
