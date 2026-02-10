import { describe, it, expect, vi } from 'vitest';
import { loadScript } from '../helpers/loadScript.js';

describe('CustomerService.renameCompanyEverywhere', () => {
  it('會同步更新 Customers 同公司聯絡人，並呼叫 Repair/Quote/Order 服務的 rename 方法', async () => {
    loadScript('core/registry.js');
    loadScript('features/customers/customers.service.js');

    const svc = new window.CustomerService();

    // mock customers ref
    const updateCalls = [];
    svc.customersRef = {
      child: (id) => ({
        update: vi.fn(async (patch) => { updateCalls.push({ id, patch }); })
      })
    };

    svc.customers = [
      { id: 'c1', name: 'ACME', isDeleted: false, version: 1 },
      { id: 'c2', name: '  acme   ', isDeleted: false, version: 5 },
      { id: 'c3', name: 'Other', isDeleted: false, version: 2 },
      { id: 'c4', name: 'ACME', isDeleted: true, version: 9 }
    ];

    // mock other services
    const RepairService = {
      isInitialized: true,
      loadAll: vi.fn(async () => {}),
      renameCompany: vi.fn(async () => ({ updated: 3 }))
    };
    const QuoteService = {
      isInitialized: true,
      loadAll: vi.fn(async () => {}),
      renameCustomer: vi.fn(async () => ({ count: 2 }))
    };
    const OrderService = {
      isInitialized: true,
      loadAll: vi.fn(async () => {}),
      renameCustomer: vi.fn(async () => ({ updated: 1 }))
    };

    window.AppRegistry.register('RepairService', RepairService);
    window.AppRegistry.register('QuoteService', QuoteService);
    window.AppRegistry.register('OrderService', OrderService);

    // ensureReady will call loadAll once (registry 自己測過一次，這裡只驗證有呼叫到 rename)
    const res = await svc.renameCompanyEverywhere(' ACME', 'New Co');

    expect(res).toEqual({ customers: 2, repairs: 3, quotes: 2, orders: 1 });

    // customers: only c1/c2 updated
    expect(updateCalls.length).toBe(2);
    expect(updateCalls.map(x => x.id).sort()).toEqual(['c1', 'c2']);

    for (const c of updateCalls) {
      expect(c.patch.name).toBe('New Co');
      expect(typeof c.patch.updatedAt).toBe('string');
      expect(typeof c.patch.version).toBe('number');
    }

    expect(RepairService.renameCompany).toHaveBeenCalledWith(' ACME', 'New Co');
    expect(QuoteService.renameCustomer).toHaveBeenCalledWith(' ACME', 'New Co');
    expect(OrderService.renameCustomer).toHaveBeenCalledWith(' ACME', 'New Co');
  });
});
