window.TFMarkets = (function () {
  'use strict';

  const BINANCE_WS = 'wss://stream.binance.com:9443/stream';
  let items = [];
  let live = {};
  let ws = null;
  let reconnectTimer = null;

  function formatPrice(value, symbol) {
    const n = Number(value);
    if (Number.isNaN(n)) return value || '—';
    const isCrypto = symbol || n < 10000 && String(value).includes('.');
    if (isCrypto && n >= 1000) return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (isCrypto) return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function formatChangePct(value) {
    const n = Number(value);
    if (Number.isNaN(n)) return '—';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }

  function changeClass(value) {
    const n = Number(value);
    if (Number.isNaN(n) || n === 0) return '';
    return n > 0 ? 'up' : 'down';
  }

  function esc(text) {
    return String(text ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
  }

  function itemKey(item, index) {
    return (item.binance_symbol || `static-${index}`).toLowerCase();
  }

  function resolvedItem(item, index) {
    const key = itemKey(item, index);
    const tick = live[key];
    if (tick) {
      return {
        ...item,
        value: formatPrice(tick.price, item.binance_symbol),
        change: tick.change,
        low: tick.low,
        high: tick.high,
        live: true,
      };
    }
    return {
      ...item,
      value: item.value || '—',
      change: item.change ?? 0,
      live: false,
    };
  }

  function miniCardHtml(item, index) {
    const data = resolvedItem(item, index);
    const cls = changeClass(data.change);
    return `<div class="market-mini-card" data-market-key="${esc(itemKey(item, index))}">
      <div class="market-mini-name">${esc(data.name)}${data.live ? ' <span class="live-dot" title="Live"></span>' : ''}</div>
      <div class="market-mini-price" data-market-price>${esc(data.value)}</div>
      <div class="market-mini-chg ${cls}" data-market-change>${formatChangePct(data.change)}</div>
    </div>`;
  }

  function fullCardHtml(item, index) {
    const data = resolvedItem(item, index);
    const cls = changeClass(data.change);
    const arrow = Number(data.change) >= 0 ? '▲' : '▼';
    const low = data.low != null ? formatPrice(data.low, item.binance_symbol) : '—';
    const high = data.high != null ? formatPrice(data.high, item.binance_symbol) : '—';
    return `<div class="market-full-card" data-market-key="${esc(itemKey(item, index))}">
      <div class="mf-name">${esc(data.name)}${data.live ? ' <span class="live-dot" title="Live via Binance"></span>' : ''}</div>
      <div class="mf-price" data-market-price>${esc(data.value)}</div>
      <div class="mf-change ${cls}" data-market-change>${arrow} ${formatChangePct(data.change)} today</div>
      <div class="mf-range" data-market-range><span>L: ${esc(low)}</span><span>H: ${esc(high)}</span></div>
    </div>`;
  }

  function screenerRowHtml(item, index) {
    const data = resolvedItem(item, index);
    const cls = Number(data.change) >= 0 ? 'change-positive' : 'change-negative';
    const initial = esc((item.name || '?').charAt(0));
    return `<tr data-market-key="${esc(itemKey(item, index))}">
      <td><div class="asset-name-col"><div class="asset-icon" style="background:var(--bg);color:var(--navy3)">${initial}</div><span class="asset-ticker">${esc(item.name)}</span></div></td>
      <td class="price-val" data-market-price>${esc(data.value)}</td>
      <td class="${cls}" data-market-change>${formatChangePct(data.change)}</td>
      <td style="color:var(--text3)">—</td>
      <td style="color:var(--text3)">—</td>
      <td style="color:var(--text3)">—</td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text2)">${data.live ? 'Live' : 'Manual'}</td>
    </tr>`;
  }

  function renderMini() {
    const grid = document.getElementById('marketMiniGrid');
    if (!grid) return;
    grid.innerHTML = items.length
      ? items.map((item, i) => miniCardHtml(item, i)).join('')
      : '<div style="color:var(--text3);font-size:13px">No markets configured. Your advisor can add them in the admin dashboard.</div>';
  }

  function renderFullPage() {
    const grid = document.getElementById('marketsFullGrid');
    const body = document.getElementById('marketsScreenerBody');
    if (grid) {
      grid.innerHTML = items.length
        ? items.map((item, i) => fullCardHtml(item, i)).join('')
        : '<div style="color:var(--text3);padding:20px">No markets configured yet.</div>';
    }
    if (body) {
      body.innerHTML = items.length
        ? items.map((item, i) => screenerRowHtml(item, i)).join('')
        : '<tr><td colspan="7" style="color:var(--text3);padding:16px 0">No markets configured yet.</td></tr>';
    }
  }

  function patchDom() {
    items.forEach((item, index) => {
      const key = itemKey(item, index);
      const data = resolvedItem(item, index);
      document.querySelectorAll(`[data-market-key="${key}"]`).forEach(node => {
        const priceEl = node.querySelector('[data-market-price]');
        const changeEl = node.querySelector('[data-market-change]');
        const rangeEl = node.querySelector('[data-market-range]');
        if (priceEl) priceEl.textContent = data.value;
        if (changeEl) {
          const cls = changeClass(data.change);
          const arrow = Number(data.change) >= 0 ? '▲' : '▼';
          if (node.classList.contains('market-full-card')) {
            changeEl.className = `mf-change ${cls}`;
            changeEl.textContent = `${arrow} ${formatChangePct(data.change)} today`;
          } else if (node.classList.contains('market-mini-card')) {
            changeEl.className = `market-mini-chg ${cls}`;
            changeEl.textContent = formatChangePct(data.change);
          } else {
            changeEl.className = Number(data.change) >= 0 ? 'change-positive' : 'change-negative';
            changeEl.textContent = formatChangePct(data.change);
          }
        }
        if (rangeEl && data.low != null && data.high != null) {
          rangeEl.innerHTML = `<span>L: ${esc(formatPrice(data.low, item.binance_symbol))}</span><span>H: ${esc(formatPrice(data.high, item.binance_symbol))}</span>`;
        }
      });
    });
  }

  function binanceStreams() {
    return items
      .map(item => (item.binance_symbol || '').toLowerCase().trim())
      .filter(Boolean)
      .map(symbol => `${symbol}@miniTicker`);
  }

  function connect() {
    disconnect(false);
    const streams = binanceStreams();
    if (!streams.length) return;

    const url = `${BINANCE_WS}?streams=${streams.join('/')}`;
    ws = new WebSocket(url);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const tick = payload.data || payload;
        const symbol = String(tick.s || '').toLowerCase();
        if (!symbol) return;
        live[symbol] = {
          price: tick.c,
          change: tick.P,
          low: tick.l,
          high: tick.h,
        };
        patchDom();
      } catch {
        /* ignore malformed ticks */
      }
    };

    ws.onclose = () => {
      if (!items.some(item => item.binance_symbol)) return;
      reconnectTimer = window.setTimeout(connect, 5000);
    };
  }

  function disconnect(clearItems = true) {
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
    if (clearItems) {
      items = [];
      live = {};
    }
  }

  function load(marketSnapshot) {
    items = Array.isArray(marketSnapshot) ? marketSnapshot : [];
    live = {};
    renderMini();
    renderFullPage();
    connect();
  }

  function showPage() {
    renderFullPage();
    patchDom();
  }

  return { load, showPage, disconnect, renderMini, renderFullPage };
})();
