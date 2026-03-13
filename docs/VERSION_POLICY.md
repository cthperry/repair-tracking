# 版本政策

## 1. 核心原則
1. 版本號只往前進，不可倒退
2. 每次交付必須有對應 changelog
3. 任何 ZIP 交付必須為單層結構
4. 文件統一放在 `docs/`

## 2. 版本格式
- 主版本：`V161`
- Build：`BUILD_NUMBER`
- 顯示格式：`V161.290`

實際程式來源：
- `core/config.js`
  - `VERSION`
  - `VERSION_DATE`
  - `BUILD_NUMBER`

## 3. 發版時必做事項
1. 更新 `core/config.js` 的 `VERSION_DATE`
2. 更新 `core/config.js` 的 `BUILD_NUMBER`
3. 新增 `docs/CHANGELOG_V161.xxx.md`
4. 更新必要的交接或工程文件
5. 進行最少一次自我驗證

## 4. 建議命名方式
```text
RepairTracking_V161.xxx_full_nolegacy_<phase>.zip
```

例如：
- `RepairTracking_V161.290_full_nolegacy_phase5_docs_foundation.zip`

## 5. Git 提交建議
```bash
git commit -m "Release: V161.xxx"
```

## 6. 禁止事項
- 禁止版本回寫成舊號
- 禁止只改 ZIP 名稱但未改 `core/config.js`
- 禁止未更新 changelog 就交付
- 禁止產出雙層巢狀 ZIP
