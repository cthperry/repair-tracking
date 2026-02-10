/**
 * 週報系統 - 服務層
 * V161 - Weekly Module - Service Layer
 *
 * 職責：
 * - 彙整本週維修單（只讀）
 * - 管理下週計畫（可編輯，插入最上方，刪除不需 confirm）
 * - 讀取設定（收件人/簽名檔）
 */

class WeeklyService {
  constructor() {
    this.isInitialized = false;
    this.isFirebase = false;

    this.weekStart = '';
    this.weekEnd = '';

    this.nextPlans = [];

    this.db = null;
    this.ref = null;
  }

  async init() {
    if (this.isInitialized) return;

    this.isFirebase = (window.AuthSystem?.authMode === 'firebase' && typeof firebase !== 'undefined');
    if (this.isFirebase) {
      this.db = firebase.database();
      // 以 UID 隔離，避免互相覆寫
      const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || 'unknown');
      this.ref = this.db.ref(`weeklyPlans/${uid}`);
    }

    const { start, end } = WeeklyModel.getWeekRange(new Date());
    this.weekStart = start;
    this.weekEnd = end;

    await this.loadPlans();

    this.isInitialized = true;
    console.log('✅ WeeklyService initialized');
  }

  getWeekKey() {
    // 以週一日期作為 key
    return this.weekStart || WeeklyModel.getWeekRange(new Date()).start;
  }

  getLocalKey() {
    const prefix = AppConfig?.system?.storage?.prefix || 'repair_tracking_';
    const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || 'unknown');
    return `${prefix}weekly_plans_${uid}_${this.getWeekKey()}`;
  }

  async loadPlans() {
    // 優先 Firebase
    if (this.ref) {
      try {
        const snap = await this.ref.child(this.getWeekKey()).once('value');
        const data = snap.val();
        if (data && typeof data === 'object') {
          const arr = Array.isArray(data) ? data : Object.values(data);
          this.nextPlans = (arr || []).map(WeeklyModel.normalizePlan).filter(Boolean);
          this.savePlansToLocal();
          return;
        }
      } catch (e) {
        console.warn('WeeklyService load from Firebase failed, fallback to local:', e);
      }
    }

    // localStorage
    try {
      const raw = localStorage.getItem(this.getLocalKey());
      if (raw) {
        const arr = JSON.parse(raw);
        this.nextPlans = (arr || []).map(WeeklyModel.normalizePlan).filter(Boolean);
      } else {
        // 預設建立 1 筆空白
        this.nextPlans = [WeeklyModel.normalizePlan({ customer: '', project: '', plan: '' })];
      }
    } catch (e) {
      this.nextPlans = [WeeklyModel.normalizePlan({ customer: '', project: '', plan: '' })];
    }
  }

  savePlansToLocal() {
    try {
      localStorage.setItem(this.getLocalKey(), JSON.stringify(this.nextPlans || []));
    } catch (e) {
      console.warn('WeeklyService savePlansToLocal failed:', e);
    }
  }

  async persistPlans() {
    this.savePlansToLocal();
    if (this.ref) {
      try {
        // 用 array 直接存
        await this.ref.child(this.getWeekKey()).set(this.nextPlans || []);
      } catch (e) {
        console.warn('WeeklyService persistPlans to Firebase failed:', e);
      }
    }
  }

  async addPlanTop() {
    const item = WeeklyModel.normalizePlan({ customer: '', project: '', plan: '' });
    this.nextPlans = [item, ...(this.nextPlans || [])];
    await this.persistPlans();
    return item;
  }

  async deletePlan(id) {
    this.nextPlans = (this.nextPlans || []).filter(p => p.id !== id);
    if (this.nextPlans.length === 0) {
      this.nextPlans = [WeeklyModel.normalizePlan({ customer: '', project: '', plan: '' })];
    }
    await this.persistPlans();
  }

  async updatePlan(id, patch) {
    const idx = (this.nextPlans || []).findIndex(p => p.id === id);
    if (idx === -1) return;
    const updated = WeeklyModel.normalizePlan({ ...this.nextPlans[idx], ...patch, id, updatedAt: new Date().toISOString() });
    this.nextPlans[idx] = updated;
    await this.persistPlans();
  }

  /**
   * 彙整本週維修單（只讀）
   */
  getThisWeekRepairsText() {
    const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || '');

    const basis = (window.SettingsService?.settings?.weeklyThisWeekBasis === 'updated') ? 'updated' : 'created';
    const getBasisDate = (r) => {
      if (!r || typeof r !== 'object') return '';
      if (basis === 'created') {
        const cd = String(r.createdDate || '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(cd)) return cd;
        const iso = r.createdAt || '';
        if (!iso) return '';
        try { return WeeklyModel.toTaiwanDateString(new Date(iso)); } catch (_) { return ''; }
      }
      // updated
      const iso = r.updatedAt || r.createdAt || '';
      if (!iso) return '';
      try { return WeeklyModel.toTaiwanDateString(new Date(iso)); } catch (_) { return ''; }
    };
    const repairs = (window.RepairService && typeof window.RepairService.getAll === 'function')
      ? window.RepairService.getAll()
      : [];

    const start = this.weekStart;
    const end = this.weekEnd;

    const normalizeLines = (text) => {
      const raw = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = raw.split('\n').map(l => l.replace(/\t/g, '    ').trimRight());
      // trim leading/trailing empty lines
      while (lines.length && !lines[0].trim()) lines.shift();
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
      // collapse excessive empty lines (>=2)
      const out = [];
      let empty = 0;
      for (const l of lines) {
        if (!l.trim()) {
          empty += 1;
          if (empty <= 1) out.push('');
        } else {
          empty = 0;
          out.push(l);
        }
      }
      return out;
    };

    // label + indent formatting (讓 email 文字可讀性一致)
    const formatLabeledBlock = (label, text, baseIndent = '   ') => {
      const lines = normalizeLines(text);
      const hasColon = /[：:]$/.test(label);
      const labelLine = `${baseIndent}${hasColon ? label : (label + '：')}`;

      if (!lines.length) {
        // label 單獨一行，內容放下一行（保持一致縮排）
        return [labelLine, `${baseIndent}   （未填）`].join('\n');
      }

      if (lines.length === 1) {
        // 單行內容：直接接在 label 後（更緊湊）
        return `${labelLine}${lines[0] ? (labelLine.endsWith('：') || labelLine.endsWith(':') ? '' : '') : ''}${lines[0]}`;
      }

      const childIndent = baseIndent + '   '; // 6 spaces
      return [
        labelLine,
        ...lines.map(l => (l && l.trim()) ? `${childIndent}${l}` : '')
      ].join('\n');
    };


    const getSortKey = (r) => {
      if (!r || typeof r !== 'object') return '';
      if (basis === 'created') {
        const cd = String(r.createdDate || '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(cd)) return cd + 'T23:59:59';
        return String(r.createdAt || r.updatedAt || '');
      }
      return String(r.updatedAt || r.createdAt || '');
    };
    const rows = (repairs || [])
      .filter(r => !r.isDeleted)
      .filter(r => !uid || r.ownerUid === uid)
      .filter(r => { const d = getBasisDate(r); return d && d >= start && d <= end; })
      .sort((a, b) => String(getSortKey(b)).localeCompare(String(getSortKey(a))));

    if (!rows.length) return '';

    const lines = rows.map((r, i) => {
      const cust = (r.customer || '').trim();
      const machine = (r.machine || '').trim();

      // 問題描述（issue）：必須在週報中單獨呈現，不與工作內容混用
      const issue = (r.issue || '').trim();

      // 週報「工作內容」必須顯示實際處理內容（不是問題描述）。
      // content：維修單中的「工作內容/處理內容」（用於週報）
      // 若未填，顯示（未填工作內容），不要回退到 issue，避免把問題描述誤當工作內容。
      const workContent = (r.content || '').trim();

      const status = (r.status || '').trim();
      const prog = (Number.isFinite(Number(r.progress)) ? Number(r.progress) : 0);

      const head = `${i + 1}. ${cust}${machine ? ' – ' + machine : ''}`.trim();

      const issueLine = issue
        ? `   問題描述:${issue}`
        : `   問題描述：（未填）`;

      const workBlock = workContent
        ? formatLabeledBlock('工作內容：', workContent, '   ')
        : ['   工作內容：', '      （未填）'].join('\n');

      const st = `   完成狀態：${status || '進行中'} (${prog}%)`;

      return [head, issueLine, workBlock, st].join('\n');
    });

    return lines.join('\n\n');
  }

  getNextWeekPlansText() {
    const items = (this.nextPlans || []).filter(p => (p.customer || p.project || p.plan));
    if (!items.length) return '';

    const normalizeLines = (text) => {
      const raw = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = raw.split('\n').map(l => l.replace(/\t/g, '    ').trimRight());
      // trim leading/trailing empty lines
      while (lines.length && !lines[0].trim()) lines.shift();
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
      // collapse excessive empty lines (>=2)
      const out = [];
      let empty = 0;
      for (const l of lines) {
        if (!l.trim()) {
          empty += 1;
          if (empty <= 1) out.push('');
        } else {
          empty = 0;
          out.push(l);
        }
      }
      return out;
    };

    const formatPlanBlock = (text) => {
      const lines = normalizeLines(text);
      if (!lines.length) return '   計畫內容：（未填）';
      if (lines.length === 1) return `   計畫內容：${lines[0]}`;
      const indent = '      '; // 6 spaces
      return ['   計畫內容：', ...lines.map(l => `${indent}${l}`)].join('\n');
    };

    return items.map((p, i) => {
      const title = `${i + 1}. ${(p.customer || '').trim()}${p.project ? ' - ' + (p.project || '').trim() : ''}`.trim();
      const body = formatPlanBlock((p.plan || '').trim());
      return [title, body].join('\n');
    }).join('\n\n');
  }

  async getRecipientsAndSignature() {
    const settings = (window.SettingsService && typeof window.SettingsService.getSettings === 'function')
      ? await window.SettingsService.getSettings()
      : null;

    const recipients = (settings && settings.weeklyRecipients)
      ? String(settings.weeklyRecipients).trim()
      : WeeklyModel.defaultRecipientText();

    const signature = (settings && settings.signature)
      ? String(settings.signature).trim()
      : '';

    return { recipients, signature };
  }

  async getEmail() {
    const u = (window.AppState?.getCurrentUser?.() || window.currentUser);
    const reporterName = u?.displayName || u?.email || '';
    const thisWeekText = this.getThisWeekRepairsText();
    const nextWeekPlansText = this.getNextWeekPlansText();
    const { recipients, signature } = await this.getRecipientsAndSignature();

    const email = WeeklyModel.buildEmail({
      reporterName,
      weekStart: this.weekStart,
      weekEnd: this.weekEnd,
      thisWeekText,
      nextWeekPlansText,
      signature
    });

    return { ...email, to: recipients };
  }
}

// 全域實例
const weeklyService = new WeeklyService();
window.WeeklyService = weeklyService;
  try { window.AppRegistry?.register?.('WeeklyService', weeklyService); } catch (_) {}
console.log('✅ WeeklyService loaded');
