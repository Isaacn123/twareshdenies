requireAuth();

const pageContent = document.getElementById('pageContent');
let profile = null;
let activeAssetTab = 'crypto';

const pages = {
  dashboard: renderDashboard,
  portfolios: renderPortfolios,
  watchlist: renderWatchlist,
  insights: renderInsights,
  otc: renderOtc,
  crypto: () => renderAssetsPage('crypto'),
  signals: renderSignals,
  reports: renderReports,
  documents: renderDocuments,
  alerts: renderAlerts,
  settings: renderSettings,
};

document.querySelectorAll('.nav-link[data-page]').forEach(link => {
  link.addEventListener('click', e => { e.preventDefault(); navigate(link.dataset.page); });
});

document.getElementById('profileDropdown').querySelector('button').onclick = e => {
  e.stopPropagation();
  document.getElementById('profileDropdown').classList.toggle('open');
};
document.addEventListener('click', () => document.getElementById('profileDropdown').classList.remove('open'));
document.getElementById('logoutBtn').onclick = () => { clearTokens(); window.location.href = 'login'; };
document.getElementById('promoBtn').onclick = () => navigate('settings');
document.getElementById('createPortfolioBtn').onclick = () => navigate('portfolios');
document.getElementById('notifBtn').onclick = () => navigate('alerts');

function p() { return profile?.portfolio || {}; }

function greeting() {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const name = (profile?.full_name || 'Investor').split(' ')[0];
  document.getElementById('greetingText').textContent = `Good ${period}, ${name}`;
}

async function init() {
  try {
    profile = await API.me();
    document.getElementById('profileName').textContent = profile.full_name;
    document.getElementById('profileRole').textContent = (profile.investor_type || 'investor').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    document.getElementById('avatar').textContent = profile.full_name.charAt(0).toUpperCase();
    greeting();
    navigate('dashboard');
  } catch {
    clearTokens();
    window.location.href = 'login';
  }
}

function navigate(page) {
  document.querySelectorAll('.nav-link[data-page]').forEach(l => l.classList.toggle('active', l.dataset.page === page));
  pages[page]?.();
}

function renderDashboard() {
  const d = p();
  pageContent.innerHTML = `
    <div class="dash-grid">
      <div class="dash-stats">
        ${metricCard('Total Net Worth', d.net_worth, d.net_worth_change, d.net_worth_change_pct, 'spark-net', d.sparklines?.net_worth)}
        ${metricCard('Total Invested', d.total_invested, d.total_invested_change, d.total_invested_change_pct)}
        ${metricCard('Total Returns', d.total_returns, d.total_returns_change, d.total_returns_change_pct)}
        ${metricCard('Investments', d.investments_count, null, null, null, null, `${d.asset_classes || 6} Asset Classes`, true)}
      </div>

      <div class="dash-mid">
        <div class="card">
          <div class="card-head"><h3>Portfolio Allocation</h3></div>
          <div class="alloc-layout">
            <div class="chart-wrap sm"><canvas id="allocChart"></canvas></div>
            <div class="legend-list" id="allocLegend"></div>
          </div>
        </div>
        <div class="card">
          <div class="card-head">
            <div>
              <h3>Portfolio Performance</h3>
              <div class="perf-head"><div class="big">${esc(d.performance?.total_returns || d.total_returns)}</div></div>
              <div class="perf-ytd">${esc(d.performance?.ytd_pct || d.ytd_return || '')} (YTD)</div>
            </div>
            <select class="filter-select" style="padding:6px 10px;border:1px solid var(--line);border-radius:8px;font-size:12px"><option>YTD</option></select>
          </div>
          <div class="chart-wrap"><canvas id="perfChart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Currency Converter</h3></div>
          ${renderFx(d.currency)}
        </div>
      </div>

      <div class="dash-lower">
        <div class="card">
          <div class="card-head"><h3>Assets Overview</h3></div>
          ${assetTabs()}
          <div class="table-wrap" id="assetTable"></div>
        </div>
        <div style="display:grid;gap:14px">
          <div class="card">
            <div class="card-head"><h3>OTC Trades</h3><button class="btn btn-outline btn-sm" type="button" onclick="navigate('otc')">View all</button></div>
            <div class="side-list">${(d.otc_trades || []).slice(0, 3).map(otcItem).join('') || emptyBlock()}</div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Market Snapshot</h3></div>
            <div class="side-list">${(d.market_snapshot || []).map(marketItem).join('') || emptyBlock()}</div>
          </div>
        </div>
      </div>

      <div>
        <div class="card-head" style="margin-bottom:12px"><h3>Smart Investment Ideas for You</h3></div>
        <div class="dash-ideas">${(d.smart_ideas || []).map(ideaCard).join('') || emptyBlock('No ideas at this time.')}</div>
      </div>
    </div>`;

  bindAssetTabs();
  renderAssetTable(activeAssetTab);
  renderCharts();
}

function metricCard(label, value, change, pct, sparkId, sparkData, sub, countMode) {
  const changeHtml = change && pct
    ? `<div class="metric-change">${esc(change)} / ${esc(pct)}</div>` : sub && countMode
    ? `<div class="metric-sub">Across ${esc(sub)}</div>` : '';
  const spark = sparkId && sparkData?.length
    ? `<div class="spark-wrap"><canvas id="${sparkId}"></canvas></div>` : '';
  return `<div class="card metric-card">
    <div>
      <div class="label">${esc(label)}</div>
      <div class="value">${esc(value || '—')}</div>
      ${changeHtml}
      ${spark}
    </div>
    <div class="metric-icon">${countMode ? '◉' : '↗'}</div>
  </div>`;
}

function renderFx(fx) {
  fx = fx || { from: 'USD', to: 'EUR', from_amount: 1000, to_amount: 920, rate: '1 USD = 0.92 EUR' };
  return `<div class="fx-box">
    <div class="fx-row">
      <div class="field" style="margin:0"><label>From</label><input id="fxFrom" value="${esc(fx.from_amount)}" type="number"></div>
      <button class="fx-swap" type="button" id="fxSwap">⇄</button>
      <div class="field" style="margin:0"><label>To</label><input id="fxTo" value="${esc(fx.to_amount)}" readonly></div>
    </div>
    <div class="fx-rate">${esc(fx.rate || `${fx.from} → ${fx.to}`)}</div>
  </div>`;
}

function assetTabs() {
  const tabs = ['Stocks', 'Crypto', 'Commodities', 'Bonds', 'Real Estate', 'Cash'];
  const keys = ['stocks', 'crypto', 'commodities', 'bonds', 'real_estate', 'cash'];
  return `<div class="tabs">${tabs.map((t, i) =>
    `<button class="tab ${keys[i] === activeAssetTab ? 'active' : ''}" data-tab="${keys[i]}" type="button">${t}</button>`
  ).join('')}</div>`;
}

function bindAssetTabs() {
  pageContent.querySelectorAll('.tab[data-tab]').forEach(btn => {
    btn.onclick = () => {
      activeAssetTab = btn.dataset.tab;
      pageContent.querySelectorAll('.tab[data-tab]').forEach(b => b.classList.toggle('active', b === btn));
      renderAssetTable(activeAssetTab);
    };
  });
}

function renderAssetTable(tab) {
  const assets = (p().assets || {})[tab] || [];
  const el = document.getElementById('assetTable');
  if (!el) return;
  el.innerHTML = `<table>
    <thead><tr><th>Asset</th><th>Price (USD)</th><th>24h Change</th><th>Holdings</th><th>Value (USD)</th><th>Allocation</th></tr></thead>
    <tbody>${assets.length ? assets.map(assetRow).join('') : `<tr><td colspan="6">${emptyBlock()}</td></tr>`}</tbody>
  </table>`;
}

function assetRow(a) {
  const ch = Number(a.change_24h);
  const cls = ch >= 0 ? 'pos' : 'neg';
  return `<tr>
    <td><div class="asset-cell"><div class="asset-icon">${esc((a.symbol || a.name || '?').slice(0, 3))}</div><div>${esc(a.name)}<small>${esc(a.symbol || '')}</small></div></div></td>
    <td>${fmtUsd(a.price)}</td>
    <td class="${cls}">${ch >= 0 ? '+' : ''}${ch}%</td>
    <td>${esc(a.holdings)}</td>
    <td>${fmtUsd(a.value)}</td>
    <td>${esc(a.allocation)}%</td>
  </tr>`;
}

function otcItem(t) {
  return `<div class="side-item">
    <strong>${esc(t.title)}</strong>
    <small>Settlement ${esc(t.settlement)}</small>
    <div class="side-item-row"><span>${esc(t.amount)}</span><span class="badge ${t.side?.toLowerCase() === 'sell' ? 'sell' : 'buy'}">${esc(t.side || 'Buy')}</span></div>
  </div>`;
}

function marketItem(m) {
  const ch = Number(m.change);
  return `<div class="side-item">
    <div class="side-item-row"><strong>${esc(m.name)}</strong><span>${esc(m.value)}</span></div>
    <small class="${ch >= 0 ? 'pos' : 'neg'}">${ch >= 0 ? '+' : ''}${ch}% today</small>
  </div>`;
}

function ideaCard(idea) {
  return `<div class="card idea-card">
    <div class="idea-icon">★</div>
    <span class="badge muted">${esc(idea.category)}</span>
    <h4>${esc(idea.title)}</h4>
    <p>${esc(idea.description)}</p>
    <div class="min-inv">Min. Investment<strong>${esc(idea.min_investment)}</strong></div>
  </div>`;
}

function renderCharts() {
  const d = p();
  const alloc = d.allocation || [];
  if (alloc.length) {
    TICCharts.donut(
      'allocChart',
      alloc.map(a => a.name),
      alloc.map(a => a.pct),
      alloc.map(a => a.color || '#7c3aed'),
      d.allocation_center || '',
      'USD'
    );
    const leg = document.getElementById('allocLegend');
    if (leg) leg.innerHTML = alloc.map(a =>
      `<div class="legend-item"><div class="legend-left"><span class="legend-dot" style="background:${a.color || '#7c3aed'}"></span>${esc(a.name)}</div><strong>${a.pct}%</strong></div>`
    ).join('');
  }
  const perf = d.performance || {};
  if (perf.labels?.length) TICCharts.line('perfChart', perf.labels, perf.values);
  if (d.sparklines?.net_worth?.length) TICCharts.sparkline('spark-net', d.sparklines.net_worth);
}

function renderPortfolios() {
  const d = p();
  pageContent.innerHTML = `<div class="page-heading"><h2>Portfolios</h2><p>Your managed investment portfolios.</p></div>
    <div class="grid-2">
      <div class="card"><div class="label">Net Worth</div><div class="stat-value">${esc(d.net_worth)}</div></div>
      <div class="card"><div class="label">Total Invested</div><div class="stat-value">${esc(d.total_invested)}</div></div>
    </div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>Allocation</h3></div>${renderAllocationTable(d.allocation)}</div>`;
}

function renderWatchlist() {
  const list = p().watchlist || p().assets?.crypto || [];
  pageContent.innerHTML = `<div class="page-heading"><h2>Watchlist</h2><p>Assets you're monitoring.</p></div>
    <div class="card table-wrap"><table><thead><tr><th>Asset</th><th>Price</th><th>24h</th></tr></thead><tbody>
      ${list.map(a => `<tr><td>${esc(a.name)}</td><td>${fmtUsd(a.price)}</td><td class="${Number(a.change_24h) >= 0 ? 'pos' : 'neg'}">${a.change_24h}%</td></tr>`).join('')}
    </tbody></table></div>`;
}

function renderInsights() {
  pageContent.innerHTML = `<div class="page-heading"><h2>Market Insights</h2><p>Research and commentary from your advisor.</p></div>
    <div class="dash-ideas">${(p().smart_ideas || []).map(ideaCard).join('') || emptyBlock()}</div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>Market Snapshot</h3></div><div class="side-list">${(p().market_snapshot || []).map(marketItem).join('')}</div></div>`;
}

function renderOtc() {
  pageContent.innerHTML = `<div class="page-heading"><h2>OTC Trades</h2><p>Over-the-counter block trades and settlements.</p></div>
    <div class="card side-list">${(p().otc_trades || []).map(otcItem).join('') || emptyBlock()}</div>`;
}

function renderAssetsPage(tab) {
  activeAssetTab = tab;
  pageContent.innerHTML = `<div class="page-heading"><h2>Crypto Assets</h2><p>Digital asset holdings and performance.</p></div>
    <div class="card">${assetTabs()}<div class="table-wrap" id="assetTable"></div></div>`;
  bindAssetTabs();
  renderAssetTable(tab);
}

function renderSignals() {
  pageContent.innerHTML = `<div class="page-heading"><h2>Smart Signals</h2><p>AI-assisted investment signals curated by your advisor.</p></div>
    <div class="dash-ideas">${(p().smart_ideas || []).map(ideaCard).join('') || emptyBlock()}</div>`;
}

async function renderReports() { await renderDocuments(); }

async function renderDocuments() {
  const docs = await API.documents();
  pageContent.innerHTML = `<div class="page-heading"><h2>Documents</h2><p>Reports and statements shared with you.</p></div>
    <div class="card table-wrap"><table><thead><tr><th>Title</th><th>Type</th><th>Date</th><th></th></tr></thead><tbody>
      ${docs.length ? docs.map(d => `<tr><td>${esc(d.title)}</td><td>${esc(d.doc_type)}</td><td>${new Date(d.created_at).toLocaleDateString()}</td><td>${d.file_url ? `<a class="btn btn-outline btn-sm" href="${esc(d.file_url)}" target="_blank" rel="noopener">Open</a>` : '—'}</td></tr>`).join('') : `<tr><td colspan="4">${emptyBlock()}</td></tr>`}
    </tbody></table></div>`;
}

function renderAlerts() {
  const alerts = p().alerts || [
    { title: 'Portfolio review scheduled', date: 'May 28', type: 'info' },
    { title: 'BTC crossed target allocation', date: 'May 26', type: 'warning' },
  ];
  pageContent.innerHTML = `<div class="page-heading"><h2>Alerts</h2><p>Notifications about your portfolio.</p></div>
    <div class="card side-list">${alerts.map(a => `<div class="side-item"><strong>${esc(a.title)}</strong><small>${esc(a.date)}</small></div>`).join('')}</div>`;
}

async function renderSettings() {
  const msgs = await API.messages();
  pageContent.innerHTML = `
    <div class="page-heading"><h2>Settings</h2><p>Account preferences and advisor messages.</p></div>
    <div class="grid-2">
      <div class="card">
        <div class="card-head"><h3>Profile</h3></div>
        <div class="side-list">
          <div class="side-item"><small>Name</small><strong>${esc(profile.full_name)}</strong></div>
          <div class="side-item"><small>Email</small><strong>${esc(profile.email || '—')}</strong></div>
          <div class="side-item"><small>Type</small><strong>${esc((profile.investor_type || '').replace(/_/g, ' '))}</strong></div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Message advisor</h3></div>
        <div class="field"><label>Subject</label><input id="msgSubject" value="Consultation request"></div>
        <div class="field"><label>Message</label><textarea id="msgBody"></textarea></div>
        <button class="btn btn-primary btn-sm" id="sendMsg" type="button">Send</button>
      </div>
    </div>
    <div class="card" style="margin-top:16px">${msgs.length ? msgs.map(m => `<div class="side-item"><strong>${esc(m.subject)}</strong><small>${esc(m.sender_name)} · ${new Date(m.created_at).toLocaleString()}</small><p style="margin:8px 0 0;font-size:13px">${esc(m.body)}</p></div>`).join('') : emptyBlock('No messages yet.')}</div>`;
  document.getElementById('sendMsg').onclick = async () => {
    await API.sendMessage(document.getElementById('msgBody').value, document.getElementById('msgSubject').value);
    renderSettings();
  };
}

function renderAllocationTable(allocation) {
  if (!allocation?.length) return emptyBlock();
  return `<table><thead><tr><th>Asset class</th><th>%</th></tr></thead><tbody>
    ${allocation.map(a => `<tr><td>${esc(a.name)}</td><td>${a.pct}%</td></tr>`).join('')}
  </tbody></table>`;
}

function emptyBlock(msg = 'No data available.') {
  return `<div class="empty-state" style="padding:20px;text-align:center;color:var(--muted)">${msg}</div>`;
}

function fmtUsd(v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'string' && v.startsWith('$')) return v;
  return '$' + Number(v).toLocaleString();
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

init();
window.navigate = navigate;
