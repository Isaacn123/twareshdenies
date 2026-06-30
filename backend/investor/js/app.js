requireAuth();

let profile = null;
let currencyRate = 3662;

function p() {
  return profile?.portfolio || {};
}

function esc(text) {
  return String(text ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function initials(name) {
  return (name || 'I').trim().charAt(0).toUpperCase();
}

function roleLabel(type) {
  return String(type || 'investor').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function flattenAssets(assets) {
  if (!assets) return [];
  return Object.values(assets).flat();
}

function changeClass(value) {
  const n = Number(value);
  if (Number.isNaN(n) || n === 0) return '';
  return n > 0 ? 'change-positive' : 'change-negative';
}

function formatChange(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
}

function formatPrice(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'string' && value.startsWith('$')) return value;
  return '$' + Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'string' && value.startsWith('$')) return value;
  return '$' + Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function setChangeEl(el, changeText, pctText) {
  if (!el) return;
  const parts = [changeText, pctText].filter(Boolean);
  el.innerHTML = parts.length
    ? `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg> ${esc(parts.join(' '))} vs last month`
    : '';
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

  const target = document.getElementById('page-' + id);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    if (item.dataset.page === id) item.classList.add('active');
  });

  if (id === 'documents') renderDocumentsPage();
  if (id === 'settings') renderSettingsPage();
  if (id === 'overview') window.TFCharts?.init(p());
}

window.showPage = showPage;

function renderAllocationLegend(allocation) {
  const legend = document.getElementById('allocationLegend');
  if (!legend) return;
  legend.innerHTML = (allocation || []).map(item => `
    <div class="legend-item">
      <div class="legend-left">
        <div class="legend-dot" style="background:${esc(item.color || '#94a3b8')}"></div>
        <span class="legend-name">${esc(item.name)}</span>
      </div>
      <span class="legend-pct">${item.pct}%</span>
    </div>`).join('');

  const top = allocation?.[0];
  const pctEl = document.getElementById('donutPct');
  const labelEl = document.getElementById('donutLabel');
  if (pctEl) pctEl.textContent = top ? `${top.pct}%` : '—';
  if (labelEl) labelEl.textContent = top?.name || 'Allocation';
}

function assetColors(symbol) {
  const map = { BTC: '#f59e0b', ETH: '#3b82f6', SOL: '#9945ff', AAPL: '#111827', XAU: '#f97316', MSFT: '#2563eb', UST: '#64748b', VNQ: '#8b5cf6', USD: '#64748b' };
  return map[symbol] || '#64748b';
}

function holdingsRow(asset, maxAlloc) {
  const alloc = Number(asset.allocation || 0);
  const barWidth = maxAlloc ? Math.max(3, Math.round((alloc / maxAlloc) * 58)) : 3;
  const symbol = esc(asset.symbol || asset.name?.slice(0, 2) || '—');
  const color = assetColors(asset.symbol);
  return `<tr>
    <td><div class="asset-name-col">
      <div class="asset-icon" style="background:${color}20;color:${color}">${symbol.slice(0, 2)}</div>
      <span class="asset-ticker">${esc(asset.name)}${asset.symbol ? ` (${esc(asset.symbol)})` : ''}</span>
    </div></td>
    <td><span class="price-val">${formatPrice(asset.price)}</span></td>
    <td><span class="${changeClass(asset.change_24h)}">${formatChange(asset.change_24h)}</span></td>
    <td><span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text2)">${esc(asset.holdings || '—')}</span></td>
    <td><span class="holdings-val">${formatValue(asset.value)}</span></td>
    <td><div class="alloc-bar-wrap"><div class="alloc-bar" style="width:${barWidth}px"></div><span class="alloc-pct">${alloc ? alloc + '%' : '—'}</span></div></td>
  </tr>`;
}

function renderHoldingsTables() {
  const assets = flattenAssets(p().assets);
  const maxAlloc = assets.reduce((max, a) => Math.max(max, Number(a.allocation || 0)), 0);
  const rows = assets.length
    ? assets.map(a => holdingsRow(a, maxAlloc)).join('')
    : '<tr><td colspan="6" style="color:var(--text3);padding:16px 0">No holdings data yet.</td></tr>';

  ['overviewHoldingsBody', 'portfolioHoldingsBody'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = id === 'overviewHoldingsBody' ? assets.slice(0, 5).map(a => holdingsRow(a, maxAlloc)).join('') || rows : rows;
  });
}

function renderMarketMini() {
  const grid = document.getElementById('marketMiniGrid');
  const items = p().market_snapshot || [];
  if (!grid) return;
  grid.innerHTML = items.length
    ? items.map(item => {
      const cls = Number(item.change) >= 0 ? 'up' : 'down';
      return `<div class="market-mini-card">
        <div class="market-mini-name">${esc(item.name)}</div>
        <div class="market-mini-price">${esc(item.value)}</div>
        <div class="market-mini-chg ${cls}">${formatChange(item.change)}</div>
      </div>`;
    }).join('')
    : '<div style="color:var(--text3);font-size:13px">Market data unavailable.</div>';
}

function renderSummaryRows() {
  const map = [
    ['summaryInvested', p().total_invested],
    ['summaryReturns', p().total_returns],
    ['summaryNetWorth', p().net_worth],
    ['summaryFlex', p().flex_funds || p().available_funds],
  ];
  map.forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value || '—';
  });
}

function applyPortfolioData() {
  const portfolio = p();

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el && value != null) el.textContent = value;
  };

  setText('kpiNetWorth', portfolio.net_worth);
  setText('kpiInvested', portfolio.total_invested);
  setText('kpiReturns', portfolio.total_returns);
  setChangeEl(document.getElementById('kpiNetWorthChange'), portfolio.net_worth_change, portfolio.net_worth_change_pct);
  setChangeEl(document.getElementById('kpiInvestedChange'), portfolio.total_invested_change, portfolio.total_invested_change_pct);
  setChangeEl(document.getElementById('kpiReturnsChange'), portfolio.total_returns_change, portfolio.total_returns_change_pct);

  setText('perfVal', portfolio.performance?.total_returns || portfolio.total_returns);
  setText('perfBadge', portfolio.performance?.ytd_pct || portfolio.ytd_return || '—');

  setText('portStatValue', portfolio.net_worth || portfolio.aum);
  setText('portStatGains', portfolio.total_returns);
  setText('portStatFlex', portfolio.flex_funds || portfolio.available_funds || '—');

  renderAllocationLegend(portfolio.allocation || []);
  renderHoldingsTables();
  renderMarketMini();
  renderSummaryRows();
  window.TFCharts?.init(portfolio);
}

function initProfileUI() {
  const name = profile.full_name || 'Investor';
  const role = roleLabel(profile.investor_type);
  const firstName = name.split(' ')[0];
  const hour = new Date().getHours();
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  document.getElementById('sidebarAvatar').textContent = initials(name);
  document.getElementById('sidebarName').textContent = name;
  document.getElementById('sidebarRole').textContent = role;
  document.getElementById('userPillAv').textContent = initials(name);
  document.getElementById('userPillName').textContent = role;
  document.getElementById('topbarGreeting').textContent = `Good ${period}, ${firstName}`;
}

function initCurrencyConverter() {
  const currency = p().currency || {};
  if (currency.rate) {
    const match = String(currency.rate).match(/([\d.]+)/g);
    if (match?.length) currencyRate = Number(match[match.length - 1]) || currencyRate;
  }

  const input = document.getElementById('usd-input');
  const output = document.getElementById('ugx-output');
  if (!input || !output) return;

  const convert = () => {
    const usd = parseFloat(input.value) || 0;
    output.textContent = Math.round(usd * currencyRate).toLocaleString();
  };

  input.addEventListener('input', convert);
  window.swapCurrency = () => {
    const usd = parseFloat(input.value) || 0;
    input.value = Math.round(usd * currencyRate);
    convert();
  };
  convert();
}

async function renderDocumentsPage() {
  const container = document.getElementById('documentsContent');
  if (!container || container.dataset.loaded) return;

  container.innerHTML = '<div class="page-heading"><div class="section-title">Documents</div><div class="section-sub">Loading shared reports and statements…</div></div>';
  try {
    const docs = await API.documents();
    container.dataset.loaded = '1';
    container.innerHTML = `
      <div class="page-heading"><div class="section-title">Documents</div><div class="section-sub">Reports and statements shared with you.</div></div>
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Your documents</span></div>
        <table class="holdings-table">
          <thead><tr><th>Title</th><th>Type</th><th>Date</th><th></th></tr></thead>
          <tbody>${docs.length ? docs.map(doc => `
            <tr>
              <td class="asset-ticker">${esc(doc.title)}</td>
              <td>${esc(doc.doc_type || '—')}</td>
              <td style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text2)">${new Date(doc.created_at).toLocaleDateString()}</td>
              <td>${doc.file_url ? `<a class="btn-download" style="display:inline-flex;padding:6px 12px;font-size:11px;text-decoration:none" href="${esc(doc.file_url)}" target="_blank" rel="noopener">Open</a>` : '—'}</td>
            </tr>`).join('') : '<tr><td colspan="4" style="color:var(--text3)">No documents shared yet.</td></tr>'}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="stub-hero"><div class="stub-title">Documents unavailable</div><div class="stub-sub">${esc(err.message)}</div></div>`;
  }
}

async function renderSettingsPage() {
  const container = document.getElementById('settingsContent');
  if (!container || container.dataset.loaded) return;
  container.dataset.loaded = '1';

  const msgs = await API.messages().catch(() => []);
  container.innerHTML = `
    <div class="page-heading"><div class="section-title">Settings</div><div class="section-sub">Account details and advisor messages.</div></div>
    <div class="content-grid" style="grid-template-columns:1fr 1fr">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Profile</span></div>
        <div class="summary-row"><span class="summary-label">Name</span><span class="summary-amount">${esc(profile.full_name)}</span></div>
        <div class="summary-row"><span class="summary-label">Email</span><span class="summary-amount">${esc(profile.email || '—')}</span></div>
        <div class="summary-row"><span class="summary-label">Type</span><span class="summary-amount">${esc(roleLabel(profile.investor_type))}</span></div>
      </div>
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Message advisor</span></div>
        <div class="field"><label>Subject</label><input id="msgSubject" value="Consultation request"></div>
        <div class="field"><label>Message</label><textarea id="msgBody" rows="4" style="width:100%;padding:11px 12px;border:1px solid var(--border);border-radius:8px"></textarea></div>
        <button class="btn-primary" id="sendMsgBtn" type="button" style="width:auto;padding:10px 18px">Send message</button>
      </div>
    </div>
    <div class="widget" style="margin-top:16px">
      <div class="widget-header"><span class="widget-title">Message history</span></div>
      ${msgs.length ? msgs.map(m => `
        <div class="summary-row" style="flex-direction:column;align-items:flex-start;gap:6px">
          <strong>${esc(m.subject)}</strong>
          <span style="color:var(--text3);font-size:12px">${esc(m.sender_name)} · ${new Date(m.created_at).toLocaleString()}</span>
          <span style="font-size:13px;color:var(--text2)">${esc(m.body)}</span>
        </div>`).join('') : '<p style="color:var(--text3);margin:0">No messages yet.</p>'}
    </div>`;

  document.getElementById('sendMsgBtn').onclick = async () => {
    await API.sendMessage(document.getElementById('msgBody').value, document.getElementById('msgSubject').value);
    container.dataset.loaded = '';
    renderSettingsPage();
  };
}

function bindUI() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => showPage(item.dataset.page));
  });

  document.addEventListener('click', e => {
    const link = e.target.closest('[data-page]');
    if (link && link.classList.contains('widget-link')) {
      e.preventDefault();
      showPage(link.dataset.page);
    }
  });

  document.getElementById('notifBtn')?.addEventListener('click', () => showPage('alerts'));
  document.querySelectorAll('.btn-schedule').forEach(btn => {
    btn.addEventListener('click', () => showPage('support'));
  });

  document.querySelector('.btn-download')?.addEventListener('click', () => {
    alert('Report generation coming soon.\nYour wealth concierge can provide a detailed PDF report.');
  });

  const userPill = document.getElementById('userPill');
  const userMenu = document.getElementById('userMenu');
  userPill?.addEventListener('click', e => {
    e.stopPropagation();
    userMenu?.classList.toggle('hidden');
  });
  document.addEventListener('click', () => userMenu?.classList.add('hidden'));
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    clearTokens();
    window.location.href = 'login';
  });
}

async function init() {
  bindUI();
  try {
    profile = await API.me();
    initProfileUI();
    applyPortfolioData();
    initCurrencyConverter();
    showPage('overview');
  } catch {
    clearTokens();
    window.location.href = 'login';
  }
}

init();
