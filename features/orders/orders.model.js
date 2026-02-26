/**
 * 訂單/採購追蹤 - Model
 * V161 - Orders Module - Model Layer
 */

class OrderModel {
  static newId(prefix = 'order') {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }

  static nowIso() {
    return new Date().toISOString();
  }

  static normalize(item) {
    const o = item || {};
    const id = (o.id || '').toString().trim() || OrderModel.newId('order');
    const orderNo = (o.orderNo || '').toString().trim();
    const quoteId = (o.quoteId || '').toString().trim();
    const repairId = (o.repairId || '').toString().trim();
    const customer = (o.customer || '').toString();
    // 狀態對齊 AppConfig.business.orderStatus：建立 / 已下單 / 已到貨 / 已結案 / 已取消
    let status = (o.status || '').toString().trim() || '建立';
    // 舊資料相容：草稿 -> 建立
    if (status === '草稿') status = '建立';
    const supplier = (o.supplier || '').toString();
    const currency = (o.currency || '').toString().trim() || 'TWD';

    const items = Array.isArray(o.items) ? o.items.map(OrderModel.normalizeLine) : [];
    const totalAmount = items.reduce((sum, it) => sum + (it.qty * it.unitPrice), 0);

    const orderedAt = (o.orderedAt || '').toString().trim();
    const expectedAt = (o.expectedAt || '').toString().trim();
    const receivedAt = (o.receivedAt || '').toString().trim();

    const ownerUid = (o.ownerUid || '').toString().trim();
    const ownerName = (o.ownerName || '').toString();
    const ownerEmail = (o.ownerEmail || '').toString();

    const note = (o.note || '').toString();
    const createdAt = (o.createdAt || '').toString().trim() || OrderModel.nowIso();
    const updatedAt = (o.updatedAt || '').toString().trim() || createdAt;
    const isDeleted = (typeof o.isDeleted === 'boolean') ? o.isDeleted : false;

    return {
      id,
      orderNo,
      quoteId,
      repairId,
      customer,
      status,
      supplier,
      currency,
      items,
      totalAmount,
      orderedAt,
      expectedAt,
      receivedAt,
      ownerUid,
      ownerName,
      ownerEmail,
      note,
      createdAt,
      updatedAt,
      isDeleted
    };
  }

  static normalizeLine(line) {
    const x = line || {};
    const name = (x.name || '').toString();
    const mpn = (x.mpn || '').toString();
    const vendor = (x.vendor || '').toString();
    const qtyNum = Number(x.qty);
    const qty = Number.isFinite(qtyNum) ? qtyNum : 1;
    const priceNum = Number(x.unitPrice);
    const unitPrice = Number.isFinite(priceNum) ? priceNum : 0;
    const unit = (x.unit || '').toString().trim() || 'pcs';
    return { name, mpn, vendor, qty, unit, unitPrice };
  }
}

if (typeof window !== 'undefined') {
  window.OrderModel = OrderModel;
}

console.log('✅ OrderModel loaded');
