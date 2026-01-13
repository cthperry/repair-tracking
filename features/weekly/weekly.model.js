/**
 * 週報系統 - 資料模型
 * V161 - Weekly Module - Model Layer
 *
 * 原則：
 * - 週報區間固定：週一為起、週日為迄（Asia/Taipei）
 * - 週報輸出：mailto（唯一動作）
 */

class WeeklyModel {
  static DEFAULT_RECIPIENTS = [
    'Amy_Kuo<amy_kuo@premtek.com.tw>',
    'Frank_chen<frank_chen@premtek.com.tw>',
    'Marco_chai<marco_chai@premtek.com.tw>',
    'Perry_chuang<perry_chuang@premtek.com.tw>',
    'Ruby_Lee<ruby_lee@premtek.com.tw>',
    'Stone Shih<stone_shih@premtek.com.tw>',
    'Simon Kuo<simon_kuo@premtek.com.tw>',
    'Wayne_chang<wayne_chang@premtek.com.tw>'
  ];

  static defaultRecipientText() {
    return WeeklyModel.DEFAULT_RECIPIENTS.join('; ');
  }

  /**
   * 取得台灣日期（YYYY-MM-DD）
   */
  static toTaiwanDateString(date) {
    const offsetMin = (AppConfig?.system?.timezoneOffset || 8) * 60;
    const tw = new Date(date.getTime() + offsetMin * 60 * 1000);
    return tw.toISOString().slice(0, 10);
  }

  /**
   * 取得本週（週一~週日）區間
   */
  static getWeekRange(baseDate = new Date()) {
    // 以台灣時間計算
    const offsetMin = (AppConfig?.system?.timezoneOffset || 8) * 60;
    const tw = new Date(baseDate.getTime() + offsetMin * 60 * 1000);
    const d = new Date(Date.UTC(tw.getUTCFullYear(), tw.getUTCMonth(), tw.getUTCDate()));

    // JS: 0=Sun..6=Sat；我們要 Monday start
    const day = d.getUTCDay();
    const diffToMon = (day === 0 ? -6 : 1 - day);

    const mon = new Date(d);
    mon.setUTCDate(d.getUTCDate() + diffToMon);
    const sun = new Date(mon);
    sun.setUTCDate(mon.getUTCDate() + 6);

    return {
      start: WeeklyModel.toTaiwanDateString(new Date(mon.getTime() - offsetMin * 60 * 1000)),
      end: WeeklyModel.toTaiwanDateString(new Date(sun.getTime() - offsetMin * 60 * 1000))
    };
  }

  static addDays(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return WeeklyModel.toTaiwanDateString(d);
  }

  static formatDateCN(dateStr) {
    // YYYY-MM-DD -> YYYY/MM/DD
    return String(dateStr || '').replace(/-/g, '/');
  }

  static normalizePlan(raw) {
    if (!raw || typeof raw !== 'object') raw = {};
    const id = String(raw.id || '').trim() || `NP_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    return {
      id,
      customer: String(raw.customer || '').trim(),
      project: String(raw.project || '').trim(),
      plan: String(raw.plan || '').trim(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
      createdAt: raw.createdAt || new Date().toISOString()
    };
  }

  /**
   * 產生 email 主旨與內容（英文抬頭）
   */
  static buildEmail({ reporterName, weekStart, weekEnd, thisWeekText, nextWeekPlansText, signature }) {
    const startCN = WeeklyModel.formatDateCN(weekStart);
    const endCN = WeeklyModel.formatDateCN(weekEnd);

    const subject = `Weekly Report - ${reporterName || ''} (${startCN} ~ ${endCN})`.trim();

    const bodyLines = [];
    bodyLines.push('Dear All,');
    bodyLines.push('');
    bodyLines.push('The details of the weekly report are as follows:');
    bodyLines.push('');
    bodyLines.push(`本週工作（${startCN} ~ ${endCN}）`);
    bodyLines.push('');
    bodyLines.push(thisWeekText || '(本週無維修單更新)');
    bodyLines.push('');

    const nextStart = WeeklyModel.addDays(weekStart, 7);
    const nextEnd = WeeklyModel.addDays(weekEnd, 7);
    bodyLines.push(`下週計畫（${WeeklyModel.formatDateCN(nextStart)} ~ ${WeeklyModel.formatDateCN(nextEnd)}）`);
    bodyLines.push('');
    bodyLines.push(nextWeekPlansText || '(尚未填寫下週計畫)');

    if (signature && String(signature).trim()) {
      bodyLines.push('');
      bodyLines.push('--');
      bodyLines.push(String(signature).trim());
    }

    return {
      subject,
      body: bodyLines.join('\n')
    };
  }

  static encodeMailto(to, subject, body) {
    const enc = (s) => encodeURIComponent(String(s || '')).replace(/%20/g, '%20');
    const toStr = String(to || '').trim();
    const qs = `subject=${enc(subject)}&body=${enc(body)}`;
    return `mailto:${toStr}?${qs}`;
  }
}

window.WeeklyModel = WeeklyModel;
console.log('✅ WeeklyModel loaded');
