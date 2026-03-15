import { describe, it, expect, beforeEach } from 'vitest';
import { loadScript } from '../helpers/loadScript.js';

describe('Weekly 週報案件輸出契約', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    delete window.AppRegistry;
    delete window._svc;
    delete window.AppConfig;
    delete window.WeeklyModel;
    delete window.currentUser;
    delete window.AppState;
  });

  function bootstrap(repairs) {
    loadScript('core/registry.js');
    loadScript('core/config.js');
    loadScript('features/weekly/weekly.model.js');

    window.currentUser = { uid: 'u1', displayName: 'Perry' };
    window.AppState = {
      getUid: () => 'u1',
      getCurrentUser: () => window.currentUser
    };

    const { start } = window.WeeklyModel.getWeekRange(new Date());

    window.AppRegistry.register('RepairService', {
      getAll() {
        return repairs.map(r => ({
          ownerUid: 'u1',
          createdDate: start,
          createdAt: `${start}T08:00:00`,
          updatedAt: `${start}T09:00:00`,
          billing: {},
          ...r
        }));
      }
    });
    window.AppRegistry.register('QuoteService', { getSummaryForRepair: () => ({ count: 0, latest: null }) });
    window.AppRegistry.register('OrderService', { getSummaryForRepair: () => ({ count: 0, latest: null }), getLatestForRepair: () => null });
    window.AppRegistry.register('RepairPartsService', { getForRepair: () => [] });

    loadScript('features/weekly/weekly.service.js');

    const svc = window.AppRegistry.get('WeeklyService');
    svc.weekStart = start;
    svc.weekEnd = start;
    return svc;
  }

  it('輸出前先轉成週報專用 view model，不直接讀 repairNo / id', () => {
    const svc = bootstrap([{
      id: 'repair-doc-001',
      repairNo: 'R20260314-001',
      status: '處理中',
      customer: '台積電',
      machine: 'FlexTRAK-S'
    }]);

    const ctx = svc._getWeeklyContext();
    const view = ctx.reportRowsView[0];
    const text = svc.getThisWeekRepairsText();

    expect(view.caseLabel).toBe('台積電｜FlexTRAK-S');
    expect(Object.prototype.hasOwnProperty.call(view, 'repairNo')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(view, 'id')).toBe(false);
    expect(text).toContain('[處理中] 台積電｜FlexTRAK-S');
    expect(text).not.toContain('R20260314-001');
    expect(text).not.toContain('repair-doc-001');
  });

  it('客戶與機台皆空白時，顯示未命名案件', () => {
    const svc = bootstrap([{
      id: 'repair-doc-002',
      repairNo: 'R20260314-002',
      status: '待處理',
      customer: '',
      machine: ''
    }]);

    const text = svc.getThisWeekRepairsText();

    expect(text).toContain('[待處理] 未命名案件');
    expect(text).not.toContain('R20260314-002');
    expect(text).not.toContain('repair-doc-002');
  });
});
