# UI 規格（企業系統風 / 低彩度 / Light Theme）

## 色彩 Token（CSS 變數）
- --color-background：#f8fafc
- --color-surface：#ffffff
- --color-surface-muted：#f1f5f9
- --color-border：#e2e8f0
- --color-text：#0f172a
- --color-text-secondary：#475569
- --color-primary：#2563eb
- --color-primary-hover：#1d4ed8
- --color-primary-soft：rgba(37, 99, 235, 0.10)
- --color-success：#16a34a
- --color-warning：#d97706
- --color-error：#dc2626
- --color-shadow：rgba(15, 23, 42, 0.08)
- --color-backdrop：rgba(15, 23, 42, 0.45)

## 按鈕層級
- Primary：.btn.primary（主動作）
- Secondary：.btn（次要動作）
- Danger：.btn.danger（刪除/不可逆動作）

## 表單輸入
- 統一使用 .input（含 input/select/textarea），focus 時使用 primarySoft 輕量外框。

## 卡片規則
- 卡片背景：surface
- 互動 hover：提升邊框至 primary，陰影略加深（shadow token）
- 重要操作：卡片上方外置 action bar（避免誤觸、避免資訊區被操作干擾）
