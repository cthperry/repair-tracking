import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

/**
 * 以 VM 方式將既有前端檔案（IIFE / global）載入到 jsdom 的 window 環境。
 * - 這讓我們能在「不重構成 ES module」的前提下寫測試。
 */
export function loadScript(relPath) {
  const abs = path.resolve(process.cwd(), relPath);
  const code = fs.readFileSync(abs, 'utf-8');

  // 讓 script 可以直接存取 window/document
  const context = vm.createContext({
    window,
    document: window.document,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  });

  vm.runInContext(code, context, { filename: relPath });
  return context;
}
