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

function pfCsv(values) {
  return (values || []).join(', ');
}

function pfParseCsv(text, asNumber = false) {
  return String(text || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
    .map(v => (asNumber ? pfNum(v, 0) : v));
}

function pfField(label, id, value, type = 'text') {
  return `<div class="field"><label>${label}</label><input class="table-input" id="${id}" type="${type}" value="${escapeAttr(value ?? '')}"></div>`;
}

function pfAllocationRow(item = {}) {
  return `<tr>
    <td><input class="table-input pf-alloc-name" value="${escapeAttr(item.name || '')}" placeholder="Equities"></td>
    <td><input class="table-input pf-alloc-pct" type="number" step="0.1" value="${item.pct ?? ''}" placeholder="40"></td>
    <td><input class="table-input pf-alloc-color" type="color" value="${escapeAttr(item.color || '#7c3aed')}"></td>
    <td>${pfRowActions('allocation')}</td>
  </tr>`;
}

function pfAssetRow(item = {}) {
  return `<tr>
    <td><input class="table-input pf-asset-name" value="${escapeAttr(item.name || '')}" placeholder="Bitcoin"></td>
    <td><input class="table-input pf-asset-symbol" value="${escapeAttr(item.symbol || '')}" placeholder="BTC"></td>
    <td><input class="table-input pf-asset-price" type="number" step="0.01" value="${item.price ?? ''}"></td>
    <td><input class="table-input pf-asset-value" type="number" step="1" value="${item.value ?? ''}"></td>
    <td><input class="table-input pf-asset-holdings" value="${escapeAttr(item.holdings || '')}" placeholder="12.5 BTC"></td>
    <td><input class="table-input pf-asset-allocation" type="number" step="0.1" value="${item.allocation ?? ''}"></td>
    <td><input class="table-input pf-asset-change" type="number" step="0.01" value="${item.change_24h ?? ''}"></td>
    <td>${pfRowActions('asset')}</td>
  </tr>`;
}

function pfSimpleRow(cells, scope, placeholders = []) {
  return `<tr>${cells.map((val, i) =>
    `<td><input class="table-input pf-${scope}-cell" data-col="${i}" value="${escapeAttr(val ?? '')}" placeholder="${escapeAttr(placeholders[i] || '')}"></td>`
  ).join('')}<td>${pfRowActions(scope)}</td></tr>`;
}

function pfAssetSection(key, label, assets) {
  const rows = assets?.length ? assets.map(pfAssetRow).join('') : '';
  return `<details class="expand-row pf-asset-group" data-asset-key="${key}">
    <summary><span>${label}</span><span class="expand-meta">${(assets || []).length} holdings</span></summary>
    <div class="expand-body">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Symbol</th><th>Price</th><th>Value</th><th>Holdings</th><th>Alloc %</th><th>24h %</th><th></th></tr></thead>
          <tbody data-asset-body="${key}">${rows || '<tr class="pf-empty-row"><td colspan="8" style="color:var(--muted)">No holdings yet.</td></tr>'}</tbody>
        </table>
      </div>
      <button type="button" class="btn btn-ghost btn-sm" data-pf-action="add-asset" data-pf-category="${key}">Add ${label.toLowerCase()} holding</button>
    </div>
  </details>`;
}

function renderPortfolioEditor(portfolio = {}) {
  const p = portfolio || {};
  const perf = p.performance || {};
  const currency = p.currency || {};
  return `
    <div id="portfolioEditor" class="stack-sections" style="margin-top:18px">
      <div class="card" style="margin:0">
        <h4 style="margin:0 0 14px;color:var(--text)">Portfolio summary</h4>
        <div class="grid-2">
          ${pfField('Net worth', 'pf-net-worth', p.net_worth)}
          ${pfField('Total invested', 'pf-total-invested', p.total_invested)}
          ${pfField('Total returns', 'pf-total-returns', p.total_returns)}
          ${pfField('AUM', 'pf-aum', p.aum)}
          ${pfField('YTD return', 'pf-ytd-return', p.ytd_return)}
          ${pfField('Investments count', 'pf-investments-count', p.investments_count, 'number')}
          ${pfField('Asset classes', 'pf-asset-classes', p.asset_classes, 'number')}
          ${pfField('Allocation center label', 'pf-allocation-center', p.allocation_center)}
          ${pfField('Net worth change', 'pf-net-worth-change', p.net_worth_change)}
          ${pfField('Net worth change %', 'pf-net-worth-change-pct', p.net_worth_change_pct)}
          ${pfField('Invested change', 'pf-total-invested-change', p.total_invested_change)}
          ${pfField('Invested change %', 'pf-total-invested-change-pct', p.total_invested_change_pct)}
          ${pfField('Returns change', 'pf-total-returns-change', p.total_returns_change)}
          ${pfField('Returns change %', 'pf-total-returns-change-pct', p.total_returns_change_pct)}
        </div>
      </div>

      <details class="expand-row" open>
        <summary><span>Asset allocation</span><span class="expand-meta">${(p.allocation || []).length} slices</span></summary>
        <div class="expand-body">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>%</th><th>Color</th><th></th></tr></thead>
              <tbody id="pfAllocationBody">${(p.allocation || []).length
                ? p.allocation.map(pfAllocationRow).join('')
                : '<tr class="pf-empty-row"><td colspan="4" style="color:var(--muted)">No allocation slices yet.</td></tr>'}</tbody>
            </table>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" data-pf-action="add-allocation">Add allocation slice</button>
        </div>
      </details>

      <details class="expand-row">
        <summary><span>Performance chart</span></summary>
        <div class="expand-body grid-2">
          ${pfField('Total returns label', 'pf-perf-returns', perf.total_returns || p.total_returns)}
          ${pfField('YTD %', 'pf-perf-ytd', perf.ytd_pct || p.ytd_return)}
          <div class="field" style="grid-column:1/-1"><label>Chart labels (comma-separated)</label><input class="table-input" id="pf-perf-labels" value="${escapeAttr(pfCsv(perf.labels))}" placeholder="Jan, Feb, Mar, Apr, May, Jun"></div>
          <div class="field" style="grid-column:1/-1"><label>Chart values (comma-separated)</label><input class="table-input" id="pf-perf-values" value="${escapeAttr(pfCsv(perf.values))}" placeholder="620000, 640000, 655000"></div>
          <div class="field" style="grid-column:1/-1"><label>Net worth sparkline (comma-separated)</label><input class="table-input" id="pf-spark-net-worth" value="${escapeAttr(pfCsv(p.sparklines?.net_worth))}"></div>
        </div>
      </details>

      <details class="expand-row">
        <summary><span>Holdings by asset class</span></summary>
        <div class="expand-body expand-list">
          ${PF_ASSET_CATEGORIES.map(({ key, label }) => pfAssetSection(key, label, p.assets?.[key])).join('')}
        </div>
      </details>

      <details class="expand-row">
        <summary><span>Market snapshot</span><span class="expand-meta">${(p.market_snapshot || []).length} markets</span></summary>
        <div class="expand-body">
          <div class="table-wrap"><table><thead><tr><th>Name</th><th>Value</th><th>Change %</th><th></th></tr></thead>
          <tbody id="pfMarketBody">${(p.market_snapshot || []).map(item => pfSimpleRow([item.name, item.value, item.change], 'market', ['S&P 500', '5,284', '0.42'])).join('') || '<tr class="pf-empty-row"><td colspan="4" style="color:var(--muted)">No markets yet.</td></tr>'}</tbody></table></div>
          <button type="button" class="btn btn-ghost btn-sm" data-pf-action="add-market">Add market</button>
        </div>
      </details>

      <details class="expand-row">
        <summary><span>Alerts</span><span class="expand-meta">${(p.alerts || []).length} alerts</span></summary>
        <div class="expand-body">
          <div class="table-wrap"><table><thead><tr><th>Title</th><th>Date</th><th>Type</th><th></th></tr></thead>
          <tbody id="pfAlertsBody">${(p.alerts || []).map(item => pfSimpleRow([item.title, item.date, item.type], 'alert', ['Portfolio review', 'Today', 'info'])).join('') || '<tr class="pf-empty-row"><td colspan="4" style="color:var(--muted)">No alerts yet.</td></tr>'}</tbody></table></div>
          <button type="button" class="btn btn-ghost btn-sm" data-pf-action="add-alert">Add alert</button>
        </div>
      </details>

      <details class="expand-row">
        <summary><span>OTC trades</span><span class="expand-meta">${(p.otc_trades || []).length} trades</span></summary>
        <div class="expand-body">
          <div class="table-wrap"><table><thead><tr><th>Title</th><th>Side</th><th>Amount</th><th>Settlement</th><th></th></tr></thead>
          <tbody id="pfOtcBody">${(p.otc_trades || []).map(item => pfSimpleRow([item.title, item.side, item.amount, item.settlement], 'otc', ['Block trade', 'Buy', '$450,000', 'May 18'])).join('') || '<tr class="pf-empty-row"><td colspan="5" style="color:var(--muted)">No trades yet.</td></tr>'}</tbody></table></div>
          <button type="button" class="btn btn-ghost btn-sm" data-pf-action="add-otc">Add trade</button>
        </div>
      </details>

      <details class="expand-row">
        <summary><span>Smart ideas</span><span class="expand-meta">${(p.smart_ideas || []).length} ideas</span></summary>
        <div class="expand-body">
          <div class="table-wrap"><table><thead><tr><th>Title</th><th>Category</th><th>Min investment</th><th>Description</th><th></th></tr></thead>
          <tbody id="pfIdeasBody">${(p.smart_ideas || []).map(item => pfSimpleRow([item.title, item.category, item.min_investment, item.description], 'idea', ['AI Leaders', 'Equity', '$50,000', 'Short summary'])).join('') || '<tr class="pf-empty-row"><td colspan="5" style="color:var(--muted)">No ideas yet.</td></tr>'}</tbody></table></div>
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

function collectPortfolioFromForm(original = {}) {
  const val = id => document.getElementById(id)?.value.trim() ?? '';
  const portfolio = { ...original };

  portfolio.net_worth = val('pf-net-worth');
  portfolio.total_invested = val('pf-total-invested');
  portfolio.total_returns = val('pf-total-returns');
  portfolio.aum = val('pf-aum') || val('pf-net-worth');
  portfolio.ytd_return = val('pf-ytd-return');
  portfolio.investments_count = pfNum(val('pf-investments-count'), 0);
  portfolio.asset_classes = pfNum(val('pf-asset-classes'), 0);
  portfolio.allocation_center = val('pf-allocation-center');
  portfolio.net_worth_change = val('pf-net-worth-change');
  portfolio.net_worth_change_pct = val('pf-net-worth-change-pct');
  portfolio.total_invested_change = val('pf-total-invested-change');
  portfolio.total_invested_change_pct = val('pf-total-invested-change-pct');
  portfolio.total_returns_change = val('pf-total-returns-change');
  portfolio.total_returns_change_pct = val('pf-total-returns-change-pct');

  portfolio.allocation = [...document.querySelectorAll('#pfAllocationBody tr')].filter(r => !r.classList.contains('pf-empty-row')).map(row => ({
    name: row.querySelector('.pf-alloc-name').value.trim(),
    pct: pfNum(row.querySelector('.pf-alloc-pct').value, 0),
    color: row.querySelector('.pf-alloc-color').value,
  })).filter(item => item.name || item.pct);

  portfolio.performance = {
    ...(original.performance || {}),
    total_returns: val('pf-perf-returns'),
    ytd_pct: val('pf-perf-ytd'),
    labels: pfParseCsv(val('pf-perf-labels')),
    values: pfParseCsv(val('pf-perf-values'), true),
  };

  const spark = pfParseCsv(val('pf-spark-net-worth'), true);
  portfolio.sparklines = spark.length ? { ...(original.sparklines || {}), net_worth: spark } : (original.sparklines || {});

  portfolio.assets = {};
  PF_ASSET_CATEGORIES.forEach(({ key }) => {
    const tbody = document.querySelector(`[data-asset-body="${key}"]`);
    portfolio.assets[key] = tbody
      ? [...tbody.querySelectorAll('tr')].filter(r => !r.classList.contains('pf-empty-row')).map(row => ({
        name: row.querySelector('.pf-asset-name').value.trim(),
        symbol: row.querySelector('.pf-asset-symbol').value.trim(),
        price: pfNum(row.querySelector('.pf-asset-price').value, 0),
        value: pfNum(row.querySelector('.pf-asset-value').value, 0),
        holdings: row.querySelector('.pf-asset-holdings').value.trim(),
        allocation: pfNum(row.querySelector('.pf-asset-allocation').value, 0),
        change_24h: pfNum(row.querySelector('.pf-asset-change').value, 0),
      })).filter(item => item.name || item.symbol)
      : (original.assets?.[key] || []);
  });

  portfolio.market_snapshot = pfCollectSimpleRows(document.getElementById('pfMarketBody'), 'market', ['name', 'value', 'change']);
  portfolio.alerts = pfCollectSimpleRows(document.getElementById('pfAlertsBody'), 'alert', ['title', 'date', 'type']);
  portfolio.otc_trades = pfCollectSimpleRows(document.getElementById('pfOtcBody'), 'otc', ['title', 'side', 'amount', 'settlement']);
  portfolio.smart_ideas = pfCollectSimpleRows(document.getElementById('pfIdeasBody'), 'idea', ['title', 'category', 'min_investment', 'description']);

  portfolio.currency = {
    ...(original.currency || {}),
    from: val('pf-currency-from'),
    to: val('pf-currency-to'),
    rate: val('pf-currency-rate'),
    from_amount: pfNum(val('pf-currency-from-amount'), 0),
    to_amount: pfNum(val('pf-currency-to-amount'), 0),
  };

  return portfolio;
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
    const scope = btn.dataset.pfScope;
    const category = btn.dataset.pfCategory;

    if (action === 'add-allocation') {
      const tbody = document.getElementById('pfAllocationBody');
      pfClearEmptyRow(tbody);
      tbody.insertAdjacentHTML('beforeend', pfAllocationRow());
      return;
    }
    if (action === 'add-asset') {
      const tbody = document.querySelector(`[data-asset-body="${category}"]`);
      pfClearEmptyRow(tbody);
      tbody.insertAdjacentHTML('beforeend', pfAssetRow());
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
