/**
 * 零件管理 - Model
 * V161 - Parts Module - Model Layer
 *
 * 資料結構：
 * - parts/{partId}
 * - repairParts/{repairId}/{itemId}
 */

class PartModel {
  static newId(prefix = 'part') {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }

  static nowIso() {
    return new Date().toISOString();
  }

  static normalize(part) {
    const p = part || {};
    const id = (p.id || '').toString().trim() || PartModel.newId('part');

    const name = (p.name || '').toString().trim();
    const mpn = (p.mpn || '').toString().trim();
    const vendor = (p.vendor || '').toString().trim();
    const unit = (p.unit || '').toString().trim() || 'pcs';

    const unitPriceNum = Number(p.unitPrice);
    const unitPrice = Number.isFinite(unitPriceNum) ? unitPriceNum : 0;

    const stockNum = Number(p.stockQty);
    const stockQty = Number.isFinite(stockNum) ? stockNum : 0;

    const note = (p.note || '').toString();
    const isActive = (typeof p.isActive === 'boolean') ? p.isActive : true;

    const createdAt = (p.createdAt || '').toString().trim() || PartModel.nowIso();
    const updatedAt = (p.updatedAt || '').toString().trim() || createdAt;

    return {
      id,
      name,
      mpn,
      vendor,
      unit,
      unitPrice,
      stockQty,
      note,
      isActive,
      createdAt,
      updatedAt
    };
  }
}

class RepairPartModel {
  static newId(prefix = 'rpart') {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }

  static nowIso() {
    return new Date().toISOString();
  }

  static normalize(repairId, item) {
    const x = item || {};
    const id = (x.id || '').toString().trim() || RepairPartModel.newId('rpart');
    const rid = (repairId || x.repairId || '').toString().trim();

    const partId = (x.partId || '').toString().trim() || '';
    const partName = (x.partName || x.name || '').toString().trim();
    const mpn = (x.mpn || '').toString().trim();
    const vendor = (x.vendor || '').toString().trim();
    const unit = (x.unit || '').toString().trim() || 'pcs';

    const qtyNum = Number(x.qty);
    const qty = Number.isFinite(qtyNum) ? qtyNum : 1;

    const priceNum = Number(x.unitPrice);
    const unitPrice = Number.isFinite(priceNum) ? priceNum : 0;

    const status = (x.status || '').toString().trim() || '需求提出';
    const quoteId = (x.quoteId || '').toString().trim();
    const orderId = (x.orderId || '').toString().trim();

    const expectedDate = (x.expectedDate || '').toString().trim();
    const arrivedDate = (x.arrivedDate || '').toString().trim();
    const replacedDate = (x.replacedDate || '').toString().trim();

    const note = (x.note || '').toString();

    const createdAt = (x.createdAt || '').toString().trim() || RepairPartModel.nowIso();
    const updatedAt = (x.updatedAt || '').toString().trim() || createdAt;

    const isDeleted = (typeof x.isDeleted === 'boolean') ? x.isDeleted : false;

    return {
      id,
      repairId: rid,
      partId,
      partName,
      mpn,
      vendor,
      qty,
      unit,
      unitPrice,
      status,
      quoteId,
      orderId,
      expectedDate,
      arrivedDate,
      replacedDate,
      note,
      createdAt,
      updatedAt,
      isDeleted
    };
  }

  static lineTotal(item) {
    const qty = Number(item?.qty);
    const price = Number(item?.unitPrice);
    return (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(price) ? price : 0);
  }
}

if (typeof window !== 'undefined') {
  window.PartModel = PartModel;
  window.RepairPartModel = RepairPartModel;
}

console.log('✅ Parts Models loaded');
