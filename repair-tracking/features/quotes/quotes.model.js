/**
 * 報價管理 - Model
 * V161 - Quotes Module - Model Layer
 */

class QuoteModel {
  static newId(prefix = 'quote') {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }

  static nowIso() {
    return new Date().toISOString();
  }

  static normalize(item) {
    const q = item || {};
    const id = (q.id || '').toString().trim() || QuoteModel.newId('quote');
    const quoteNo = (q.quoteNo || '').toString().trim();
    const repairId = (q.repairId || '').toString().trim();
    // Defensive normalize：避免客戶更名、尾端空白、或不可見字元造成搜尋/篩選異常
    const customer = (q.customer || '').toString().trim();
    const status = (q.status || '').toString().trim() || '草稿';
    const currency = (q.currency || '').toString().trim() || 'TWD';

    const items = Array.isArray(q.items) ? q.items.map(QuoteModel.normalizeLine) : [];
    const totalAmount = items.reduce((sum, it) => sum + (it.qty * it.unitPrice), 0);

    const ownerUid = (q.ownerUid || '').toString().trim();
    const ownerName = (q.ownerName || '').toString().trim();
    const ownerEmail = (q.ownerEmail || '').toString();

    // 版本控制 / 修改者資訊
    // - version：每次儲存 +1（create=1）
    // - updatedBy*：最後一次儲存的使用者資訊
    // - approvedAt：狀態變更為「已核准」時記錄（由 UI/Service 設定）
    const verNum = Number(q.version);
    const version = Number.isFinite(verNum) ? verNum : 1;

    const updatedByUid = (q.updatedByUid || '').toString().trim();
    const updatedByName = (q.updatedByName || '').toString().trim();
    const updatedByEmail = (q.updatedByEmail || '').toString().trim();

    const createdByUid = (q.createdByUid || '').toString().trim();
    const createdByName = (q.createdByName || '').toString().trim();
    const createdByEmail = (q.createdByEmail || '').toString().trim();

    const approvedAt = (q.approvedAt || '').toString().trim();
    const approvedByUid = (q.approvedByUid || '').toString().trim();
    const approvedByName = (q.approvedByName || '').toString().trim();
    const approvedByEmail = (q.approvedByEmail || '').toString().trim();

    const note = (q.note || '').toString();
    const createdAt = (q.createdAt || '').toString().trim() || QuoteModel.nowIso();
    const updatedAt = (q.updatedAt || '').toString().trim() || createdAt;
    const isDeleted = (typeof q.isDeleted === 'boolean') ? q.isDeleted : false;

    return {
      id,
      quoteNo,
      repairId,
      customer,
      status,
      currency,
      items,
      totalAmount,
      ownerUid,
      ownerName,
      ownerEmail,
      version,
      updatedByUid,
      updatedByName,
      updatedByEmail,
      createdByUid,
      createdByName,
      createdByEmail,
      approvedAt,
      approvedByUid,
      approvedByName,
      approvedByEmail,
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
  window.QuoteModel = QuoteModel;
}

console.log('✅ QuoteModel loaded');
