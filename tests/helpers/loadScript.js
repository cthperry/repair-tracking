import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

/**
 * 以 VM 方式將既有前端檔案（IIFE / global）載入到 jsdom 的 window 環境。
 * - 這讓我們能在「不重構成 ES module」的前提下寫測試。
 * - injected 允許在單元測試中補入既有全域依賴。
 */
export function loadScript(relPath, injected = {}) {
  const abs = path.resolve(process.cwd(), relPath);
  const code = fs.readFileSync(abs, 'utf-8');

  const base = {
    window,
    self: window,
    globalThis: window,
    document: window.document,
    localStorage: window.localStorage,
    sessionStorage: window.sessionStorage,
    navigator: window.navigator,
    location: window.location,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    ...window,
    ...injected
  };

  const context = vm.createContext(base);
  vm.runInContext(code, context, { filename: relPath });
  return context;
}
