window.TFBinanceLive = (function () {
  'use strict';

  const BINANCE_WS = 'wss://stream.binance.com:9443/stream';

  const COINS = [
    { sym: 'BTC', name: 'Bitcoin', pair: 'btcusdt' },
    { sym: 'ETH', name: 'Ethereum', pair: 'ethusdt' },
    { sym: 'BNB', name: 'BNB', pair: 'bnbusdt' },
    { sym: 'SOL', name: 'Solana', pair: 'solusdt' },
    { sym: 'XRP', name: 'XRP', pair: 'xrpusdt' },
    { sym: 'DOGE', name: 'Dogecoin', pair: 'dogeusdt' },
    { sym: 'ADA', name: 'Cardano', pair: 'adausdt' },
    { sym: 'AVAX', name: 'Avalanche', pair: 'avaxusdt' },
  ];

  let live = {};
  let ws = null;
  let reconnectTimer = null;
  const listeners = new Set();

  function fmtPrice(value) {
    const n = Number(value);
    if (Number.isNaN(n)) return '—';
    if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (n >= 1) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  }

  function fmtChange(value) {
    const n = Number(value);
    if (Number.isNaN(n)) return '—';
    const sign = n >= 0 ? '+' : '';
    return sign + n.toFixed(2) + '%';
  }

  function changeClass(value) {
    const n = Number(value);
    if (Number.isNaN(n) || n === 0) return 'flat';
    return n > 0 ? 'up' : 'down';
  }

  function notify() {
    listeners.forEach(fn => fn(live, COINS));
  }

  function connect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }

    const streams = COINS.map(c => `${c.pair}@miniTicker`).join('/');
    ws = new WebSocket(`${BINANCE_WS}?streams=${streams}`);

    ws.onmessage = event => {
      try {
        const payload = JSON.parse(event.data);
        const tick = payload.data || payload;
        const pair = String(tick.s || '').toLowerCase();
        if (!pair) return;
        live[pair] = {
          price: tick.c,
          change: tick.P,
          high: tick.h,
          low: tick.l,
        };
        notify();
      } catch {
        /* ignore malformed ticks */
      }
    };

    ws.onclose = () => {
      reconnectTimer = setTimeout(connect, 5000);
    };
  }

  function subscribe(fn) {
    listeners.add(fn);
    fn(live, COINS);
    if (!ws) connect();
    return () => listeners.delete(fn);
  }

  function initLiveTable() {
    const tbody = document.getElementById('liveMarketsBody');
    if (!tbody) return;

    function rowHtml(coin, tick) {
      const chg = tick ? Number(tick.change) : null;
      const cls = changeClass(chg ?? 0);
      const arrow = chg == null ? '' : chg >= 0 ? '▲ ' : '▼ ';
      return `<tr data-pair="${coin.pair}">
        <td><div class="lm-asset"><span class="lm-sym">${coin.sym}</span><span class="lm-name">${coin.name}</span></div></td>
        <td class="lm-price" data-lm-price>${tick ? fmtPrice(tick.price) : '—'}</td>
        <td class="lm-change ${cls}" data-lm-change>${tick ? arrow + fmtChange(tick.change) : '…'}</td>
        <td class="lm-muted" data-lm-high>${tick ? fmtPrice(tick.high) : '—'}</td>
        <td class="lm-muted" data-lm-low>${tick ? fmtPrice(tick.low) : '—'}</td>
        <td class="lm-feed">${tick ? '<span class="lm-live"><span class="live-dot"></span> Live</span>' : 'Connecting…'}</td>
      </tr>`;
    }

    function renderAll(currentLive) {
      tbody.innerHTML = COINS.map(coin => rowHtml(coin, currentLive[coin.pair])).join('');
    }

    function patchRow(coin, tick) {
      if (!tick) return;
      const row = tbody.querySelector(`tr[data-pair="${coin.pair}"]`);
      if (!row) return;
      const chg = Number(tick.change);
      const cls = changeClass(chg);
      const arrow = chg >= 0 ? '▲ ' : '▼ ';
      const priceEl = row.querySelector('[data-lm-price]');
      const changeEl = row.querySelector('[data-lm-change]');
      const highEl = row.querySelector('[data-lm-high]');
      const lowEl = row.querySelector('[data-lm-low]');
      const feedEl = row.querySelector('.lm-feed');
      if (priceEl) priceEl.textContent = fmtPrice(tick.price);
      if (changeEl) {
        changeEl.className = `lm-change ${cls}`;
        changeEl.textContent = arrow + fmtChange(tick.change);
      }
      if (highEl) highEl.textContent = fmtPrice(tick.high);
      if (lowEl) lowEl.textContent = fmtPrice(tick.low);
      if (feedEl) feedEl.innerHTML = '<span class="lm-live"><span class="live-dot"></span> Live</span>';
    }

    let rendered = false;
    subscribe(currentLive => {
      if (!rendered) {
        renderAll(currentLive);
        rendered = true;
        return;
      }
      COINS.forEach(coin => patchRow(coin, currentLive[coin.pair]));
    });
  }

  return {
    COINS,
    subscribe,
    fmtPrice,
    fmtChange,
    changeClass,
    initLiveTable,
  };
})();
