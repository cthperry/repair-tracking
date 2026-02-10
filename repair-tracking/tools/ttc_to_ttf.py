#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""將 .ttc（TrueType Collection）轉出單一 .ttf。

背景
- Windows 的「細明體」通常是 mingliu.ttc（同一個 .ttc 內含多套字體）。
- pdf-lib 1.17.1 在瀏覽器環境直接嵌入 .ttc 可能觸發：this.font.layout is not a function
  因此建議先在本機把 .ttc 轉出對應的 .ttf，再放入：assets/fonts/mingliu.ttf

用法（Windows 範例）
1) 安裝 Python 3
2) 安裝 fonttools：
   pip install fonttools
3) 列出 .ttc 內的字體（建議先做）：
   python tools/ttc_to_ttf.py "C:\\Windows\\Fonts\\mingliu.ttc" --list
4) 轉檔（以 index 0 為例）：
   python tools/ttc_to_ttf.py "C:\\Windows\\Fonts\\mingliu.ttc" assets\\fonts\\mingliu.ttf --index 0

備註
- --index 依實際列出的結果選擇（不同 Windows 版本可能順序不同）。
- 轉出後重新整理頁面，再輸出 PDF，即會優先套用 mingliu.ttf。
"""

from __future__ import annotations

import argparse
import os
import sys

try:
    from fontTools.ttLib import TTCollection
except Exception as e:
    print('錯誤：找不到 fontTools。請先執行：pip install fonttools', file=sys.stderr)
    raise


def get_font_name(ttfont) -> str:
    """盡量取出可讀的字體家族名稱。"""
    try:
        name_table = ttfont['name']
        # nameID=1：Font Family
        for rec in name_table.names:
            if rec.nameID == 1:
                try:
                    return rec.toUnicode()
                except Exception:
                    continue
        # fallback
        return name_table.getDebugName(1) or '（未知）'
    except Exception:
        return '（未知）'


def main() -> int:
    ap = argparse.ArgumentParser(description='將 .ttc（TrueType Collection）轉出單一 .ttf。')
    ap.add_argument('ttc', help='輸入 .ttc 路徑（例如 C:\\Windows\\Fonts\\mingliu.ttc）')
    ap.add_argument('out', nargs='?', help='輸出 .ttf 路徑（例如 assets\\fonts\\mingliu.ttf）')
    ap.add_argument('--index', type=int, default=0, help='要轉出的字體索引（預設 0）')
    ap.add_argument('--list', action='store_true', help='僅列出 .ttc 內的字體清單，不輸出檔案')

    args = ap.parse_args()

    if not os.path.isfile(args.ttc):
        print(f'錯誤：找不到檔案：{args.ttc}', file=sys.stderr)
        return 2

    ttc = TTCollection(args.ttc)

    if args.list:
        print(f'共 {len(ttc.fonts)} 套字體：')
        for i, f in enumerate(ttc.fonts):
            print(f'  [{i}] {get_font_name(f)}')
        return 0

    if not args.out:
        print('錯誤：未提供輸出檔案路徑。或改用 --list 先檢視字體清單。', file=sys.stderr)
        return 2

    idx = args.index
    if idx < 0 or idx >= len(ttc.fonts):
        print(f'錯誤：index 超出範圍：{idx}（可用 --list 查看）', file=sys.stderr)
        return 2

    out_dir = os.path.dirname(os.path.abspath(args.out))
    if out_dir and not os.path.isdir(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    ttc.fonts[idx].save(args.out)
    print(f'完成：{args.out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
