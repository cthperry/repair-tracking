import { describe, it, expect, vi } from 'vitest';
import { loadScript } from '../helpers/loadScript.js';

describe('WorkLog legacy migration', () => {
  it('WorkLogModel.fromLegacy 會產生穩定 ID 並完成基本欄位對應', () => {
    loadScript('features/worklogs/worklog.model.js');

    const log1 = window.WorkLogModel.fromLegacy({
      source: 'repairLogs',
      repairId: 'R001',
      legacyId: 'L001',
      legacy: { tsStart: '2026-02-01T10:00:00Z', content: '更換濾心', status: '完成' }
    });

    const log2 = window.WorkLogModel.fromLegacy({
      source: 'repairLogs',
      repairId: 'R001',
      legacyId: 'L001',
      legacy: { tsStart: '2026-02-01T10:00:00Z', content: '更換濾心', status: '完成' }
    });

    expect(log1.id).toBe(log2.id); // idempotent
    expect(log1.repairId).toBe('R001');
    expect(log1.workDate).toBe('2026-02-01');
    expect(log1.action).toBe('更換濾心');
    expect(log1.result).toBe('completed');
  });

  it('WorkLogService._migrateLegacyObject dryRun 不寫入；正式搬移不重複增加本地快取', async () => {
    loadScript('features/worklogs/worklog.model.js');
    loadScript('features/worklogs/worklog.service.js');

    const svc = new window.WorkLogService();

    const setCalls = [];
    svc.workLogsRef = {
      child: (id) => ({
        set: vi.fn(async (obj) => { setCalls.push({ id, obj }); })
      })
    };

    const legacyRoot = {
      R001: {
        L001: { tsStart: '2026-02-01T10:00:00Z', content: '更換濾心', status: '完成' }
      }
    };

    const dry = await svc._migrateLegacyObject(legacyRoot, { source: 'repairLogs', dryRun: true, limit: 500 });
    expect(dry.dryRun).toBe(true);
    expect(dry.migrated).toBe(1);
    expect(setCalls.length).toBe(0);

    const run1 = await svc._migrateLegacyObject(legacyRoot, { source: 'repairLogs', dryRun: false, limit: 500 });
    expect(run1.migrated).toBe(1);
    expect(setCalls.length).toBe(1);
    expect(svc.workLogs.length).toBe(1);

    const run2 = await svc._migrateLegacyObject(legacyRoot, { source: 'repairLogs', dryRun: false, limit: 500 });
    expect(run2.migrated).toBe(1);
    // 仍是 set 同一筆（覆寫），但本地快取不應變成 2 筆
    expect(svc.workLogs.length).toBe(1);
  });
});
