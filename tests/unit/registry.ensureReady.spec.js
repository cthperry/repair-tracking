import { describe, it, expect } from 'vitest';
import { loadScript } from '../helpers/loadScript.js';

describe('AppRegistry.ensureReady', () => {
  it('可以集中化初始化，且多次呼叫不重複 init/loadAll', async () => {
    // 載入核心 registry（IIFE 會把 AppRegistry/_svc 掛到 window）
    loadScript('core/registry.js');

    expect(typeof window.AppRegistry).toBe('object');
    expect(typeof window.AppRegistry.ensureReady).toBe('function');
    expect(typeof window._svc).toBe('function');

    const calls = { init: 0, loadAll: 0 };
    const svc = {
      isInitialized: false,
      async init() { calls.init += 1; this.isInitialized = true; },
      async loadAll() { calls.loadAll += 1; }
    };

    window.AppRegistry.register('TestService', svc);

    await window.AppRegistry.ensureReady(['TestService']);
    await window.AppRegistry.ensureReady(['TestService']);

    expect(calls.init).toBe(1);
    expect(calls.loadAll).toBe(1);
  });
});
