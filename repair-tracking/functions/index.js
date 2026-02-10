/*
 * MNT-4：保養自動 Email 提醒（非 mailto）
 *
 * 重要：此功能為後端（Cloud Functions / 外部排程）用途，前端仍保留 mailto 作為手動備援。
 *
 * 需求前提：
 * - Firebase 專案需啟用 Cloud Functions（Pub/Sub Scheduler 需 Blaze 計費方案）
 * - 需設定 SMTP 連線資訊（建議使用公司 SMTP 或郵件閘道），不得將密碼寫入 RTDB
 *
 * 資料來源：
 * - data/<uid>/maintenance/equipments
 * - data/<uid>/maintenance/records
 * - data/<uid>/maintenance/settings
 *
 * 設定：
 * - settings.autoEmailEnabled: true 才會寄送
 * - settings.autoEmailIncludeNoRecord: true 時，會將「尚無紀錄」也納入提醒
 * - settings.useOwnerEmail: true 時，優先寄給設備 ownerEmail（未填則 fallback 到 settings.emailTo）
 * - settings.emailTo / settings.emailCc: 支援 ; , \n 分隔
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

try {
  admin.initializeApp();
} catch (_) {
  // ignore
}

const TZ = 'Asia/Taipei';

function toStr(v) {
  return (v === null || v === undefined) ? '' : String(v);
}

function parseEmailList(raw) {
  const s = toStr(raw).trim();
  if (!s) return [];
  return s
    .split(/[,;\n\r]+/g)
    .map(x => x.trim())
    .filter(Boolean)
    .filter(x => /.+@.+\..+/.test(x));
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function ymdTaipei(d = new Date()) {
  // 取得台北時區 YYYY-MM-DD
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(d); // en-CA => YYYY-MM-DD
}

function diffDays(aYmd, bYmd) {
  // a -> b (today -> due)
  try {
    const a = new Date(aYmd + 'T00:00:00Z');
    const b = new Date(bYmd + 'T00:00:00Z');
    const ms = b.getTime() - a.getTime();
    return Math.round(ms / 86400000);
  } catch (_) {
    return NaN;
  }
}

function addCycle(baseYMD, every, unit) {
  try {
    const n = Number(every);
    if (!Number.isFinite(n) || n <= 0) return '';
    const u = (unit || 'day').toString();
    // 以 UTC 來做純日期運算（避免 DST）；台北無 DST，影響可忽略
    const dt = new Date(baseYMD + 'T00:00:00Z');
    if (Number.isNaN(dt.getTime())) return '';

    if (u === 'week') {
      dt.setUTCDate(dt.getUTCDate() + n * 7);
    } else if (u === 'month') {
      dt.setUTCMonth(dt.getUTCMonth() + n);
    } else {
      dt.setUTCDate(dt.getUTCDate() + n);
    }
    return dt.toISOString().slice(0, 10);
  } catch (_) {
    return '';
  }
}

function getRemindDaysForEquipment(eq, settings) {
  try {
    const list = Array.isArray(eq?.remindDays) ? eq.remindDays : (Array.isArray(settings?.defaultRemindDays) ? settings.defaultRemindDays : [3, 7]);
    const days = list.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0);
    const u = Array.from(new Set(days)).sort((a, b) => a - b);
    if (u.length === 0) return [3, 7];
    if (u.length === 1) return [u[0], Math.max(u[0], 7)];
    return u.slice(0, 3);
  } catch (_) {
    return [3, 7];
  }
}

function lastRecordYmdForEquipment(equipmentId, records) {
  const id = toStr(equipmentId).trim();
  if (!id) return '';
  const recs = (records || []).filter(r => r && !r.isDeleted && toStr(r.equipmentId) === id);
  recs.sort((a, b) => toStr(b.performedAt).localeCompare(toStr(a.performedAt)));
  return toStr(recs[0]?.performedAt).trim();
}

function getDueInfo(eq, records, settings) {
  const equipment = eq || {};
  const today = ymdTaipei();
  const lastYMD = lastRecordYmdForEquipment(equipment.id, records);
  const installYMD = toStr(equipment.installDate).trim();

  const remindDays = getRemindDaysForEquipment(equipment, settings);
  const r1 = Number.isFinite(remindDays[0]) ? remindDays[0] : 3;
  const r2 = Number.isFinite(remindDays[1]) ? remindDays[1] : 7;

  const every = equipment.cycleEvery || 30;
  const unit = equipment.cycleUnit || 'day';

  const baseYMD = lastYMD || (installYMD && /^\d{4}-\d{2}-\d{2}$/.test(installYMD) ? installYMD : '');
  const hasRecord = !!lastYMD;

  if (!baseYMD) {
    return { status: 'noRecord', hasRecord: false, baseYMD: '', lastYMD: '', nextDue: '', diff: NaN, cycleEvery: every, cycleUnit: unit, remind1: r1, remind2: r2, installDate: installYMD };
  }

  const nextDue = addCycle(baseYMD, every, unit);
  const d = diffDays(today, nextDue);

  let status = 'ok';
  if (Number.isFinite(d)) {
    if (d < 0) status = 'overdue';
    else if (d <= r1) status = 'dueSoon1';
    else if (d <= r2) status = 'dueSoon2';
  }

  return { status, hasRecord, baseYMD, lastYMD, nextDue, diff: d, cycleEvery: every, cycleUnit: unit, remind1: r1, remind2: r2, installDate: installYMD };
}

function statusLabel(status) {
  if (status === 'overdue') return '逾期';
  if (status === 'dueSoon1' || status === 'dueSoon2') return '即將到期';
  if (status === 'noRecord') return '尚無紀錄';
  return '正常';
}

function statusRank(status) {
  // 用於排序：越小越嚴重
  if (status === 'overdue') return 0;
  if (status === 'dueSoon1') return 1;
  if (status === 'dueSoon2') return 2;
  if (status === 'noRecord') return 3;
  return 9;
}

function buildEmail({ dateYmd, items, settings, toEmails, ccEmails }) {
  const subject = `[維修追蹤系統][保養提醒] ${dateYmd}`;

  const lines = [];
  lines.push(`Dear All,`);
  lines.push('');
  lines.push(`以下為保養提醒（${dateYmd}）：`);
  lines.push('');
  for (const it of items) {
    lines.push(
      `- [${statusLabel(it.status)}] 序號:${it.equipmentNo || '-'} / 設備:${it.name || '-'} / 客戶:${it.location || '-'} / 上次:${it.lastYMD || '-'} / 下次:${it.nextDue || '-'} / 週期:${it.cycleEvery}${it.cycleUnit}`
    );
  }
  lines.push('');
  lines.push('Regards,');
  lines.push('Repair Tracking System');

  const text = lines.join('\n');

  // HTML
  const esc = (s) => toStr(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const rows = items.map(it => {
    return `<tr>
      <td style="padding:6px 8px;border:1px solid #ddd;white-space:nowrap;">${esc(statusLabel(it.status))}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;white-space:nowrap;">${esc(it.equipmentNo)}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;">${esc(it.name)}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;">${esc(it.location)}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;white-space:nowrap;">${esc(it.lastYMD || '-')}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;white-space:nowrap;">${esc(it.nextDue || '-')}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;white-space:nowrap;">${esc(String(it.cycleEvery))} ${esc(it.cycleUnit)}</td>
    </tr>`;
  }).join('\n');

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;">
      <p>Dear All,</p>
      <p>以下為保養提醒（${esc(dateYmd)}）：</p>
      <table style="border-collapse:collapse;border-spacing:0;">
        <thead>
          <tr>
            <th style="padding:6px 8px;border:1px solid #ddd;background:#f6f6f6;">狀態</th>
            <th style="padding:6px 8px;border:1px solid #ddd;background:#f6f6f6;">序號</th>
            <th style="padding:6px 8px;border:1px solid #ddd;background:#f6f6f6;">設備</th>
            <th style="padding:6px 8px;border:1px solid #ddd;background:#f6f6f6;">位置/客戶</th>
            <th style="padding:6px 8px;border:1px solid #ddd;background:#f6f6f6;">上次保養</th>
            <th style="padding:6px 8px;border:1px solid #ddd;background:#f6f6f6;">下次到期</th>
            <th style="padding:6px 8px;border:1px solid #ddd;background:#f6f6f6;">週期</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p style="margin-top:16px;">Regards,<br/>Repair Tracking System</p>
    </div>
  `;

  return { subject, text, html, to: toEmails.join(', '), cc: ccEmails.join(', ') };
}

function getSmtpConfig() {
  // 優先：functions.config().smtp
  const cfg = (functions.config && functions.config().smtp) ? functions.config().smtp : {};
  const host = cfg.host || process.env.SMTP_HOST;
  const port = Number(cfg.port || process.env.SMTP_PORT || 587);
  const secure = String(cfg.secure || process.env.SMTP_SECURE || 'false') === 'true';
  const user = cfg.user || process.env.SMTP_USER;
  const pass = cfg.pass || process.env.SMTP_PASS;
  const from = cfg.from || process.env.SMTP_FROM || user;

  return { host, port, secure, user, pass, from };
}

function createTransport() {
  const cfg = getSmtpConfig();
  if (!cfg.host || !cfg.user || !cfg.pass) {
    throw new Error('SMTP 未設定：請設定 smtp.host / smtp.user / smtp.pass（或環境變數 SMTP_HOST/SMTP_USER/SMTP_PASS）');
  }
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass }
  });
}

async function loadMaintenanceData(uid) {
  const root = admin.database().ref(`data/${uid}/maintenance`);
  const [equipSnap, recordSnap, settingSnap] = await Promise.all([
    root.child('equipments').once('value'),
    root.child('records').once('value'),
    root.child('settings').once('value')
  ]);

  const equipmentsObj = equipSnap.val() || {};
  const recordsObj = recordSnap.val() || {};
  const settings = settingSnap.val() || {};

  const equipments = Object.keys(equipmentsObj).map(k => ({ id: k, ...equipmentsObj[k] })).filter(x => x && !x.isDeleted);
  const records = Object.keys(recordsObj).map(k => ({ id: k, ...recordsObj[k] })).filter(x => x && !x.isDeleted);

  return { equipments, records, settings };
}

async function shouldRunForUid(uid, dateYmd) {
  const logRef = admin.database().ref(`data/${uid}/maintenance/reminderLogs/${dateYmd}`);
  const snap = await logRef.once('value');
  if (snap.exists()) return { ok: false, logRef };
  return { ok: true, logRef };
}

async function writeLog(logRef, payload) {
  await logRef.set(payload);
}

async function sendForUid(uid, transport, overrideTo = null) {
  const dateYmd = ymdTaipei();

  // idempotency guard
  const gate = await shouldRunForUid(uid, dateYmd);
  if (!gate.ok) {
    return { uid, skipped: true, reason: 'alreadySent', sent: 0 };
  }

  const { equipments, records, settings } = await loadMaintenanceData(uid);

  // 開關
  if (!settings || settings.autoEmailEnabled !== true) {
    return { uid, skipped: true, reason: 'disabled', sent: 0 };
  }

  const includeNoRecord = settings.autoEmailIncludeNoRecord === true;

  const dueItems = [];
  for (const eq of equipments) {
    const info = getDueInfo(eq, records, settings);
    const st = info.status;
    const shouldInclude = (st === 'overdue' || st === 'dueSoon1' || st === 'dueSoon2' || (includeNoRecord && st === 'noRecord'));
    if (!shouldInclude) continue;

    dueItems.push({
      equipmentId: eq.id,
      equipmentNo: toStr(eq.equipmentNo).trim(),
      name: toStr(eq.name).trim(),
      location: toStr(eq.location).trim(),
      ownerEmail: toStr(eq.ownerEmail).trim(),
      ownerName: toStr(eq.ownerName).trim(),
      status: st,
      lastYMD: info.lastYMD,
      nextDue: info.nextDue,
      cycleEvery: info.cycleEvery,
      cycleUnit: info.cycleUnit,
      diff: info.diff
    });
  }

  if (!dueItems.length) {
    // 沒內容也寫 log，避免重複排程造成大量空寄送
    await writeLog(gate.logRef, { sentAt: Date.now(), status: 'noItems', count: 0 });
    return { uid, skipped: true, reason: 'noItems', sent: 0 };
  }

  // 依嚴重度排序
  dueItems.sort((a, b) => {
    const r = statusRank(a.status) - statusRank(b.status);
    if (r !== 0) return r;
    return toStr(a.nextDue).localeCompare(toStr(b.nextDue));
  });

  const groups = new Map();

  for (const it of dueItems) {
    let toEmails = [];
    if (overrideTo) {
      toEmails = parseEmailList(overrideTo);
    } else {
      const preferOwner = settings.useOwnerEmail === true;
      if (preferOwner && it.ownerEmail) toEmails = [it.ownerEmail];
      else toEmails = parseEmailList(settings.emailTo);
    }

    const ccEmails = parseEmailList(settings.emailCc);
    const key = [...toEmails].sort().join(',') + '|' + [...ccEmails].sort().join(',');
    if (!groups.has(key)) {
      groups.set(key, { toEmails: uniq(toEmails), ccEmails: uniq(ccEmails), items: [] });
    }
    groups.get(key).items.push(it);
  }

  const smtpCfg = getSmtpConfig();
  let sentCount = 0;
  const groupSummaries = [];

  for (const [key, g] of groups.entries()) {
    if (!g.toEmails.length) {
      // 無收件人 => 跳過
      groupSummaries.push({ key, skipped: true, reason: 'noRecipients', count: g.items.length });
      continue;
    }

    const mail = buildEmail({ dateYmd, items: g.items, settings, toEmails: g.toEmails, ccEmails: g.ccEmails });

    const info = await transport.sendMail({
      from: smtpCfg.from,
      to: mail.to,
      cc: mail.cc || undefined,
      subject: mail.subject,
      text: mail.text,
      html: mail.html
    });

    sentCount += 1;
    groupSummaries.push({ key, skipped: false, to: mail.to, cc: mail.cc, count: g.items.length, messageId: info && info.messageId ? info.messageId : '' });
  }

  // 寫入 log（成功/部分成功都記錄，避免同日重送；若需重送可手動刪除此節點）
  await writeLog(gate.logRef, {
    sentAt: Date.now(),
    status: 'sent',
    totalEquipments: equipments.length,
    dueCount: dueItems.length,
    groups: groupSummaries
  });

  return { uid, skipped: false, sent: sentCount, dueCount: dueItems.length, groups: groupSummaries.length };
}

exports.maintenanceDailyReminder = functions
  .region('asia-southeast1')
  .pubsub
  .schedule('every day 08:00')
  .timeZone(TZ)
  .onRun(async () => {
    const transport = createTransport();

    // 取得所有 uid（以 /data 下第一層節點為主）
    const dataSnap = await admin.database().ref('data').once('value');
    const root = dataSnap.val() || {};
    const uids = Object.keys(root);

    const results = [];
    for (const uid of uids) {
      try {
        const r = await sendForUid(uid, transport);
        results.push(r);
      } catch (e) {
        console.error('maintenanceDailyReminder uid failed', uid, e);
        results.push({ uid, skipped: false, error: (e && e.message) ? e.message : 'unknown' });
      }
    }

    console.log('maintenanceDailyReminder done', results);
    return null;
  });

// 手動測試寄信（需登入；僅寄送給 data.to）
exports.maintenanceSendTestEmail = functions
  .region('asia-southeast1')
  .https
  .onCall(async (data, context) => {
    if (!context || !context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError('unauthenticated', '需要登入才能執行');
    }

    const uid = context.auth.uid;
    const to = toStr(data?.to).trim();
    if (!to) {
      throw new functions.https.HttpsError('invalid-argument', '缺少 to');
    }

    const transport = createTransport();
    const r = await sendForUid(uid, transport, to);
    return { ok: true, result: r };
  });
