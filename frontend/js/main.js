document.addEventListener('site:ready', () => {
  initUI();
});

function initCounters() {
  const counterIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.count;
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const dur = 1600;
      const t0 = performance.now();
      const tick = now => {
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = prefix + Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counterIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(el => counterIO.observe(el));
}

function initReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

function initUI() {
  const contact = window.SITE_CONFIG?.contact || {};

  const header = document.getElementById('siteHeader');
  const toTop = document.getElementById('toTop');
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 40);
    toTop.classList.toggle('show', y > 700);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');
  const toggleMenu = open => {
    burger.classList.toggle('open', open);
    mobileMenu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => toggleMenu(!mobileMenu.classList.contains('open')));
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));

  initReveal();
  initCounters();

  const form = document.getElementById('contactForm');
  const statusBox = document.getElementById('formStatus');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    statusBox.className = 'form-status';
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.textContent = 'Sending…';
    btn.disabled = true;

    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/contact/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        form.reset();
        statusBox.textContent = data.message;
        statusBox.classList.add('ok');
      } else {
        throw new Error(data.error || 'Request failed');
      }
    } catch (err) {
      const d = new FormData(form);
      const body = encodeURIComponent(
        `Name: ${d.get('name')}\nEmail: ${d.get('email')}\nPhone: ${d.get('phone') || '-'}\nProfile: ${d.get('investor_profile')}\nInterest: ${d.get('interest') || '-'}\n\nObjectives:\n${d.get('message')}`
      );
      window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent('Investment Review Request — ' + d.get('name'))}&body=${body}`;
      statusBox.textContent = 'Your email client has been opened with your enquiry pre-filled.';
      statusBox.classList.add('ok');
    }

    btn.textContent = original;
    btn.disabled = false;
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  initTicker();
  initCalculator();
}

const TICKER_COINS = [
  { id: 'bitcoin', sym: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', sym: 'ETH', name: 'Ethereum' },
  { id: 'solana', sym: 'SOL', name: 'Solana' },
  { id: 'binancecoin', sym: 'BNB', name: 'BNB' },
  { id: 'zcash', sym: 'ZEC', name: 'Zcash' }
];

function initTicker() {
  const tickerTrack = document.getElementById('tickerTrack');
  const fmtPrice = v => v >= 1000
    ? '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  async function refreshTicker() {
    try {
      const ids = TICKER_COINS.map(c => c.id).join(',');
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const ticks = TICKER_COINS.map(c => {
        const d = data[c.id];
        if (!d) return '';
        const chg = d.usd_24h_change ?? 0;
        const cls = chg >= 0 ? 'up' : 'down';
        const sign = chg >= 0 ? '▲' : '▼';
        return `<div class="tick"><span class="sym">${c.sym}<small>${c.name}</small></span><span class="price">${fmtPrice(d.usd)}</span><span class="chg ${cls}">${sign} ${Math.abs(chg).toFixed(2)}%</span></div>`;
      }).join('');
      if (ticks) tickerTrack.innerHTML = ticks + ticks;
    } catch {
      /* keep previous values on failure */
    }
  }

  refreshTicker();
  setInterval(refreshTicker, 60000);
}

function initCalculator() {
  const $ = id => document.getElementById(id);
  const inInitial = $('c-initial');
  const inMonthly = $('c-monthly');
  const inYears = $('c-years');
  const inRate = $('c-rate');
  if (!inInitial) return;

  const scens = document.querySelectorAll('.scen');
  const SCEN_NAMES = { 8: 'Conservative', 15: 'Balanced', 25: 'Growth' };
  const money = v => '$' + Math.round(v).toLocaleString('en-US');

  function setFill(input) {
    const min = +input.min;
    const max = +input.max;
    const v = +input.value;
    input.style.setProperty('--fill', ((v - min) / (max - min) * 100) + '%');
  }

  function compute() {
    const initial = +inInitial.value;
    const monthly = +inMonthly.value;
    const years = +inYears.value;
    const rate = +inRate.value / 100;
    const mRate = Math.pow(1 + rate, 1 / 12) - 1;
    let value = initial;
    let contributed = initial;
    const yearly = [{ y: 0, c: contributed, v: value }];
    for (let m = 1; m <= years * 12; m++) {
      value = value * (1 + mRate) + monthly;
      contributed += monthly;
      if (m % 12 === 0) yearly.push({ y: m / 12, c: contributed, v: value });
    }
    return { initial, monthly, years, rate, value, contributed, yearly };
  }

  function drawChart(yearly) {
    const svg = $('calcChart');
    const W = 520;
    const H = 220;
    const padL = 10;
    const padR = 10;
    const padT = 14;
    const padB = 16;
    const maxV = Math.max(...yearly.map(p => p.v)) || 1;
    const px = i => padL + (i / (yearly.length - 1)) * (W - padL - padR);
    const py = v => H - padB - (v / maxV) * (H - padT - padB);
    const linePts = yearly.map((p, i) => `${px(i).toFixed(1)},${py(p.v).toFixed(1)}`).join(' ');
    const contribPts = yearly.map((p, i) => `${px(i).toFixed(1)},${py(p.c).toFixed(1)}`).join(' ');
    const first = `${px(0).toFixed(1)},${py(yearly[0].v).toFixed(1)}`;
    const last = yearly.length - 1;
    svg.innerHTML = `
      <defs><linearGradient id="calcFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#C9A14B" stop-opacity=".25"/><stop offset="100%" stop-color="#C9A14B" stop-opacity="0"/>
      </linearGradient></defs>
      <line x1="0" y1="${(H - padB).toFixed(1)}" x2="${W}" y2="${(H - padB).toFixed(1)}" stroke="rgba(255,255,255,.08)"/>
      <polygon points="${first.split(',')[0]},${H - padB} ${linePts} ${px(last).toFixed(1)},${H - padB}" fill="url(#calcFill)"/>
      <polyline points="${contribPts}" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1.4" stroke-dasharray="5 5"/>
      <polyline points="${linePts}" fill="none" stroke="#C9A14B" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="${px(last).toFixed(1)}" cy="${py(yearly[last].v).toFixed(1)}" r="4" fill="#E2C275"/>`;
  }

  function render() {
    [inInitial, inMonthly, inYears, inRate].forEach(setFill);
    const r = compute();
    $('o-initial').textContent = money(r.initial);
    $('o-monthly').textContent = money(r.monthly);
    $('o-years').textContent = r.years + (r.years === 1 ? ' yr' : ' yrs');
    $('o-rate').textContent = Math.round(r.rate * 100) + '%';
    const name = SCEN_NAMES[Math.round(r.rate * 100)] || 'Custom';
    $('calcScenario').textContent = `${name} · ${Math.round(r.rate * 100)}% p.a.`;
    scens.forEach(b => b.classList.toggle('active', +b.dataset.rate === Math.round(r.rate * 100)));
    $('r-final').textContent = money(r.value);
    $('r-contrib').textContent = money(r.contributed);
    $('r-growth').textContent = money(r.value - r.contributed);
    drawChart(r.yearly);
    const tbody = $('calcTable').querySelector('tbody');
    const rows = r.yearly.slice(1);
    const step = Math.ceil(rows.length / 8);
    tbody.innerHTML = rows
      .filter((p, i) => i % step === 0 || p.y === r.years)
      .map(p => `<tr><td>Year ${p.y}</td><td>${money(p.c)}</td><td class="gold">${money(p.v)}</td></tr>`)
      .join('');
  }

  scens.forEach(b => b.addEventListener('click', () => { inRate.value = b.dataset.rate; render(); }));
  [inInitial, inMonthly, inYears, inRate].forEach(el => el.addEventListener('input', render));
  render();
}
