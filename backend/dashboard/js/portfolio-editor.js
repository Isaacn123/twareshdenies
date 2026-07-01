const PF_ASSET_CATEGORIES = [
  { key: 'crypto', label: 'Crypto' },
  { key: 'stocks', label: 'Stocks' },
  { key: 'bonds', label: 'Bonds' },
  { key: 'commodities', label: 'Commodities' },
  { key: 'real_estate', label: 'Real Estate' },
  { key: 'cash', label: 'Cash' },
];

function pfRowActions(scope, category = '') {
  const cat = category ? ` data-pf-category="${category}"` : '';
  return `<div class="nav-row-actions">
    <button type="button" class="btn btn-ghost btn-sm" data-pf-action="move-up" data-pf-scope="${scope}"${cat}>↑</button>
    <button type="button" class="btn btn-ghost btn-sm" data-pf-action="move-down" data-pf-scope="${scope}"${cat}>↓</button>
    <button type="button" class="btn btn-ghost btn-sm" data-pf-action="remove" data-pf-scope="${scope}"${cat}>Remove</button>
  </div>`;
}

function pfNum(value, fallback = 0) {
  if (value === '' || value == null) return fallback;
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

function pfParseMoney(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return value;
  return pfNum(String(value).replace(/[$,+]/g, ''), 0);
}

function pfField(label, id, value, type = 'text', extra = '') {
  return `<div class="field"><label>${label}</label><input class="table-input" id="${id}" type="${type}" value="${escapeAttr(value ?? '')}" ${extra}></div>`;
}

function pfGroupHoldings(holdings) {
  const groups = Object.fromEntries(PF_ASSET_CATEGORIES.map(c => [c.key, []]));
  (holdings || []).forEach(item => {
    const key = groups[item.category] ? item.category : 'crypto';
    groups[key].push(item);
  });
  return groups;
}

function pfAssetRow(item = {}, category = 'crypto') {
  const isCash = category === 'cash';
  return `<tr data-pf-category="${category}">
    <td><input class="table-input pf-asset-name" value="${escapeAttr(item.name || '')}" placeholder="Bitcoin"></td>
    <td><input class="table-input pf-asset-symbol" value="${escapeAttr(item.symbol || '')}" placeholder="BTC"></td>
    <td><input class="table-input pf-asset-price" type="number" step="0.01" value="${item.price ?? ''}"></td>
    <td><input class="table-input pf-asset-value" type="number" step="1" value="${item.value ?? ''}"></td>
    <td><input class="table-input pf-asset-holdings" value="${escapeAttr(item.holdings || item.holdings_text || '')}" placeholder="12.5 BTC"></td>
    <td><input class="table-input pf-asset-change" type="number" step="0.01" value="${item.change_24h ?? ''}"></td>
    <td style="text-align:center"><input type="checkbox" class="pf-asset-flex" ${item.is_flex || isCash ? 'checked' : ''} title="Counts as flex funds"></td>
    <td>${pfRowActions('asset', category)}</td>
  </tr>`;
}

function pfSimpleRow(cells, scope, placeholders = []) {
  return `<tr>${cells.map((val, i) =>
    `<td><input class="table-input pf-${scope}-cell" data-col="${i}" value="${escapeAttr(val ?? '')}" placeholder="${escapeAttr(placeholders[i] || '')}"></td>`
  ).join('')}<td>${pfRowActions(scope)}</td></tr>`;
}

function pfAssetSection(key, label, assets) {
  const rows = assets?.length ? assets.map(item => pfAssetRow(item, key)).join('') : '';
  return `<details class="expand-row pf-asset-group" data-asset-key="${key}" ${key === 'crypto' ? 'open' : ''}>
    <summary><span>${label}</span><span class="expand-meta">${(assets || []).length} holdings</span></summary>
    <div class="expand-body">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Symbol</th><th>Price</th><th>Value (USD)</th><th>Holdings</th><th>24h %</th><th>Flex</th><th></th></tr></thead>
          <tbody data-asset-body="${key}">${rows || '<tr class="pf-empty-row"><td colspan="8" style="color:var(--muted)">No holdings yet.</td></tr>'}</tbody>
        </table>
      </div>
      <button type="button" class="btn btn-ghost btn-sm" data-pf-action="add-asset" data-pf-category="${key}">Add ${label.toLowerCase()} holding</button>
    </div>
  </details>`;
}

function renderPortfolioEditor(investor = {}) {
  const computed = investor.portfolio || {};
  const grouped = pfGroupHoldings(investor.holdings || []);
  const currency = investor.currency || {};
  const market = investor.market_snapshot || [];
  const alerts = investor.alerts || [];
  const otc = investor.otc_trades || [];
  const ideas = investor.smart_ideas || [];

  return `
    <div id="portfolioEditor" class="stack-sections" style="margin-top:18px">
      <div class="card" style="margin:0;background:var(--surface2, rgba(255,255,255,.03))">
        <h4 style="margin:0 0 8px;color:var(--text)">Computed preview (investor dashboard)</h4>
        <p style="color:var(--muted);margin:0 0 14px;font-size:13px">These values are calculated from holdings and snapshots when you save.</p>
        <div class="grid-2">
          <div class="side-item"><small>Net worth</small><strong id="pf-preview-net-worth">${escapeHtml(computed.net_worth || '—')}</strong></div>
          <div class="side-item"><small>Total invested</small><strong id="pf-preview-invested">${escapeHtml(computed.total_invested || '—')}</strong></div>
          <div class="side-item"><small>Total returns</small><strong id="pf-preview-returns">${escapeHtml(computed.total_returns || '—')}</strong></div>
          <div class="side-item"><small>Flex funds</small><strong id="pf-preview-flex">${escapeHtml(computed.flex_funds || '—')}</strong></div>
          <div class="side-item"><small>MoM net worth</small><strong id="pf-preview-mom">${escapeHtml([computed.net_worth_change, computed.net_worth_change_pct].filter(Boolean).join(' ') || '—')}</strong></div>
          <div class="side-item"><small>Holdings / classes</small><strong>${escapeHtml(String(computed.investments_count ?? '—'))} / ${escapeHtml(String(computed.asset_classes ?? '—'))}</strong></div>
        </div>
      </div>

      <div class="card" style="margin:0">
        <h4 style="margin:0 0 14px;color:var(--text)">Capital contributed</h4>
        ${pfField('Total invested (USD)', 'pf-total-invested', pfParseMoney(investor.total_invested), 'number', 'step="1" min="0"')}
        <label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:13px;color:var(--text)">
          <input type="checkbox" id="pf-save-snapshot" checked>
          Save portfolio snapshot for today (used for trends and vs last month)
        </label>
      </div>

      <details class="expand-row" open>
        <summary><span>Holdings</span><span class="expand-meta">${(investor.holdings || []).length} positions</span></summary>
        <div class="expand-body expand-list">
          ${PF_ASSET_CATEGORIES.map(({ key, label }) => pfAssetSection(key, label, grouped[key])).join('')}
        </div>
      </details>

      <details class="expand-row">
        <summary><span>Market snapshot</span><span class="expand-meta">${market.length} markets</span></summary>
        <div class="expand-body">
          <div class="table-wrap"><table><thead><tr><th>Name</th><th>Value</th><th>Change %</th><th></th></tr></thead>
          <tbody id="pfMarketBody">${market.map(item => pfSimpleRow([item.name, item.value, item.change], 'market', ['S&P 500', '5,284', '0.42'])).join('') || '<tr class="pf-empty-row"><td colspan="4" style="color:var(--muted)">No markets yet.</td></tr>'}</tbody></table></div>
          <button type="button" class="btn btn-ghost btn-sm" data-pf-action="add-market">Add market</button>
        </div>
      </details>

      <details class="expand-row">
        <summary><span>Alerts</span><span class="expand-meta">${alerts.length} alerts</span></summary>
        <div class="expand-body">
          <div class="table-wrap"><table><thead><tr><th>Title</th><th>Date</th><th>Type</th><th></th></tr></thead>
          <tbody id="pfAlertsBody">${alerts.map(item => pfSimpleRow([item.title, item.date, item.type], 'alert', ['Portfolio review', 'Today', 'info'])).join('') || '<tr class="pf-empty-row"><td colspan="4" style="color:var(--muted)">No alerts yet.</td></tr>'}</tbody></table></div>
          <button type="button" class="btn btn-ghost btn-sm" data-pf-action="add-alert">Add alert</button>
        </div>
      </details>

      <details class="expand-row">
        <summary><span>OTC trades</span><span class="expand-meta">${otc.length} trades</span></summary>
        <div class="expand-body">
          <div class="table-wrap"><table><thead><tr><th>Title</th><th>Side</th><th>Amount</th><th>Settlement</th><th></th></tr></thead>
          <tbody id="pfOtcBody">${otc.map(item => pfSimpleRow([item.title, item.side, item.amount, item.settlement], 'otc', ['Block trade', 'Buy', '$450,000', 'May 18'])).join('') || '<tr class="pf-empty-row"><td colspan="5" style="color:var(--muted)">No trades yet.</td></tr>'}</tbody></table></div>
          <button type="button" class="btn btn-ghost btn-sm" data-pf-action="add-otc">Add trade</button>
        </div>
      </details>

      <details class="expand-row">
        <summary><span>Smart ideas</span><span class="expand-meta">${ideas.length} ideas</span></summary>
        <div class="expand-body">
          <div class="table-wrap"><table><thead><tr><th>Title</th><th>Category</th><th>Min investment</th><th>Description</th><th></th></tr></thead>
          <tbody id="pfIdeasBody">${ideas.map(item => pfSimpleRow([item.title, item.category, item.min_investment, item.description], 'idea', ['AI Leaders', 'Equity', '$50,000', 'Short summary'])).join('') || '<tr class="pf-empty-row"><td colspan="5" style="color:var(--muted)">No ideas yet.</td></tr>'}</tbody></table></div>
          <button type="button" class="btn btn-ghost btn-sm" data-pf-action="add-idea">Add idea</button>
        </div>
      </details>

      <details class="expand-row">
        <summary><span>Currency converter</span></summary>
        <div class="expand-body grid-2">
          ${pfField('From currency', 'pf-currency-from', currency.from, 'text')}
          ${pfField('To currency', 'pf-currency-to', currency.to, 'text')}
          ${pfField('Rate label', 'pf-currency-rate', currency.rate, 'text')}
          ${pfField('From amount', 'pf-currency-from-amount', currency.from_amount, 'number')}
          ${pfField('To amount', 'pf-currency-to-amount', currency.to_amount, 'number')}
        </div>
      </details>
    </div>`;
}

function pfClearEmptyRow(tbody) {
  tbody?.querySelector('.pf-empty-row')?.remove();
}

function pfMoveRow(row, direction) {
  if (!row) return;
  if (direction === 'up' && row.previousElementSibling) row.parentElement.insertBefore(row, row.previousElementSibling);
  else if (direction === 'down' && row.nextElementSibling) row.parentElement.insertBefore(row.nextElementSibling, row);
}

function pfCollectSimpleRows(tbody, scope, cols) {
  if (!tbody) return [];
  return [...tbody.querySelectorAll('tr')].filter(row => !row.classList.contains('pf-empty-row')).map(row => {
    const inputs = [...row.querySelectorAll(`.pf-${scope}-cell`)];
    const item = {};
    cols.forEach((key, i) => {
      const raw = inputs[i]?.value.trim() ?? '';
      item[key] = key === 'change' ? pfNum(raw, 0) : raw;
    });
    return item;
  }).filter(item => Object.values(item).some(v => v !== '' && v !== 0));
}

function collectPortfolioFromForm() {
  const val = id => document.getElementById(id)?.value.trim() ?? '';
  const holdings = [];

  PF_ASSET_CATEGORIES.forEach(({ key }) => {
    const tbody = document.querySelector(`[data-asset-body="${key}"]`);
    if (!tbody) return;
    [...tbody.querySelectorAll('tr')].filter(r => !r.classList.contains('pf-empty-row')).forEach((row, index) => {
      const name = row.querySelector('.pf-asset-name')?.value.trim() ?? '';
      const symbol = row.querySelector('.pf-asset-symbol')?.value.trim() ?? '';
      if (!name && !symbol) return;
      holdings.push({
        category: key,
        name,
        symbol,
        price: pfNum(row.querySelector('.pf-asset-price')?.value, 0),
        value: pfNum(row.querySelector('.pf-asset-value')?.value, 0),
        holdings: row.querySelector('.pf-asset-holdings')?.value.trim() ?? '',
        change_24h: pfNum(row.querySelector('.pf-asset-change')?.value, 0),
        is_flex: row.querySelector('.pf-asset-flex')?.checked || key === 'cash',
        sort_order: index,
      });
    });
  });

  return {
    total_invested: pfNum(val('pf-total-invested'), 0),
    holdings,
    market_snapshot: pfCollectSimpleRows(document.getElementById('pfMarketBody'), 'market', ['name', 'value', 'change']),
    alerts: pfCollectSimpleRows(document.getElementById('pfAlertsBody'), 'alert', ['title', 'date', 'type']),
    otc_trades: pfCollectSimpleRows(document.getElementById('pfOtcBody'), 'otc', ['title', 'side', 'amount', 'settlement']),
    smart_ideas: pfCollectSimpleRows(document.getElementById('pfIdeasBody'), 'idea', ['title', 'category', 'min_investment', 'description']),
    currency: {
      from: val('pf-currency-from'),
      to: val('pf-currency-to'),
      rate: val('pf-currency-rate'),
      from_amount: pfNum(val('pf-currency-from-amount'), 0),
      to_amount: pfNum(val('pf-currency-to-amount'), 0),
    },
    save_snapshot: document.getElementById('pf-save-snapshot')?.checked !== false,
  };
}

function bindPortfolioEditor() {
  const root = document.getElementById('portfolioEditor');
  if (!root || root.dataset.bound) return;
  root.dataset.bound = '1';

  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-pf-action]');
    if (!btn) return;
    e.preventDefault();
    const action = btn.dataset.pfAction;
    const category = btn.dataset.pfCategory;

    if (action === 'add-asset') {
      const tbody = document.querySelector(`[data-asset-body="${category}"]`);
      pfClearEmptyRow(tbody);
      tbody.insertAdjacentHTML('beforeend', pfAssetRow({}, category));
      return;
    }
    if (action === 'add-market') {
      const tbody = document.getElementById('pfMarketBody');
      pfClearEmptyRow(tbody);
      tbody.insertAdjacentHTML('beforeend', pfSimpleRow(['', '', ''], 'market'));
      return;
    }
    if (action === 'add-alert') {
      const tbody = document.getElementById('pfAlertsBody');
      pfClearEmptyRow(tbody);
      tbody.insertAdjacentHTML('beforeend', pfSimpleRow(['', '', ''], 'alert'));
      return;
    }
    if (action === 'add-otc') {
      const tbody = document.getElementById('pfOtcBody');
      pfClearEmptyRow(tbody);
      tbody.insertAdjacentHTML('beforeend', pfSimpleRow(['', '', '', ''], 'otc'));
      return;
    }
    if (action === 'add-idea') {
      const tbody = document.getElementById('pfIdeasBody');
      pfClearEmptyRow(tbody);
      tbody.insertAdjacentHTML('beforeend', pfSimpleRow(['', '', '', ''], 'idea'));
      return;
    }

    const row = btn.closest('tr');
    if (action === 'remove' && row) {
      const tbody = row.closest('tbody');
      row.remove();
      if (tbody && !tbody.querySelector('tr')) {
        const cols = tbody.closest('table').querySelectorAll('thead th').length;
        tbody.innerHTML = `<tr class="pf-empty-row"><td colspan="${cols}" style="color:var(--muted)">No rows yet.</td></tr>`;
      }
      return;
    }
    if ((action === 'move-up' || action === 'move-down') && row) {
      pfMoveRow(row, action === 'move-up' ? 'up' : 'down');
    }
  });
}
