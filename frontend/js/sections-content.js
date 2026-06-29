function q(section, sel) {
  return document.querySelector(`[data-section="${section}"] ${sel}`);
}

function setHtml(section, sel, html) {
  const el = q(section, sel);
  if (el && html != null) el.innerHTML = html;
}

function setText(section, sel, text) {
  const el = q(section, sel);
  if (el && text != null) el.textContent = text;
}

function applySectionContentMap(contentMap) {
  if (!contentMap) return;
  Object.entries(contentMap).forEach(([key, data]) => {
    const fn = BINDERS[key];
    if (fn) fn(data);
  });
}

const BINDERS = {
  hero(c) {
    setText('hero', '#heroBadge', c.badge ? `● ${c.badge}`.replace('● ', '') : null);
    const badge = document.getElementById('heroBadge');
    if (badge && c.badge) badge.innerHTML = `<span class="dot"></span> ${c.badge}`;
    if (c.headline) {
      const title = document.getElementById('heroTitle');
      if (title) title.innerHTML = `${c.headline} <span class="gold-line">${c.highlight || ''}</span> ${c.headline_suffix || ''}`;
    }
    setHtml('hero', '#heroSub', c.subheadline);
    const heroPortrait = document.getElementById('heroPortraitImg');
    if (heroPortrait && c.portrait_alt) heroPortrait.alt = c.portrait_alt;
    const badgeFloat = document.getElementById('heroBadgeFloat');
    if (badgeFloat && c.badge_float) badgeFloat.innerHTML = `<span class="dot"></span> ${c.badge_float}`;
    setText('hero', '.hc-title', c.card_title || c.dash_title);
    const hcLive = q('hero', '.hc-live');
    if (hcLive && (c.card_live || c.dash_note)) {
      hcLive.innerHTML = `<span class="dot"></span> ${c.card_live || 'Illustrative'}`;
    }
    setText('hero', '#heroRiskPosture', c.risk_posture);
    setText('hero', '#heroCyclePhase', c.cycle_phase);
  },
  ticker(c) {
    setText('ticker', '.ticker-label', c.label ? `● ${c.label}`.replace(/^● /, '') : null);
    const label = document.querySelector('[data-section="ticker"] .ticker-label');
    if (label && c.label) label.innerHTML = `<span class="live-dot"></span> ${c.label}`;
    setHtml('ticker', '.ticker-note', c.note);
  },
  strip(c) {
    if (!c.items?.length) return;
    const html = c.items.concat(c.items).map(item => `<span class="strip-item"><i></i>${item}</span>`).join('');
    const track = q('strip', '.strip-track');
    if (track) track.innerHTML = html;
  },
  about(c) {
    setText('about', '.eyebrow', c.eyebrow);
    setHtml('about', '.section-title', c.title_html);
    const body = document.querySelector('[data-section="about"] .about-body');
    if (!body) return;
    body.querySelectorAll('p.reveal').forEach((p, i) => { if (c.paragraphs?.[i]) p.innerHTML = c.paragraphs[i]; });
    const list = body.querySelector('.approach-list');
    if (list && c.approach_list) {
      list.innerHTML = c.approach_list.map(item =>
        `<li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>${item}</li>`
      ).join('');
    }
    const cred = body.querySelector('.cred-rows');
    if (cred && c.cred_rows) {
      cred.innerHTML = c.cred_rows.map(r => `<div class="cred-row"><span class="k">${r.k}</span><span class="v">${r.v}</span></div>`).join('');
    }
    const badges = body.querySelector('.assoc-badges');
    if (badges && c.badges) {
      badges.innerHTML = c.badges.map(b => `<span class="assoc-badge"><i></i>${b}</span>`).join('');
    }
    setText('about', '.signature', c.signature);
    setText('about', '.portrait-caption .n', c.portrait_name);
    setText('about', '.portrait-caption .t', c.portrait_title);
  },
  record(c) {
    setText('record', '.eyebrow', c.eyebrow);
    setHtml('record', '.section-title', c.title_html);
    setHtml('record', '.record-foot', c.footnote);
  },
  philosophy(c) {
    setText('philosophy', '.eyebrow', c.eyebrow);
    setHtml('philosophy', '.section-title', c.title_html);
    setHtml('philosophy', '.phil-quote', c.quote_html);
    setHtml('philosophy', '.phil-close', c.closing_html);
    const pillars = document.querySelector('[data-section="philosophy"] .pillars');
    if (pillars && c.pillars) {
      pillars.innerHTML = c.pillars.map((p, i) =>
        `<div class="pillar reveal${i ? ' reveal-d' + i : ''}"><span class="idx">${p.idx}</span><h3>${p.title}</h3><p>${p.text}</p></div>`
      ).join('');
    }
  },
  services(c) {
    setText('services', '.eyebrow', c.eyebrow);
    setHtml('services', '.section-title', c.title_html);
    setHtml('services', '.section-lead', c.lead);
    const grid = q('services', '.svc-grid');
    if (grid && c.items) {
      grid.innerHTML = c.items.map((s, i) =>
        `<div class="svc reveal${i ? ' reveal-d' + (i % 3) : ''}"><div class="svc-icon"></div><h3>${s.title}</h3><p>${s.text}</p><ul>${(s.bullets || []).map(b => `<li>${b}</li>`).join('')}</ul></div>`
      ).join('');
    }
  },
  why(c) {
    setText('why', '.eyebrow', c.eyebrow);
    setHtml('why', '.section-title', c.title_html);
    const grid = q('why', '.why-grid');
    if (grid && c.items) {
      grid.innerHTML = c.items.map((item, i) =>
        `<div class="why-item reveal${i % 2 ? ' reveal-d1' : ''}"><div class="why-num">${item.num}</div><div><h3>${item.title}</h3><p>${item.text}</p></div></div>`
      ).join('');
    }
  },
  risk(c) {
    setText('risk', '.eyebrow', c.eyebrow);
    setHtml('risk', '.section-title', c.title_html);
    setHtml('risk', '.section-lead', c.lead);
    const tbody = q('risk', '.risk-table tbody');
    if (tbody && c.table_rows) {
      tbody.innerHTML = c.table_rows.map(r => `<tr><td>${r.pillar}</td><td>${r.approach}</td><td>${r.objective}</td></tr>`).join('');
    }
    const infra = q('risk', '.infra');
    if (infra && c.chips) {
      infra.innerHTML = c.chips.map(chip => `<div class="infra-chip"><b>${chip.title}</b><span>${chip.text}</span></div>`).join('');
    }
  },
  markets(c) {
    setText('markets', '.eyebrow', c.eyebrow);
    setHtml('markets', '.section-title', c.title_html);
    setHtml('markets', '.section-lead', c.lead);
    const tags = q('markets', '.market-tags');
    if (tags && c.tags) tags.innerHTML = c.tags.map(t => `<span class="market-tag"><i></i>${t}</span>`).join('');
    setText('markets', '.geo-card h3', c.geo_title);
    const geo = q('markets', '.geo-card');
    if (geo && c.geo_rows) {
      const foot = geo.querySelector('.geo-foot');
      geo.innerHTML = `<h3>${c.geo_title || ''}</h3>${c.geo_rows.map(r => `<div class="geo-row"><span class="place">${r.place}</span><span class="scope">${r.scope}</span></div>`).join('')}<p class="geo-foot">${c.geo_foot || ''}</p>`;
    }
    setText('markets', '.instruments .eyebrow', c.instruments_eyebrow);
    setHtml('markets', '.instruments .section-title', c.instruments_title_html);
    const rows = q('markets', '.instruments .reveal-d2');
    if (rows && c.instruments) {
      rows.innerHTML = c.instruments.map(i => `<div class="instr-row"><div class="instr-name">${i.name} <small>${i.sym}</small></div><p>${i.text}</p></div>`).join('');
    }
  },
  clients(c) {
    setText('clients', '.eyebrow', c.eyebrow);
    setHtml('clients', '.section-title', c.title_html);
    setHtml('clients', '.section-lead', c.lead);
    const grid = q('clients', '.client-grid');
    if (grid && c.cards) {
      grid.innerHTML = c.cards.map((title, i) =>
        `<div class="client-card reveal${i ? ' reveal-d' + Math.min(i, 3) : ''}"><h4>${title}</h4></div>`
      ).join('');
    }
  },
  institutional(c) {
    setText('institutional', '.eyebrow', c.eyebrow);
    setHtml('institutional', '.section-title', c.title_html);
    setHtml('institutional', '.section-lead', c.lead);
    const list = q('institutional', '.inst-list');
    if (list && c.list) {
      list.innerHTML = c.list.map(item =>
        `<li><span class="mk">${item.mk}</span><div><h4>${item.title}</h4><p>${item.text}</p></div></li>`
      ).join('');
    }
    const card = q('institutional', '.mandate-card');
    if (card && c.tiers) {
      card.innerHTML = `<h3>Engagement Minimums</h3>${c.tiers.map(t =>
        `<div class="mandate-tier"><div class="amt">${t.amount}</div><div class="t">${t.title}</div><p>${t.text}</p></div>`
      ).join('')}<a href="#contact" class="btn btn-gold" data-calendly>${c.cta || 'Discuss a Mandate'}</a><p style="font-size:11px;color:var(--grey-2);margin-top:18px;line-height:1.7">${c.disclaimer || ''}</p>`;
    }
  },
  calculator(c) {
    setText('calculator', '.eyebrow', c.eyebrow);
    setHtml('calculator', '.section-title', c.title_html);
    setHtml('calculator', '.section-lead', c.lead);
    setHtml('calculator', '.calc-disclaimer', c.disclaimer);
  },
  insights(c) {
    setText('insights', '.eyebrow', c.eyebrow);
    setHtml('insights', '.section-title', c.title_html);
    setHtml('insights', '.section-lead', c.lead);
  },
  process(c) {
    setText('process', '.eyebrow', c.eyebrow);
    setHtml('process', '.section-title', c.title_html);
    const steps = q('process', '.steps');
    if (steps && c.steps) {
      steps.innerHTML = c.steps.map((s, i) =>
        `<div class="step reveal${i ? ' reveal-d' + i : ''}"><div class="step-dot">${s.num}</div><h4>${s.title}</h4><p>${s.text}</p></div>`
      ).join('');
    }
  },
  contact(c) {
    setText('contact', '.eyebrow', c.eyebrow);
    setHtml('contact', '.section-title', c.title_html);
    setHtml('contact', '.contact-lead', c.lead);
    setText('contact', '.contact-form h3', c.form_title);
    setHtml('contact', '.form-sub', c.form_sub);
    setHtml('contact', '.form-note', c.form_note);
  },
  'investor-portal'(c) {
    setText('investor-portal', '.eyebrow', c.eyebrow);
    setHtml('investor-portal', '.section-title', c.title_html);
    setHtml('investor-portal', '.section-lead', c.lead);
    setHtml('investor-portal', '.investor-portal-note', c.note);
    const reg = document.getElementById('investorRegisterBtn');
    const login = document.getElementById('investorLoginBtn');
    if (reg) {
      if (c.register_label) reg.textContent = c.register_label;
      if (c.register_url) reg.href = c.register_url;
    }
    if (login) {
      if (c.login_label) login.textContent = c.login_label;
      if (c.login_url) login.href = c.login_url;
    }
  },
};

window.applySectionContentMap = applySectionContentMap;
