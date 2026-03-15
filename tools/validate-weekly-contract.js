#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const sandbox = {
  console,
  localStorage: { getItem: () => null, setItem: () => null, removeItem: () => null },
  window: {
    currentUser: { uid: 'u1', displayName: 'Perry' },
    AppState: { getUid: () => 'u1', getCurrentUser: () => ({ uid: 'u1', displayName: 'Perry' }) },
    AuthSystem: { authMode: 'local' },
    AppRegistry: {
      _map: new Map(),
      register(name, obj) { this._map.set(name, obj); },
      get(name) { return this._map.get(name) || null; },
      ensureReady: async () => true
    }
  },
  Date,
  Math,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  RegExp,
  Set,
  Map,
  Promise
};
sandbox.window._svc = (name) => sandbox.window.AppRegistry.get(name);
sandbox.AppConfig = {
  system: { timezoneOffset: 8, storage: { prefix: 'repair_tracking_' } },
  weekly: {
    caseDisplay: {
      fallbackLabel: '未命名案件',
      separator: ' – ',
      overviewTitle: '本週案件總覽',
      showSummarySection: false,
      showBasisDateLine: false,
      titleIncludeStatus: false,
      issueWrapWidth: 44,
      workSummaryWrapWidth: 44,
      completionWrapWidth: 44,
      billingWrapWidth: 44,
      issueLabel: '問題描述',
      workSummaryLabel: '工作內容',
      completionLabel: '完成狀態',
      billingLabel: '收費',
      mergePartsIntoWorkContent: true
    },
    planDisplay: {
      fallbackLabel: '未命名計畫',
      planLabel: '計畫內容',
      wrapWidth: 44,
      customerPlaceholder: '客戶',
      projectPlaceholder: '專案/機型',
      planPlaceholder: '計畫內容'
    }
  },
  getStatusByValue(value) {
    const map = { '已完成': { progress: 100 }, '處理中': { progress: 60 }, '新建': { progress: 0 } };
    return map[value] || null;
  },
  getBusinessStatusRank() { return 0; },
  getBillingFlowMeta(billing) {
    if (billing?.chargeable === false) return { isFree: true, isChargeable: false, isOrdered: false, isNotOrdered: false, isOrderUnknown: false };
    if (billing?.chargeable === true && billing?.orderStatus === 'ordered') return { isChargeable: true, isOrdered: true, isNotOrdered: false, isOrderUnknown: false };
    if (billing?.chargeable === true && billing?.orderStatus === 'not_ordered') {
      return {
        isChargeable: true,
        isOrdered: false,
        isNotOrdered: true,
        isOrderUnknown: false,
        stageMeta: { label: '待報價' },
        reasonMeta: { label: '價格過高' },
        note: '客戶待確認'
      };
    }
    if (billing?.chargeable === true) return { isChargeable: true, isOrdered: false, isNotOrdered: false, isOrderUnknown: true };
    return { isChargeable: false, isFree: false, isOrdered: false, isNotOrdered: false, isOrderUnknown: false };
  }
};
sandbox.window.AppConfig = sandbox.AppConfig;
sandbox.WorkLogModel = {
  groupByRepairId(list) {
    return (Array.isArray(list) ? list : []).reduce((acc, item) => {
      const key = String(item.repairId || '').trim();
      if (!key) return acc;
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
  },
  getResultConfig(result) {
    return result ? { label: String(result).trim() } : null;
  }
};
sandbox.window.WorkLogModel = sandbox.WorkLogModel;
vm.createContext(sandbox);
vm.runInContext(read('features/weekly/weekly.model.js'), sandbox, { filename: 'weekly.model.js' });
vm.runInContext(read('features/weekly/weekly.service.js'), sandbox, { filename: 'weekly.service.js' });

const repairs = [
  {
    id: 'r1',
    ownerUid: 'u1',
    customer: 'TI',
    machine: 'FasTRAK',
    issue: 'PCB 7 issue',
    content: '確認 input conveyor motor 無法運作',
    status: '處理中',
    progress: 60,
    createdDate: '2026-03-10',
    createdAt: '2026-03-10T01:00:00.000Z',
    updatedAt: '2026-03-12T09:30:00.000Z',
    billing: { chargeable: true }
  },
  {
    id: 'r2',
    ownerUid: 'u1',
    customer: 'PTI',
    machine: 'FlexTRAK-F3',
    issue: '機台健檢',
    content: '機台健檢並 training Charlie',
    status: '已完成',
    progress: 100,
    createdDate: '2026-03-11',
    createdAt: '2026-03-11T01:00:00.000Z',
    updatedAt: '2026-03-13T06:30:00.000Z',
    completedAt: '2026-03-13T06:30:00.000Z',
    billing: { chargeable: true, orderStatus: 'not_ordered' },
    needParts: true
  }
];
const worklogs = [
  { repairId: 'r1', workDate: '2026-03-10', action: 'Software checks were conducted with March engineers.', result: '待續', findings: 'All motor functions were checked.', partsUsed: '' },
  { repairId: 'r2', workDate: '2026-03-12', action: 'Leaking rate 過高 (415 mT)', result: '已完成', findings: 'Unloader 氣管破損建議更新', partsUsed: 'Shuttle loader side lane 1/3 O-ring' }
];
const repairParts = {
  getForRepair(repairId) {
    if (repairId === 'r2') return [{ status: '待料' }, { status: '待料' }, { status: '已到貨' }];
    return [];
  }
};
const settingsSvc = { getSettings: async () => ({ weeklyRecipients: 'team@example.com', signature: 'Premtek' }) };
const repairSvc = { getAll: () => repairs };
const workLogSvc = { isInitialized: true, getByDateRange: () => worklogs };

sandbox.window.AppRegistry.register('SettingsService', settingsSvc);
sandbox.window.AppRegistry.register('RepairService', repairSvc);
sandbox.window.AppRegistry.register('WorkLogService', workLogSvc);
sandbox.window.AppRegistry.register('RepairPartsService', repairParts);

const svc = sandbox.window.AppRegistry.get('WeeklyService');
assert(svc, 'WeeklyService 未註冊');
(async () => {
  await svc.init();
  svc.weekStart = '2026-03-09';
  svc.weekEnd = '2026-03-15';
  svc.nextPlans = [
    sandbox.window.WeeklyModel.normalizePlan({ customer: 'PTI', project: 'FlexTRAK-F3', plan: '更換 input conveyor motor' }),
    sandbox.window.WeeklyModel.normalizePlan({ customer: '', project: '', plan: '' })
  ];

  const weeklyText = svc.getThisWeekRepairsText();
  const nextPlans = svc.getNextWeekPlansText();
  const email = await svc.buildWeeklyEmailPayload();

  const requiredTokens = ['問題描述：', '工作內容：', '完成狀態：', '收費：', '計畫內容：', 'TI – FasTRAK', 'PTI – FlexTRAK-F3'];
  requiredTokens.forEach((token) => assert((weeklyText + '\n' + nextPlans + '\n' + email.body).includes(token), `缺少固定契約文字：${token}`));

  const forbiddenTokens = ['問題摘要', '本週處置', '商務摘要', '料件摘要', '[需要零件]'];
  forbiddenTokens.forEach((token) => assert(!(weeklyText + '\n' + nextPlans + '\n' + email.body).includes(token), `仍殘留舊欄位：${token}`));

  assert(weeklyText.includes('需要零件（共 3 筆：待料×2／已到貨）'), '零件摘要未併入工作內容');
  assert(weeklyText.includes('已完成 (100%)'), '完成狀態輸出錯誤');
  assert(weeklyText.includes('需收費（未下單：待報價／價格過高／客戶待確認）'), '收費摘要輸出錯誤');
  assert(email.subject.includes('Weekly Report - Perry'), '主旨格式錯誤');
  assert(email.body.includes(weeklyText), 'Email 內容與本週案件輸出不一致');
  assert(email.body.includes(nextPlans), 'Email 內容與下週計畫輸出不一致');
  assert(email.to === 'team@example.com', '收件人讀取錯誤');

  console.log('✅ validate-weekly-contract passed');
})().catch((err) => {
  console.error('❌ validate-weekly-contract failed:', err.message || err);
  process.exit(1);
});
