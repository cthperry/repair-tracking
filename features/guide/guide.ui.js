/**
 * 使用者操作指南 - UI
 * V161 - Guide Module
 * - 目標：在系統內提供圖文並茂的「快速上手 + 重要流程 + FAQ」
 * - 內容：以不依賴外部圖片/連線為原則，採用 SVG 圖解（可離線）
 */

class GuideUI {
  constructor(){
    this.containerId = 'guide-container';
  }

  render(containerId = 'guide-container'){
    this.containerId = containerId;
    const container = document.getElementById(containerId);
    if (!container) return;

    const userName = window.currentUser?.displayName || '使用者';
    const uid = window.currentUser?.uid || '(未取得)';

    container.innerHTML = `
      <div class="guide-module">
        <div class="module-toolbar">
          <div class="module-toolbar-left">
            <div class="page-title">
              <h2>使用者操作指南</h2>
              <span class="muted">快速上手 · 重要流程 · 常見問題（Desktop + Mobile 相容）</span>
            </div>
          </div>
          <div class="module-toolbar-right">
            <input class="input" id="guide-search" placeholder="搜尋：例如『新增維修單』『用料/更換』『版本控制』『轉訂單』『週報』『搬移資料』" />
            <button class="btn" id="guide-clear" type="button">清除</button>
          </div>
        </div>

        <div class="card guide-hero" data-search="概覽 資料隔離 UID 命名空間 data uid 登入 登出 快取 localStorage">
          <div class="card-head">
            <div>
              <div class="card-title">系統概覽</div>
              <div class="muted">${this.escape(userName)} · UID：<span style="font-weight:800;color:var(--color-text)">${this.escape(uid)}</span></div>
            </div>
            <div class="card-head-right">
              <span class="badge">V${this.escape(window.AppConfig?.VERSION || '161')}.${this.escape(window.AppConfig?.BUILD_NUMBER || '')}</span>
            </div>
          </div>
          <div class="card-body">
            <div>
              <h3>你現在使用的是「全面資料隔離」版本</h3>
              <p>
                你的所有資料都會被寫入 <b>data/&lt;uid&gt;/...</b> 的命名空間；不同帳號不會互相讀寫。
                若你剛升級，舊資料仍可能停留在根節點（customers / parts / repairs...），需要手動搬移後才會在系統內顯示。
              </p>

              <div class="guide-callout">
                <div class="ico">TIP</div>
                <div class="txt">
                  <div class="t">最常見的「看不到資料」原因</div>
                  <div class="d">只搬了 repairHistory 但沒搬 repairs（或 repairs 節點不存在）。請依本頁「資料搬移」章節確認。</div>
                </div>
              </div>

              <div class="guide-chips">
                <button class="chip" data-target="g-start" type="button">快速開始</button>
                <button class="chip" data-target="g-repairs" type="button">維修管理</button>
                <button class="chip" data-target="g-machine" type="button">機台歷史</button>
                <button class="chip" data-target="g-parts" type="button">零件追蹤</button>
                <button class="chip" data-target="g-weekly" type="button">週報</button>
                <button class="chip" data-target="g-migration" type="button">資料搬移</button>
                <button class="chip" data-target="g-faq" type="button">FAQ</button>
              </div>
            </div>

            <div class="guide-illu" aria-label="資料隔離架構圖">
              ${this.svgDataIsolation()}
            </div>
          </div>
        </div>

        <div id="guide-noresult" class="empty-state guide-noresult">
          <div class="empty-icon">🔎</div>
          <div class="empty-title">找不到相符內容</div>
          <div class="empty-text">請嘗試更短的關鍵字，或改用『維修』『零件』『週報』『搬移』等字詞。</div>
        </div>

        <div class="card-list" id="guide-cards">
          ${this.sectionQuickStart()}
          ${this.sectionRepairs()}
          ${this.sectionMachines()}
          ${this.sectionCustomers()}
          ${this.sectionParts()}
          ${this.sectionQuotesOrders()}
          ${this.sectionWeekly()}
          ${this.sectionSettings()}
          ${this.sectionMigration()}
          ${this.sectionFAQ()}
        </div>
      </div>
    `;

    this.bind();
  }

  bind(){
    const root = document.getElementById(this.containerId);
    if (!root) return;

    const search = root.querySelector('#guide-search');
    const clearBtn = root.querySelector('#guide-clear');
    const noResult = root.querySelector('#guide-noresult');
    const cards = Array.from(root.querySelectorAll('.guide-card'));

    const applyFilter = () => {
      const q = (search?.value || '').trim().toLowerCase();
      let visible = 0;
      cards.forEach(card => {
        const hay = String(card.getAttribute('data-search') || '').toLowerCase();
        const show = (!q) || hay.includes(q);
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      if (noResult) noResult.style.display = (q && visible === 0) ? '' : 'none';
    };

    let searchTimer = null;
    if (search) {
      search.addEventListener('input', () => {
        try { if (searchTimer) clearTimeout(searchTimer); } catch (_) {}
        searchTimer = setTimeout(applyFilter, 300);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (search) search.value = '';
        applyFilter();
        try { search && search.focus(); } catch (_) {}
      });
    }

    root.querySelectorAll('[data-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-target');
        const el = id ? root.querySelector('#' + id) : null;
        if (!el) return;
        try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) { el.scrollIntoView(); }
      });
    });

    // 初始套用
    applyFilter();
  }

  // -----------------------------
  // Sections
  // -----------------------------
  sectionQuickStart(){
    return `
      <section id="g-start" class="card guide-card" data-search="快速開始 登入 登出 新增 維修單 客戶 零件 報價 訂單 週報" >
        <div class="card-head">
          <div>
            <div class="card-title">快速開始（5 分鐘上手）</div>
            <div class="muted">第一次使用，建議照此順序操作</div>
          </div>
        </div>
        <div class="card-body">
          <div class="guide-steps">
            <div class="guide-step">
              <div class="t">1) 登入</div>
              <div class="d">使用公司帳號登入；成功後左側/下方會出現功能選單。</div>
            </div>
            <div class="guide-step">
              <div class="t">2) 建立客戶</div>
              <div class="d">到「客戶管理」建立公司與聯絡人，後續新增維修單才能快速選取。</div>
            </div>
            <div class="guide-step">
              <div class="t">3) 建立第一筆維修單</div>
              <div class="d">到「維修管理」→「新增維修單」，填公司/機型/序號/問題描述。</div>
            </div>
            <div class="guide-step">
              <div class="t">4) 進度追蹤</div>
              <div class="d">進入編輯模式後，最上方可直接調整狀態與進度（例如：進行中 80%）。</div>
            </div>
          </div>

          <div class="guide-callout">
            <div class="ico">OK</div>
            <div class="txt">
              <div class="t">建議做法</div>
              <div class="d">先把公司/聯絡人資料建立完整，再開始大量輸入維修單，可明顯降低重工。</div>
            </div>
          </div>

          <div class="guide-illu" aria-label="快速流程圖">
            ${this.svgQuickFlow()}
          </div>
        </div>
      </section>
    `;
  }

  sectionRepairs(){
    return `
      <section id="g-repairs" class="card guide-card" data-search="維修管理 維修單 新增 編輯 刪除 狀態 進度 優先級 序號 serialNumber 進行中 已完成 歷史" >
        <div class="card-head">
          <div>
            <div class="card-title">維修管理</div>
            <div class="muted">建立維修單、追蹤狀態、維護歷史紀錄</div>
          </div>
        </div>
        <div class="card-body">
          <div class="guide-steps">
            <div class="guide-step">
              <div class="t">新增維修單</div>
              <div class="d">按「新增維修單」→ 選公司/機型/序號 → 填問題描述。若同公司有多位聯絡人，可點「聯絡人」欄位右側 ▾ 展開完整清單。序號建議依客戶機台貼紙一致。</div>
            </div>
            <div class="guide-step">
              <div class="t">編輯模式（狀態/進度在上方）</div>
              <div class="d">進入編輯後，最上方是狀態/進度拉桿；可快速反映工單狀態。</div>
            </div>
            <div class="guide-step">
              <div class="t">完成與歷史</div>
              <div class="d">進度 100% 或狀態選「完成」後，會歸類到歷史（若你有啟用歷史視圖）。</div>
            </div>
            <div class="guide-step">
              <div class="t">常用篩選</div>
              <div class="d">用狀態 chips（進行中/需要零件/已完成）與排序（更新時間）快速定位。</div>
            </div>
          </div>

          <div class="guide-illu" aria-label="維修單生命週期">
            ${this.svgRepairLifecycle()}
          </div>
        </div>
      </section>
    `;
  }

  sectionMachines(){
    return `
      <section id="g-machine" class="card guide-card" data-search="機台歷史 序號 查詢 serialNumber repairs repairHistory 歷史紀錄" >
        <div class="card-head">
          <div>
            <div class="card-title">機台歷史（依序號快速查）</div>
            <div class="muted">用序號串起維修單與歷史紀錄</div>
          </div>
        </div>
        <div class="card-body">
          <p>在「機台歷史」輸入序號，即可看到該序號的維修摘要與歷史紀錄。若你剛搬移資料，請確認 <b>repairs</b> 與 <b>repairHistory</b> 都已搬到 data/&lt;uid&gt; 下。</p>

          <div class="guide-callout">
            <div class="ico">!</div>
            <div class="txt">
              <div class="t">序號要建立嗎？</div>
              <div class="d">要。機台歷史依序號搜尋；維修單如果沒有序號，歷史頁會無法正確聚合。</div>
            </div>
          </div>

          <div class="guide-illu" aria-label="序號關聯圖">
            ${this.svgSerialLinkage()}
          </div>
        </div>
      </section>
    `;
  }

  sectionCustomers(){
    return `
      <section id="g-customers" class="card guide-card" data-search="客戶管理 公司 聯絡人 釘選 Top N 新增 編輯" >
        <div class="card-head">
          <div>
            <div class="card-title">客戶管理</div>
            <div class="muted">公司/聯絡人主檔、常用公司釘選</div>
          </div>
        </div>
        <div class="card-body">
          <div class="guide-steps">
            <div class="guide-step">
              <div class="t">公司 → 聯絡人</div>
              <div class="d">同公司可有多位聯絡人；建議把聯絡人資訊維護完整，減少報價/週報重填。</div>
            </div>
            <div class="guide-step">
              <div class="t">常用公司（Top N）</div>
              <div class="d">到「設定」調整 Top N 與釘選清單，新增維修單時更快選公司。</div>
            </div>
          </div>

          <div class="guide-illu" aria-label="客戶資料結構">
            ${this.svgCustomersStructure()}
          </div>
        </div>
      </section>
    `;
  }

  sectionParts(){
    return `
      <section id="g-parts" class="card guide-card" data-search="零件追蹤 parts 用料 更換 清單 案例 repairId 需求 報價 訂單 到貨 更換 維修單 連動" >
        <div class="card-head">
          <div>
            <div class="card-title">零件追蹤（用料/更換清單）</div>
            <div class="muted">以「維修案例」為單位，一次管理同案例的多筆零件</div>
          </div>
        </div>
        <div class="card-body">
          <div class="guide-steps">
            <div class="guide-step">
              <div class="t">列表邏輯：一個案例一張卡</div>
              <div class="d">同一個維修單（repairId）底下不論有幾筆零件，列表只會顯示 <b>1 張案例卡</b>，避免「一筆零件一張卡」造成資訊分散。</div>
            </div>
            <div class="guide-step">
              <div class="t">編輯用料/更換（多筆）</div>
              <div class="d">點案例卡的「編輯用料/更換」進入多筆編輯視窗，可新增/刪除項目、維護狀態（需求提出 → 已報價 → 已下單 → 已到貨 → 已更換）。</div>
            </div>
            <div class="guide-step">
              <div class="t">案例狀態怎麼算？</div>
              <div class="d">系統會依該案例內 <b>尚未完成</b> 的項目，取「最前面的狀態」作為案例狀態（例如：有一筆仍在『需求提出』，整案就會顯示『需求提出』）。</div>
            </div>
          </div>

          <div class="guide-illu" aria-label="零件狀態流程">
            ${this.svgPartsPipeline()}
          </div>

          <div class="guide-callout">
            <div class="ico">TIP</div>
            <div class="txt">
              <div class="t">建議維護欄位</div>
              <div class="d">品名 / MPN（P/N）/ 供應商 / 單位 / 數量 / 單價 / 預計到貨 / 到貨日 / 更換日。資料越完整，後續報價、採購與結案越省時間。</div>
            </div>
          </div>
        </div>
      </section>
    `;
  }


  sectionQuotesOrders(){
    return `
      <section id="g-qo" class="card guide-card" data-search="報價 quotes 訂單 orders 版本控制 變更歷史 轉訂單 已核准 已送出 PDF 備註 3行 3行 從維修單建立 連動 quoteNo orderNo repairId quoteId" >
        <div class="card-head">
          <div>
            <div class="card-title">報價 / 訂單</div>
            <div class="muted">報價版本控制 + 已核准轉訂單 + 採購追蹤</div>
          </div>
        </div>
        <div class="card-body">
          <div class="guide-steps">
            <div class="guide-step">
              <div class="t">報價（含版本控制）</div>
              <div class="d">建立/編輯報價時，每次儲存都會自動產生新版本（v1、v2…），並寫入「變更歷史」（時間/操作者/變更摘要/快照），可用於追溯每次修改。</div>
            </div>
            <div class="guide-step">
              <div class="t">輸出 PDF（含備註一/備註二）</div>
              <div class="d">PDF 表頭的「備註一」與「備註二」各顯示 <b>3 行</b>（共 6 行），超過會於第 6 行以「…」截斷。備註優先來源：畫面 textarea（未儲存也可輸出）→ draft → q.note / q.notes。</div>
            </div>
            <div class="guide-step">
              <div class="t">已核准 → 轉訂單（避免重複輸入）</div>
              <div class="d">當報價狀態為 <b>已核准</b> 時會出現「轉訂單」按鈕，系統會自動把報價項目轉成訂單項目並建立連結；若同一報價已轉過，會直接開啟既有訂單，不會重複建單。</div>
            </div>
            <div class="guide-step">
              <div class="t">訂單/採購追蹤</div>
              <div class="d">在「訂單/採購追蹤」維護狀態（建立/已下單/已到貨/已結案）與日期欄位，讓主管可用 KPI 與狀態 chips 快速掌握進度。</div>
            </div>
          </div>

          <div class="guide-illu" aria-label="報價訂單連動">
            ${this.svgQuoteOrderLink()}
          </div>

          <div class="guide-callout">
            <div class="ico">TIP</div>
            <div class="txt">
              <div class="t">避免 Failed to fetch（PDF/字型）</div>
              <div class="d">請勿用 file:// 直接開啟。建議用 http://（例如在專案根目錄執行 <b>python -m http.server 8088</b>，再開 <b>http://localhost:8088/Index_V161.html</b>）。</div>
            </div>
          </div>
        </div>
      </section>
    `;
  }


  sectionWeekly(){
    return `
      <section id="g-weekly" class="card guide-card" data-search="週報 weekly 本週工作 下週計畫 預覽 mailto 收件人 簽名" >
        <div class="card-head">
          <div>
            <div class="card-title">週報（本週工作 / 下週計畫）</div>
            <div class="muted">卡片式編輯 + 一鍵 mailto 寄送</div>
          </div>
        </div>
        <div class="card-body">
          <div class="guide-steps">
            <div class="guide-step">
              <div class="t">建立本週工作</div>
              <div class="d">以「客戶 - 機型」為主；內容建議拆成條列，讓主管一眼可讀。</div>
            </div>
            <div class="guide-step">
              <div class="t">建立下週計畫</div>
              <div class="d">把預計執行項目先寫上；對外協作（如 relocation）也可列入。</div>
            </div>
            <div class="guide-step">
              <div class="t">預覽與寄送</div>
              <div class="d">先看預覽確認排版，再使用 mailto 寄出。簽名檔可在設定頁維護。</div>
            </div>
            <div class="guide-step">
              <div class="t">週期（週一～週日）</div>
              <div class="d">週報日期區間以週一為起、週日為迄（Asia/Taipei）。</div>
            </div>
          </div>

          <div class="guide-illu" aria-label="週報輸出">
            ${this.svgWeeklyOutput()}
          </div>
        </div>
      </section>
    `;
  }

  sectionSettings(){
    return `
      <section id="g-settings" class="card guide-card" data-search="設定 預設值 收件人 簽名檔 釘選 TopN 列表密度 管理者 使用者 角色" >
        <div class="card-head">
          <div>
            <div class="card-title">設定（含權限管理）</div>
            <div class="muted">偏好設定與 admin 帳號管理（users/usersByEmail）</div>
          </div>
        </div>
        <div class="card-body">
          <div class="guide-steps">
            <div class="guide-step">
              <div class="t">週報收件人</div>
              <div class="d">以 ; 分隔。建議固定內建名單 + 依專案臨時增減。</div>
            </div>
            <div class="guide-step">
              <div class="t">簽名檔</div>
              <div class="d">會附加在 mailto 內容末端；建議維護英文明確格式。</div>
            </div>
            <div class="guide-step">
              <div class="t">Top N 釘選</div>
              <div class="d">常用公司釘選後，新增維修單會更快。順序可手動調整。</div>
            </div>
            <div class="guide-step">
              <div class="t">權限管理（admin）</div>
              <div class="d">僅 admin 可建立預設使用者、調整角色、停用帳號。</div>
            </div>
          </div>

          <div class="guide-callout">
            <div class="ico">SEC</div>
            <div class="txt">
              <div class="t">管理者也被資料隔離</div>
              <div class="d">admin 仍可做帳號管理，但業務資料（repairs/customers/parts...）仍各自隔離，避免跨帳號看到他人資料。</div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  sectionMigration(){
    return `
      <section id="g-migration" class="card guide-card" data-search="資料搬移 migration data uid repairs repairHistory customers parts quotes orders counters meta 匯出 匯入 JSON" >
        <div class="card-head">
          <div>
            <div class="card-title">資料搬移（舊根節點 → data/&lt;uid&gt;）</div>
            <div class="muted">升級到 V161.1xx 後，若看不到舊資料，請照此流程搬移</div>
          </div>
        </div>
        <div class="card-body">
          <div class="guide-steps">
            <div class="guide-step">
              <div class="t">1) 取得 UID</div>
              <div class="d">Firebase Console → Authentication → Users → 找到帳號的 UID（或登入後 Console 執行 window.currentUser.uid）。</div>
            </div>
            <div class="guide-step">
              <div class="t">2) 建立 data/&lt;uid&gt;</div>
              <div class="d">RTDB 不會自動建立節點。請在資料頁手動新增 data → &lt;uid&gt; → repairs / repairHistory / customers ...</div>
            </div>
            <div class="guide-step">
              <div class="t">3) Export / Import JSON</div>
              <div class="d">從舊節點（根 customers/parts/repairs...）匯出 JSON，再匯入到 data/&lt;uid&gt;/對應節點。</div>
            </div>
            <div class="guide-step">
              <div class="t">4) 先搬 repairs 再搬 repairHistory</div>
              <div class="d">機台歷史主要依 repairs 聚合；只搬 repairHistory 會造成系統看不到維修單清單。</div>
            </div>
          </div>

          <div class="guide-illu" aria-label="搬移路徑對照">
            ${this.svgMigrationMap()}
          </div>

          <div class="guide-callout">
            <div class="ico">BK</div>
            <div class="txt">
              <div class="t">舊資料要刪嗎？</div>
              <div class="d">不必。V161.1xx 不會再寫回舊路徑；建議先保留當備份，確認新系統正常運作後再評估清理。</div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  sectionFAQ(){
    return `
      <section id="g-faq" class="card guide-card" data-search="FAQ 常見問題 permission_denied already initialized 404 favicon cache localStorage userEmailIndex rules Failed to fetch PDF 字型 訂單追蹤 空白 篩選" >
        <div class="card-head">
          <div>
            <div class="card-title">常見問題（FAQ）</div>
            <div class="muted">遇到異常時先看這裡</div>
          </div>
        </div>
        <div class="card-body">
          <div class="guide-steps">
            <div class="guide-step">
              <div class="t">看不到資料（清單為 0）</div>
              <div class="d">多半是 data/&lt;uid&gt;/repairs 沒搬移或節點不存在。請在 RTDB 確認路徑與內容。</div>
            </div>
            <div class="guide-step">
              <div class="t">permission_denied（特別是 userEmailIndex）</div>
              <div class="d">表示 Rules 不允許寫入該路徑；請確認新版 rules 已套用、且 app 已不再寫入舊索引路徑。</div>
            </div>
            <div class="guide-step">
              <div class="t">PDF 匯出出現 Failed to fetch</div>
              <div class="d">幾乎都是因為用 file:// 開啟導致瀏覽器阻擋 fetch/XHR 讀本機資源。請改用 http:// 方式開啟（python -m http.server）。</div>
            </div>
            <div class="guide-step">
              <div class="t">訂單追蹤顯示筆數，但列表空白</div>
              <div class="d">通常是篩選條件仍在生效（狀態 chips / 關鍵字 / 金額範圍）。請先按「清除」或清空篩選欄位，再重新載入。</div>
            </div>
            <div class="guide-step">
              <div class="t">切換帳號看到上一位資料</div>
              <div class="d">新版已用 uid 分桶 localStorage，並在登出時重置 services；若仍發生，請清除瀏覽器站台資料再登入。</div>
            </div>
            <div class="guide-step">
              <div class="t">畫面出現 404（favicon）</div>
              <div class="d">不影響功能；新版已預設使用 data:, 不再請求 /favicon.ico。</div>
            </div>
          </div>

          <div class="guide-callout">
            <div class="ico">CLR</div>
            <div class="txt">
              <div class="t">一鍵清除本機快取（建議）</div>
              <div class="d">Chrome：設定 → 隱私權與安全性 → 網站設定 → 檢視權限與資料 → 搜尋 localhost / 專案網址 → 清除資料。</div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // -----------------------------
  // SVG Illustrations (inline)
  // -----------------------------
  svgBox(x, y, w, h, label){
    return `
      <g>
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" ry="12" fill="rgba(255,255,255,0.75)" stroke="rgba(148,163,184,0.65)" />
        <text x="${x + 12}" y="${y + 22}" font-size="13" font-weight="800" fill="var(--color-text)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">${label}</text>
      </g>
    `;
  }

  svgArrow(x1,y1,x2,y2){
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(100,116,139,0.9)" stroke-width="2" marker-end="url(#arrow)" />`;
  }

  svgDataIsolation(){
    return `
      <svg viewBox="0 0 720 260" role="img" aria-label="資料隔離架構">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
            <polygon points="0 0, 10 5, 0 10" fill="rgba(100,116,139,0.9)"></polygon>
          </marker>
        </defs>
        <rect x="0" y="0" width="720" height="260" rx="14" fill="rgba(255,255,255,0.55)" stroke="rgba(148,163,184,0.45)" />
        <text x="16" y="24" font-size="14" font-weight="900" fill="var(--color-text)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">Realtime Database（推薦結構）</text>

        ${this.svgBox(16, 46, 210, 52, 'data')}
        ${this.svgBox(260, 46, 210, 52, '<uid>（每個帳號一個命名空間）')}
        ${this.svgArrow(226, 72, 260, 72)}

        ${this.svgBox(16, 120, 210, 52, 'users / usersByEmail')}
        <text x="28" y="156" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">僅 admin 可寫</text>

        ${this.svgBox(260, 120, 210, 52, 'repairs / customers / parts...')}
        <text x="272" y="156" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">僅 auth.uid==uid 可讀寫</text>

        ${this.svgArrow(365, 98, 365, 120)}

        ${this.svgBox(498, 46, 206, 180, '分流結果')}
        <text x="510" y="80" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">Stone/Simon 不會看到 Perry</text>
        <text x="510" y="104" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">同一台電腦切換帳號</text>
        <text x="510" y="128" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">localStorage 也會分桶</text>
        <text x="510" y="152" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">登出會重置 services</text>
      </svg>
    `;
  }

  svgQuickFlow(){
    return `
      <svg viewBox="0 0 720 180" role="img" aria-label="快速流程">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
            <polygon points="0 0, 10 5, 0 10" fill="rgba(100,116,139,0.9)"></polygon>
          </marker>
        </defs>
        <rect x="0" y="0" width="720" height="180" rx="14" fill="rgba(255,255,255,0.55)" stroke="rgba(148,163,184,0.45)" />
        <text x="16" y="24" font-size="14" font-weight="900" fill="var(--color-text)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">常用工作流程</text>
        ${this.svgBox(16, 48, 150, 52, '建立客戶')}
        ${this.svgBox(198, 48, 150, 52, '新增維修單')}
        ${this.svgBox(380, 48, 150, 52, '零件/報價/訂單')}
        ${this.svgBox(562, 48, 142, 52, '結案/週報')}
        ${this.svgArrow(166, 74, 198, 74)}
        ${this.svgArrow(348, 74, 380, 74)}
        ${this.svgArrow(530, 74, 562, 74)}
        <text x="16" y="138" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">提示：先把客戶主檔建好，能大幅降低輸入時間。</text>
      </svg>
    `;
  }

  svgRepairLifecycle(){
    return `
      <svg viewBox="0 0 720 200" role="img" aria-label="維修單生命週期">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
            <polygon points="0 0, 10 5, 0 10" fill="rgba(100,116,139,0.9)"></polygon>
          </marker>
        </defs>
        <rect x="0" y="0" width="720" height="200" rx="14" fill="rgba(255,255,255,0.55)" stroke="rgba(148,163,184,0.45)" />
        <text x="16" y="24" font-size="14" font-weight="900" fill="var(--color-text)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">維修單生命週期（建議）</text>
        ${this.svgBox(16, 54, 160, 52, '新增 / 草稿')}
        ${this.svgBox(206, 54, 160, 52, '進行中')}
        ${this.svgBox(396, 54, 160, 52, '需要零件')}
        ${this.svgBox(576, 54, 128, 52, '完成')}
        ${this.svgArrow(176, 80, 206, 80)}
        ${this.svgArrow(366, 80, 396, 80)}
        ${this.svgArrow(556, 80, 576, 80)}
        <text x="16" y="150" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">狀態/進度在編輯模式最上方，方便快速更新。</text>
      </svg>
    `;
  }

  svgSerialLinkage(){
    return `
      <svg viewBox="0 0 720 210" role="img" aria-label="序號關聯">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
            <polygon points="0 0, 10 5, 0 10" fill="rgba(100,116,139,0.9)"></polygon>
          </marker>
        </defs>
        <rect x="0" y="0" width="720" height="210" rx="14" fill="rgba(255,255,255,0.55)" stroke="rgba(148,163,184,0.45)" />
        <text x="16" y="24" font-size="14" font-weight="900" fill="var(--color-text)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">機台歷史：用 serialNumber 聚合</text>
        ${this.svgBox(16, 52, 210, 52, 'repairs（維修單）')}
        ${this.svgBox(260, 52, 210, 52, 'serialNumber')}
        ${this.svgBox(498, 52, 206, 52, 'machines（查詢視圖）')}
        ${this.svgArrow(226, 78, 260, 78)}
        ${this.svgArrow(470, 78, 498, 78)}

        ${this.svgBox(16, 128, 210, 52, 'repairHistory（歷史）')}
        ${this.svgArrow(226, 154, 260, 154)}

        <text x="260" y="156" font-size="12" font-weight="900" fill="var(--module-accent-ink)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">同序號 → 同一台機台的跨次維修</text>
      </svg>
    `;
  }

  svgCustomersStructure(){
    return `
      <svg viewBox="0 0 720 210" role="img" aria-label="客戶資料結構">
        <rect x="0" y="0" width="720" height="210" rx="14" fill="rgba(255,255,255,0.55)" stroke="rgba(148,163,184,0.45)" />
        <text x="16" y="24" font-size="14" font-weight="900" fill="var(--color-text)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">customers（公司 → 聯絡人）</text>
        <g>
          <rect x="16" y="52" width="300" height="140" rx="14" fill="rgba(255,255,255,0.75)" stroke="rgba(148,163,184,0.65)" />
          <text x="28" y="76" font-size="13" font-weight="900" fill="var(--color-text)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">公司</text>
          <text x="28" y="100" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">companyName / address / notes</text>
          <rect x="28" y="114" width="272" height="34" rx="12" fill="var(--module-accent-soft)" stroke="rgba(148,163,184,0.35)" />
          <text x="40" y="137" font-size="12" font-weight="900" fill="var(--module-accent-ink)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">聯絡人 A</text>
          <rect x="28" y="154" width="272" height="34" rx="12" fill="rgba(255,255,255,0.7)" stroke="rgba(148,163,184,0.35)" />
          <text x="40" y="177" font-size="12" font-weight="900" fill="var(--color-text)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">聯絡人 B</text>
        </g>
        <g>
          <rect x="340" y="52" width="364" height="140" rx="14" fill="rgba(255,255,255,0.75)" stroke="rgba(148,163,184,0.65)" />
          <text x="352" y="76" font-size="13" font-weight="900" fill="var(--color-text)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">新增維修單時的好處</text>
          <text x="352" y="104" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">• 快速選公司</text>
          <text x="352" y="128" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">• 帶入聯絡人資訊</text>
          <text x="352" y="152" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">• 報價/週報減少重填</text>
        </g>
      </svg>
    `;
  }

  svgPartsPipeline(){
    return `
      <svg viewBox="0 0 720 190" role="img" aria-label="零件狀態流程">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
            <polygon points="0 0, 10 5, 0 10" fill="rgba(100,116,139,0.9)"></polygon>
          </marker>
        </defs>
        <rect x="0" y="0" width="720" height="190" rx="14" fill="rgba(255,255,255,0.55)" stroke="rgba(148,163,184,0.45)" />
        <text x="16" y="24" font-size="14" font-weight="900" fill="var(--color-text)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">零件狀態流程（建議）</text>
        ${this.svgBox(16, 54, 120, 52, '需求')}
        ${this.svgBox(158, 54, 120, 52, '已報價')}
        ${this.svgBox(300, 54, 120, 52, '已下單')}
        ${this.svgBox(442, 54, 120, 52, '已到貨')}
        ${this.svgBox(584, 54, 120, 52, '已更換')}
        ${this.svgArrow(136, 80, 158, 80)}
        ${this.svgArrow(278, 80, 300, 80)}
        ${this.svgArrow(420, 80, 442, 80)}
        ${this.svgArrow(562, 80, 584, 80)}
        <text x="16" y="148" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">系統會在維修卡片上以 chips 顯示目前狀態（例如：需要零件 / 已結案）。</text>
      </svg>
    `;
  }

  svgQuoteOrderLink(){
    return `
      <svg viewBox="0 0 720 200" role="img" aria-label="報價訂單連動">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
            <polygon points="0 0, 10 5, 0 10" fill="rgba(100,116,139,0.9)"></polygon>
          </marker>
        </defs>
        <rect x="0" y="0" width="720" height="200" rx="14" fill="rgba(255,255,255,0.55)" stroke="rgba(148,163,184,0.45)" />
        <text x="16" y="24" font-size="14" font-weight="900" fill="var(--color-text)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">報價 / 訂單與維修單連動</text>
        ${this.svgBox(16, 54, 210, 52, 'repairs（維修單）')}
        ${this.svgBox(260, 54, 210, 52, 'quotes（報價）')}
        ${this.svgBox(498, 54, 206, 52, 'orders（訂單）')}
        ${this.svgArrow(226, 80, 260, 80)}
        ${this.svgArrow(470, 80, 498, 80)}

        <text x="16" y="140" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">建議：維護 repairId / quoteId，可讓後續查詢與追蹤更一致。</text>
      </svg>
    `;
  }

  svgWeeklyOutput(){
    return `
      <svg viewBox="0 0 720 210" role="img" aria-label="週報輸出">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
            <polygon points="0 0, 10 5, 0 10" fill="rgba(100,116,139,0.9)"></polygon>
          </marker>
        </defs>
        <rect x="0" y="0" width="720" height="210" rx="14" fill="rgba(255,255,255,0.55)" stroke="rgba(148,163,184,0.45)" />
        <text x="16" y="24" font-size="14" font-weight="900" fill="var(--color-text)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">週報輸出（mailto）</text>
        ${this.svgBox(16, 52, 210, 52, '本週工作 / 下週計畫')}
        ${this.svgBox(260, 52, 210, 52, '預覽（卡片排版）')}
        ${this.svgBox(498, 52, 206, 52, 'mailto 寄送')}
        ${this.svgArrow(226, 78, 260, 78)}
        ${this.svgArrow(470, 78, 498, 78)}

        <text x="16" y="140" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">收件人與簽名檔可在「設定」維護。</text>
      </svg>
    `;
  }

  svgMigrationMap(){
    return `
      <svg viewBox="0 0 720 230" role="img" aria-label="搬移路徑對照">
        <rect x="0" y="0" width="720" height="230" rx="14" fill="rgba(255,255,255,0.55)" stroke="rgba(148,163,184,0.45)" />
        <text x="16" y="24" font-size="14" font-weight="900" fill="var(--color-text)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">舊 → 新 路徑對照</text>

        <g>
          <rect x="16" y="52" width="330" height="160" rx="14" fill="rgba(255,255,255,0.75)" stroke="rgba(148,163,184,0.65)" />
          <text x="28" y="76" font-size="13" font-weight="900" fill="var(--color-text)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">舊（根節點）</text>
          <text x="28" y="104" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">repairs</text>
          <text x="28" y="126" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">repairHistory</text>
          <text x="28" y="148" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">customers</text>
          <text x="28" y="170" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">parts / quotes / orders ...</text>
        </g>

        <g>
          <rect x="374" y="52" width="330" height="160" rx="14" fill="rgba(255,255,255,0.75)" stroke="rgba(148,163,184,0.65)" />
          <text x="386" y="76" font-size="13" font-weight="900" fill="var(--color-text)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">新（UID 命名空間）</text>
          <text x="386" y="104" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">data/&lt;uid&gt;/repairs</text>
          <text x="386" y="126" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">data/&lt;uid&gt;/repairHistory</text>
          <text x="386" y="148" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">data/&lt;uid&gt;/customers</text>
          <text x="386" y="170" font-size="12" fill="var(--color-text-secondary)" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">data/&lt;uid&gt;/parts / quotes / orders ...</text>
        </g>

        <line x1="346" y1="130" x2="374" y2="130" stroke="rgba(100,116,139,0.9)" stroke-width="2" />
        <polygon points="374 126, 384 130, 374 134" fill="rgba(100,116,139,0.9)"></polygon>
      </svg>
    `;
  }

  // -----------------------------
  // Utils
  // -----------------------------
  escape(str){
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

window.guideUI = new GuideUI();
console.log('✅ GuideUI loaded');
