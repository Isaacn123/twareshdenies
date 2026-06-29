const API_BASE = '';

const FALLBACK = {
  contact: {
    email: 'contact@twareshdenis.com',
    phone: '+256700000000',
    calendly: '',
    waMessage: 'Hello Twaresh, I would like to discuss a portfolio consultation.'
  },
  socials: [
    { key: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/twaresh-denis', enabled: true, show_in_contact: true },
    { key: 'twitter', label: 'X (Twitter)', url: 'https://x.com/twareshdenis', enabled: true, show_in_contact: false },
    { key: 'instagram', label: 'Instagram', url: '', enabled: false, show_in_contact: false },
    { key: 'facebook', label: 'Facebook', url: '', enabled: false, show_in_contact: false },
    { key: 'youtube', label: 'YouTube', url: '', enabled: false, show_in_contact: false },
    { key: 'tiktok', label: 'TikTok', url: '', enabled: false, show_in_contact: false },
    { key: 'telegram', label: 'Telegram', url: '', enabled: false, show_in_contact: false },
    { key: 'github', label: 'GitHub', url: '', enabled: false, show_in_contact: false },
  ],
  navigation: {
    header: [
      { label: 'About', href: '#about' },
      { label: 'Philosophy', href: '#philosophy' },
      { label: 'Services', href: '#services' },
      { label: 'Markets', href: '#markets' },
      { label: 'Calculator', href: '#calculator' },
      { label: 'Insights', href: '#insights' },
      { label: 'Contact', href: '#contact' },
      { label: 'Client Portal', href: '#investor-portal' },
      { label: 'Client Sign In', href: '/investor/login' },
      { label: 'Become an Investor', href: '/investor/register', style: 'ghost', li_class: 'nav-cta nav-cta-portal' },
      { label: 'Schedule a Consultation', href: '#contact', style: 'gold', calendly: true, li_class: 'nav-cta' },
    ],
    footer_columns: [
      { title: 'Navigate', links: [
        { label: 'About', href: '#about' }, { label: 'Philosophy', href: '#philosophy' },
        { label: 'Services', href: '#services' }, { label: 'Markets', href: '#markets' },
        { label: 'Calculator', href: '#calculator' }, { label: 'Insights', href: '#insights' },
      ]},
      { title: 'Client Portal', links: [
        { label: 'Become an Investor', href: '/investor/register' },
        { label: 'Sign In', href: '/investor/login' },
      ]},
    ],
  },
  sections: []
};

function escNav(text) {
  return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function navLinkAttrs(item) {
  let attrs = `href="${escNav(item.href || '#')}"`;
  if (item.contact_key) attrs += ` data-contact="${escNav(item.contact_key)}"`;
  if (item.calendly) attrs += ' data-calendly';
  if (item.external) attrs += ' target="_blank" rel="noopener"';
  return attrs;
}

function headerLinkHtml(item) {
  const attrs = navLinkAttrs(item);
  if (item.style === 'ghost') return `<a ${attrs} class="btn btn-ghost">${escNav(item.label)}</a>`;
  if (item.style === 'gold') return `<a ${attrs} class="btn btn-gold">${escNav(item.label)}</a>`;
  return `<a ${attrs}>${escNav(item.label)}</a>`;
}

function applyNavigation(nav) {
  if (!nav) return;

  const headerNav = document.getElementById('headerNav');
  if (headerNav && nav.header?.length) {
    headerNav.innerHTML = nav.header.map(item => {
      const liClass = item.li_class ? ` class="${escNav(item.li_class)}"` : '';
      return `<li${liClass}>${headerLinkHtml(item)}</li>`;
    }).join('');
  }

  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu && nav.header?.length) {
    mobileMenu.innerHTML = nav.header.map(item => {
      if (item.style === 'gold') {
        return `<a ${navLinkAttrs(item)} class="btn btn-gold">${escNav(item.label)}</a>`;
      }
      if (item.style === 'ghost') {
        return `<a ${navLinkAttrs(item)} class="btn btn-ghost" style="margin-top:8px">${escNav(item.label)}</a>`;
      }
      return `<a ${navLinkAttrs(item)}>${escNav(item.label)}</a>`;
    }).join('');
  }

  const footerCols = document.getElementById('footerNavColumns');
  if (footerCols && nav.footer_columns?.length) {
    footerCols.innerHTML = nav.footer_columns.map(col => `
      <div class="footer-col">
        <h4>${escNav(col.title)}</h4>
        <ul>${(col.links || []).map(link =>
          `<li><a ${navLinkAttrs(link)}>${escNav(link.label)}</a></li>`
        ).join('')}</ul>
      </div>`).join('');
  }
}

function formatPhone(phone) {
  return phone.replace(/(\+\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
}

function socialDisplayUrl(url) {
  return String(url || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

function applySocials(socials) {
  const active = (socials || []).filter(s => s.enabled && s.url);
  const footer = document.getElementById('footerSocial');
  if (footer) {
    footer.innerHTML = active.map(s => {
      const icon = window.SOCIAL_ICONS?.[s.key];
      if (!icon) return '';
      return `<a href="${escNav(s.url)}" target="_blank" rel="noopener" aria-label="${escNav(s.label)}">${icon}</a>`;
    }).join('');
  }

  const contactSocial = document.getElementById('contactSocialLinks');
  if (contactSocial) {
    contactSocial.innerHTML = active
      .filter(s => s.show_in_contact)
      .map(s => {
        const icon = window.SOCIAL_CONTACT_ICONS?.[s.key] || window.SOCIAL_ICONS?.[s.key] || '';
        return `<div class="channel">
          <div class="channel-icon">${icon}</div>
          <div><div class="k">${escNav(s.label)}</div><a class="v" href="${escNav(s.url)}" target="_blank" rel="noopener">${escNav(socialDisplayUrl(s.url))}</a></div>
        </div>`;
      }).join('');
  }
}

function applyContact(config) {
  const c = config.contact || {};
  document.querySelectorAll('[data-contact="email"]').forEach(el => {
    el.href = 'mailto:' + c.email;
    if (el.classList.contains('v') || el.closest('.footer-col')) el.textContent = c.email;
  });
  document.querySelectorAll('[data-contact="phone"]').forEach(el => {
    el.href = 'tel:' + c.phone;
    if (el.classList.contains('v') || el.closest('.footer-col')) el.textContent = formatPhone(c.phone);
  });
  document.querySelectorAll('[data-contact="whatsapp"]').forEach(el => {
    el.href = 'https://wa.me/' + c.phone.replace(/[^\d]/g, '') + '?text=' + encodeURIComponent(c.waMessage || '');
    if (el.classList.contains('v')) el.textContent = formatPhone(c.phone);
  });
  document.querySelectorAll('[data-calendly]').forEach(el => {
    if (c.calendly) {
      el.href = c.calendly;
      el.target = '_blank';
      el.rel = 'noopener';
    }
  });
}

function applyStats(container, stats) {
  if (!container || !stats?.length) return;
  container.innerHTML = stats.map(s => `
    <div class="${container.id === 'heroStats' ? 'hero-stat' : 'record-item'} reveal">
      <div class="num" data-count="${s.value}" data-prefix="${s.prefix || ''}" data-suffix="${s.suffix || ''}">0</div>
      <div class="lbl">${s.label.replace(/\n/g, container.id === 'recordStats' ? '<br>' : ' ')}</div>
    </div>
  `).join('');
}

function applyInsights(insights) {
  const grid = document.getElementById('insightGrid');
  if (!grid || !insights?.length) return;

  const visuals = {
    'iv-1': '<svg viewBox="0 0 400 120" preserveAspectRatio="none"><path d="M0,100 C50,90 70,60 110,66 C150,72 170,40 220,46 C270,52 290,24 340,28 C370,30 385,18 400,12 L400,120 L0,120 Z" fill="rgba(201,161,75,.18)"/><path d="M0,100 C50,90 70,60 110,66 C150,72 170,40 220,46 C270,52 290,24 340,28 C370,30 385,18 400,12" fill="none" stroke="#C9A14B" stroke-width="1.5"/></svg>',
    'iv-2': '<svg viewBox="0 0 400 120" preserveAspectRatio="none"><rect x="30" y="70" width="26" height="50" fill="rgba(201,161,75,.25)"/><rect x="80" y="55" width="26" height="65" fill="rgba(201,161,75,.35)"/><rect x="130" y="80" width="26" height="40" fill="rgba(201,161,75,.2)"/><rect x="180" y="40" width="26" height="80" fill="rgba(226,194,117,.45)"/><rect x="230" y="60" width="26" height="60" fill="rgba(201,161,75,.3)"/><rect x="280" y="30" width="26" height="90" fill="rgba(226,194,117,.55)"/><rect x="330" y="50" width="26" height="70" fill="rgba(201,161,75,.35)"/></svg>',
    'iv-3': '<svg viewBox="0 0 400 120" preserveAspectRatio="none"><circle cx="90" cy="60" r="34" fill="none" stroke="rgba(201,161,75,.4)" stroke-width="1.5"/><circle cx="90" cy="60" r="22" fill="none" stroke="rgba(226,194,117,.5)" stroke-width="1.5"/><circle cx="90" cy="60" r="10" fill="rgba(201,161,75,.5)"/><path d="M140,60 H400" stroke="rgba(255,255,255,.1)" stroke-width="1"/><path d="M150,60 C200,55 230,30 280,34 C330,38 360,20 400,16" fill="none" stroke="#C9A14B" stroke-width="1.5"/></svg>'
  };

  grid.innerHTML = insights.map((item, i) => `
    <article class="insight reveal${i ? ' reveal-d' + i : ''}">
      <div class="insight-visual ${item.theme || 'iv-1'}">${visuals[item.theme] || visuals['iv-1']}</div>
      <div class="insight-body">
        <div class="insight-meta">${item.meta}</div>
        <h3>${item.title}</h3>
        <p>${item.summary}</p>
        <a class="insight-link" href="${item.url || '#contact'}">Read Commentary <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      </div>
    </article>
  `).join('');
}

function renderDynamicSections(sections) {
  const root = document.getElementById('dynamic-sections');
  if (!root || !sections?.length) return;

  root.innerHTML = sections
    .filter(section => ['custom', 'html'].includes(section.section_type))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(section => {
      if (section.section_type === 'html') {
        return `<section class="dynamic-section container" id="section-${section.slug}">${section.html_content || ''}</section>`;
      }
      const body = section.html_content || section.content?.body || section.content?.text || '';
      return `
        <section class="dynamic-section container" id="section-${section.slug}">
          <div class="section-head center">
            <h2 class="section-title">${section.title}</h2>
          </div>
          <div class="dynamic-section-body">${body}</div>
        </section>`;
    })
    .join('');
}

function applySectionVisibility(visibility) {
  if (!visibility) return;
  Object.entries(visibility).forEach(([key, visible]) => {
    document.querySelectorAll(`[data-section="${key}"]`).forEach(el => {
      el.style.display = visible ? '' : 'none';
    });
  });
}

function applySiteContent(site) {
  if (site.seo?.title) document.title = site.seo.title;
  if (site.seo?.description) {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = site.seo.description;
  }

  const brandName = site.brand?.name || site.site_name;
  if (brandName) {
    document.querySelectorAll('.brand-name').forEach(el => { el.textContent = brandName; });
  }
  if (site.brand) {
    document.querySelectorAll('.brand-tag').forEach(el => { el.textContent = site.brand.tagline; });
    const badge = document.getElementById('heroBadge');
    if (badge) badge.innerHTML = `<span class="dot"></span> ${site.brand.badge}`;
  }

  if (site.hero) {
    const title = document.getElementById('heroTitle');
    if (title) {
      title.innerHTML = `${site.hero.headline} <span class="gold-line">${site.hero.highlight}</span> ${site.hero.headlineSuffix || ''}`;
    }
    const sub = document.getElementById('heroSub');
    if (sub) sub.innerHTML = site.hero.subheadline || '';
  }

  if (site.portrait) {
    document.querySelectorAll('#portraitImg, #heroPortraitImg').forEach(img => {
      img.src = site.portrait.startsWith('/') ? site.portrait : '/' + site.portrait.replace(/^\//, '');
    });
  }

  applyStats(document.getElementById('heroStats'), site.stats?.hero);
  applyStats(document.getElementById('recordStats'), site.stats?.record);
  applyInsights(site.insights);
  applyNavigation(site.navigation);
  applyContact(site);
  applySocials(site.socials);
  applySectionVisibility(site.visibility);
  if (site.section_content) applySectionContentMap(site.section_content);
  renderDynamicSections(site.sections || []);
}

async function loadSiteConfig() {
  try {
    const res = await fetch(`${API_BASE}/api/site/`);
    if (!res.ok) throw new Error('Failed to load site config');
    window.SITE_CONFIG = await res.json();
  } catch {
    window.SITE_CONFIG = FALLBACK;
  }
  applySiteContent(window.SITE_CONFIG);
  document.dispatchEvent(new Event('site:ready'));
}

loadSiteConfig();
