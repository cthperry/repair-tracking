import { beforeEach, describe, expect, it } from 'vitest';
import { loadScript } from '../helpers/loadScript.js';

function buildService({ basis = 'updated' } = {}) {
  window.localStorage.clear();
  window.currentUser = { uid: 'u1', displayName: 'Perry' };
  window.AppState = {
    getUid: () => 'u1',
    getCurrentUser: () => window.currentUser
  };
  window.AuthSystem = { authMode: 'local' };
  window.AppRegistry = {
    _map: new Map(),
    register(name, value) { this._map.set(name, value); },
    get(name) { return this._map.get(name) || null; },
    ensureReady: async () => true
  };
  window._svc = (name) => window.AppRegistry.get(name);
  window.WorkLogModel = {
    groupByRepairId(logs) {
      return (logs || []).reduce((acc, item) => {
        const key = item.repairId;
        acc[key] = acc[key] || [];
        acc[key].push(item);
        return acc;
      }, {});
    },
    getResultConfig: () => null
  };

  loadScript('core/config.js');
  loadScript('features/weekly/weekly.model.js');
  loadScript('features/weekly/weekly.service.js');

  const repairs = [
    {
      id: 'r-1',
      repairNo: 'R20260310-001',
      ownerUid: 'u1',
      ownerName: 'Perry',
      customer: '台積電',
      machine: 'FlexTRAK-S',
      status: '已完成',
      priority: 'normal',
      createdDate: '2026-03-10',
      createdAt: '2026-03-10T02:00:00.000Z',
      updatedAt: '2026-03-12T08:30:00.000Z',
      completedAt: '2026-03-12T08:30:00.000Z',
      issue: '更換模組',
      billing: { chargeable: true, orderDecision: 'ordered' }
    },
    {
      id: 'r-2',
      repairNo: 'R20260303-002',
      ownerUid: 'u1',
      ownerName: 'Perry',
      customer: '日月光',
      machine: 'AP-1000',
      status: '維修中',
      priority: 'urgent',
      createdDate: '2026-03-03',
      createdAt: '2026-03-03T03:00:00.000Z',
      updatedAt: '2026-03-11T09:00:00.000Z',
      issue: '軸承異音',
      billing: { chargeable: false }
    }
  ];

  window.AppRegistry.register('RepairService', {
    getAll: () => repairs
  });
  window.AppRegistry.register('QuoteService', {
    getSummaryForRepair: () => ({ count: 0, latest: null })
  });
  window.AppRegistry.register('OrderService', {
    getSummaryForRepair: () => ({ count: 0, latest: null }),
    getLatestForRepair: () => null
  });
  window.AppRegistry.register('RepairPartsService', {
    getForRepair: () => []
  });
  window.AppRegistry.register('WorkLogService', {
    isInitialized: true,
    getByDateRange: () => [{ repairId: 'r-2', workDate: '2026-03-11', action: '檢查異音' }]
  });
  window.AppRegistry.register('SettingsService', {
    settings: { weeklyThisWeekBasis: basis },
    getSettings: async () => ({ weeklyThisWeekBasis: basis })
  });

  const svc = window.AppRegistry.get('WeeklyService');
  svc.weekStart = '2026-03-10';
  svc.weekEnd = '2026-03-16';
  svc.nextPlans = [];
  return svc;
}

describe('Weekly 週報結構收斂', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('週報詳細區只輸出單一案件總覽，不重複列出新增與結案段落，也不輸出摘要統計區', () => {
    const svc = buildService({ basis: 'updated' });
    const text = svc.getThisWeekRepairsText();

    expect(text).not.toContain('摘要');
    expect(text).toContain('本週案件總覽');
    expect(text).not.toContain('（依更新日）');
    expect(text).not.toContain('（依建立日）');
    expect(text).not.toContain('本週新增案件');
    expect(text).not.toContain('本週結案案件');
    expect(text).not.toContain('本週週報依更新日統計');
    expect((text.match(/台積電 – FlexTRAK-S/g) || []).length).toBe(1);
  });

  it('週報內容不輸出登入者重複資訊，且本週處置會自動換行', () => {
    const svc = buildService({ basis: 'updated' });
    const repairSvc = window.AppRegistry.get('RepairService');
    const base = repairSvc.getAll();
    base[1].content = '機台健檢並training Charlie Leaking rate to high (415mT) Unloader SMEMA cable 缺少一條 Unloader 氣管破損建議更新 Shuttle loader side lane 1/3 oring 缺損需更換';
    window.AppRegistry.register('WorkLogService', {
      isInitialized: false,
      getByDateRange: () => []
    });

    const wrapped = svc.getThisWeekRepairsText();
    expect(wrapped).not.toContain('負責：Perry');
    expect(wrapped).not.toContain('建立：');
    expect(wrapped).not.toContain('更新：');
    expect(wrapped).toContain('工作內容：');
    expect(wrapped).toMatch(/工作內容：\n\s{6,}/);
  });

  it('週報輸出層不可再取得 repairNo 或 id', () => {
    const svc = buildService({ basis: 'updated' });
    const ctx = svc._getWeeklyContext();

    expect(ctx.reportRowsView.length).toBeGreaterThan(0);
    ctx.reportRowsView.forEach(v => {
      expect(v).not.toHaveProperty('repairNo');
      expect(v).not.toHaveProperty('id');
    });
    const tsmc = ctx.reportRowsView.find(v => v.caseLabel === '台積電 – FlexTRAK-S');
    expect(tsmc).toBeDefined();
  });
});
