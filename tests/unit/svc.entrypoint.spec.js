import { describe, it, expect } from 'vitest';
import { loadScript } from '../helpers/loadScript.js';

describe('window._svc（唯一 Service 入口）', () => {
  it('只回 AppRegistry.get()，不得依賴 window.*Service 或 fallback', () => {
    loadScript('core/registry.js');

    const obj = { ok: true };
    window.AppRegistry.register('AnyService', obj);

    expect(window._svc('AnyService')).toBe(obj);
    expect(window._svc('NotExists')).toBe(null);
  });
});
