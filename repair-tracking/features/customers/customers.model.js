/**
 * 客戶管理 - 資料模型
 * V160 - Customers Module - Data Model
 */

class CustomerModel {
  static create(data = {}) {
    const now = new Date().toISOString();
    return {
      id: data.id || this.generateCustomerId(),
      name: (data.name || data.customer || '').trim(),
      contact: (data.contact || '').trim(),
      phone: (data.phone || '').trim(),
      email: (data.email || '').trim(),
      address: (data.address || '').trim(),
      note: (data.note || '').trim(),
      repairCount: typeof data.repairCount === 'number' ? data.repairCount : 0,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
      version: data.version || 1,
      isDeleted: data.isDeleted || false
    };
  }

  static update(existing, updates = {}) {
    return {
      ...existing,
      ...updates,
      name: (updates.name !== undefined ? updates.name : existing.name || '').trim(),
      contact: (updates.contact !== undefined ? updates.contact : existing.contact || '').trim(),
      phone: (updates.phone !== undefined ? updates.phone : existing.phone || '').trim(),
      email: (updates.email !== undefined ? updates.email : existing.email || '').trim(),
      address: (updates.address !== undefined ? updates.address : existing.address || '').trim(),
      note: (updates.note !== undefined ? updates.note : existing.note || '').trim(),
      updatedAt: new Date().toISOString(),
      version: (existing.version || 1) + 1
    };
  }

  static validate(customer) {
    const errors = [];

    if (!customer.name || customer.name.trim() === '') {
      errors.push({ field: 'name', message: '客戶名稱為必填' });
    }

    if (customer.email) {
      const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!pattern.test(customer.email)) {
        errors.push({ field: 'email', message: 'Email 格式不正確' });
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  static generateCustomerId() {
    // 以時間戳為主，避免撞號；Firebase key 與 id 需一致
    return `C${Date.now()}`;
  }
}

if (typeof window !== 'undefined') {
  window.CustomerModel = CustomerModel;
}

console.log('✅ CustomerModel loaded');
