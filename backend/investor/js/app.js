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
  if (!parts.length) {
    el.innerHTML = '';
    el.className = 'kpi-change';
    return;
  }
  const negative = String(changeText || pctText).trim().startsWith('-');
  el.className = 'kpi-change ' + (negative ? 'down' : 'up');
  el.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="${negative ? 'M7 10l5 5 5-5' : 'M7 14l5-5 5 5'}z"/></svg> ${esc(parts.join(' '))} vs last month`;
}

function renderSparkline(svgId, values, stroke) {
  const svg = document.getElementById(svgId);
  if (!svg || !values?.length) return;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = values.length === 1 ? 40 : (i / (values.length - 1)) * 80;
    const y = 38 - ((v - min) / range) * 32;
    return `${x},${y}`;
  }).join(' ');
  svg.innerHTML = `<polyline points="${points}" fill="none" stroke="${stroke}" stroke-width="2"/>`;
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
  if (id === 'kyc') renderKycPage();
  if (id === 'markets') window.TFMarkets?.showPage();
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
  window.TFMarkets?.renderMini();
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
  setText('kpiFlex', portfolio.flex_funds || portfolio.available_funds);
  setChangeEl(document.getElementById('kpiNetWorthChange'), portfolio.net_worth_change, portfolio.net_worth_change_pct);
  setChangeEl(document.getElementById('kpiInvestedChange'), portfolio.total_invested_change, portfolio.total_invested_change_pct);
  setChangeEl(document.getElementById('kpiReturnsChange'), portfolio.total_returns_change, portfolio.total_returns_change_pct);

  const spark = portfolio.sparklines?.net_worth || [];
  renderSparkline('kpiNetWorthSpark', spark, '#3b82f6');
  renderSparkline('kpiInvestedSpark', spark, '#22c55e');
  renderSparkline('kpiReturnsSpark', portfolio.performance?.values || spark, '#8b5cf6');

  setText('perfVal', portfolio.performance?.total_returns || portfolio.total_returns);
  setText('perfBadge', portfolio.performance?.ytd_pct || portfolio.ytd_return || '—');

  setText('portStatValue', portfolio.net_worth || portfolio.aum);
  setText('portStatGains', portfolio.total_returns);
  setText('portStatFlex', portfolio.flex_funds || portfolio.available_funds || '—');

  renderAllocationLegend(portfolio.allocation || []);
  renderHoldingsTables();
  window.TFMarkets?.load(portfolio.market_snapshot || []);
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

function kycData() {
  return profile?.kyc || {};
}

const KYC_DOC_TYPES = [
  { key: 'id_front', label: 'Government ID — front', hint: 'Clear photo of the front of your national ID or passport.' },
  { key: 'id_back', label: 'Government ID — back', hint: 'Clear photo of the back of your ID (if applicable).' },
  { key: 'proof_of_address', label: 'Proof of address', hint: 'Utility bill or bank statement dated within the last 90 days.' },
  { key: 'selfie', label: 'Selfie with ID', hint: 'Photo of yourself holding your ID next to your face.' },
];

function kycStatusClass(status) {
  return ({
    approved: 'approved',
    rejected: 'rejected',
    under_review: 'review',
    submitted: 'review',
    in_progress: 'progress',
  }[status] || 'pending');
}

function initKycUI() {
  const kyc = kycData();
  const navBadge = document.getElementById('navKycBadge');
  const topBadge = document.getElementById('topbarKycBadge');
  if (navBadge) {
    if (kyc.status === 'approved') {
      navBadge.textContent = 'Verified';
      navBadge.className = 'nav-badge verified';
    } else if (['under_review', 'submitted'].includes(kyc.status)) {
      navBadge.textContent = 'Review';
      navBadge.className = 'nav-badge review';
    } else if (kyc.status === 'rejected') {
      navBadge.textContent = 'Action';
      navBadge.className = 'nav-badge action';
    } else if (kyc.status === 'in_progress') {
      navBadge.textContent = `${kyc.progress_pct || 0}%`;
      navBadge.className = 'nav-badge progress';
    } else {
      navBadge.className = 'nav-badge hidden';
    }
  }
  if (topBadge) {
    topBadge.classList.toggle('verified', kyc.status === 'approved');
    topBadge.classList.toggle('pending', kyc.status !== 'approved');
    topBadge.title = kyc.status_label || 'KYC status';
  }
}

function collectKycForm() {
  return {
    date_of_birth: document.getElementById('kycDob')?.value || '',
    nationality: document.getElementById('kycNationality')?.value.trim() || '',
    country_of_residence: document.getElementById('kycCountry')?.value.trim() || '',
    address_line1: document.getElementById('kycAddress1')?.value.trim() || '',
    address_line2: document.getElementById('kycAddress2')?.value.trim() || '',
    city: document.getElementById('kycCity')?.value.trim() || '',
    postal_code: document.getElementById('kycPostal')?.value.trim() || '',
    id_type: document.getElementById('kycIdType')?.value || '',
    id_number: document.getElementById('kycIdNumber')?.value.trim() || '',
    occupation: document.getElementById('kycOccupation')?.value.trim() || '',
    source_of_funds: document.getElementById('kycSource')?.value.trim() || '',
  };
}

function renderKycPage() {
  const container = document.getElementById('kycContent');
  if (!container) return;

  const kyc = kycData();
  const canEdit = kyc.can_edit !== false;
  const disabled = canEdit ? '' : 'disabled';
  const docs = kyc.documents || {};

  const bannerMessage = {
    approved: 'Your identity has been verified. Thank you for completing KYC.',
    under_review: 'Your KYC submission is under review. We will notify you once complete.',
    submitted: 'Your documents have been submitted and are awaiting review.',
    rejected: kyc.rejection_reason || 'Your KYC was rejected. Please update your information and resubmit.',
    in_progress: 'Complete all sections below and submit for compliance review.',
    not_started: 'Verify your identity to unlock full portal features and faster onboarding.',
  }[kyc.status] || 'Complete your KYC verification.';

  container.innerHTML = `
    <div class="page-heading">
      <div class="section-title">KYC Verification</div>
      <div class="section-sub">Secure identity verification required for regulatory compliance and account protection.</div>
    </div>

    <div class="kyc-banner kyc-banner-${kycStatusClass(kyc.status)}">
      <div class="kyc-banner-top">
        <span class="kyc-status-pill">${esc(kyc.status_label || 'Not started')}</span>
        <span class="kyc-progress-text">${kyc.progress_pct || 0}% complete</span>
      </div>
      <p class="kyc-banner-msg">${esc(bannerMessage)}</p>
      ${kyc.status === 'rejected' && kyc.rejection_reason ? `<p class="kyc-reject-reason"><strong>Advisor note:</strong> ${esc(kyc.rejection_reason)}</p>` : ''}
    </div>

    <div class="kyc-steps">
      <div class="kyc-step ${kyc.progress_pct > 0 ? 'done' : 'active'}"><span>1</span> Personal details</div>
      <div class="kyc-step ${Object.keys(docs).length ? 'done' : ''}"><span>2</span> Upload documents</div>
      <div class="kyc-step ${['submitted', 'under_review', 'approved'].includes(kyc.status) ? 'done' : ''}"><span>3</span> Submit for review</div>
    </div>

    <div class="content-grid" style="grid-template-columns:1.2fr .8fr;align-items:start">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Personal &amp; identity information</span></div>
        <div class="kyc-form-grid">
          <div class="field"><label>Date of birth</label><input id="kycDob" type="date" value="${esc(kyc.date_of_birth || '')}" ${disabled}></div>
          <div class="field"><label>Nationality</label><input id="kycNationality" value="${esc(kyc.nationality || '')}" placeholder="Ugandan" ${disabled}></div>
          <div class="field"><label>Country of residence</label><input id="kycCountry" value="${esc(kyc.country_of_residence || '')}" placeholder="Uganda" ${disabled}></div>
          <div class="field"><label>Occupation</label><input id="kycOccupation" value="${esc(kyc.occupation || '')}" placeholder="Business owner" ${disabled}></div>
          <div class="field" style="grid-column:1/-1"><label>Residential address</label><input id="kycAddress1" value="${esc(kyc.address_line1 || '')}" placeholder="Street address" ${disabled}></div>
          <div class="field" style="grid-column:1/-1"><label>Address line 2</label><input id="kycAddress2" value="${esc(kyc.address_line2 || '')}" placeholder="Apartment, suite, etc." ${disabled}></div>
          <div class="field"><label>City</label><input id="kycCity" value="${esc(kyc.city || '')}" ${disabled}></div>
          <div class="field"><label>Postal code</label><input id="kycPostal" value="${esc(kyc.postal_code || '')}" ${disabled}></div>
          <div class="field"><label>ID document type</label>
            <select id="kycIdType" ${disabled}>
              <option value="">Select…</option>
              <option value="national_id" ${kyc.id_type === 'national_id' ? 'selected' : ''}>National ID</option>
              <option value="passport" ${kyc.id_type === 'passport' ? 'selected' : ''}>Passport</option>
              <option value="drivers_license" ${kyc.id_type === 'drivers_license' ? 'selected' : ''}>Driver's license</option>
            </select>
          </div>
          <div class="field"><label>ID number</label><input id="kycIdNumber" value="${esc(kyc.id_number || '')}" ${disabled}></div>
          <div class="field" style="grid-column:1/-1"><label>Source of funds</label><textarea id="kycSource" rows="3" placeholder="Describe the primary source of your invested capital" ${disabled}>${esc(kyc.source_of_funds || '')}</textarea></div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="widget">
          <div class="widget-header"><span class="widget-title">Required documents</span></div>
          <div class="kyc-doc-list">
            ${KYC_DOC_TYPES.map(doc => {
              const uploaded = docs[doc.key];
              return `<div class="kyc-doc-card ${uploaded ? 'uploaded' : ''}">
                <div class="kyc-doc-head">
                  <strong>${esc(doc.label)}</strong>
                  ${uploaded ? '<span class="kyc-doc-check">✓ Uploaded</span>' : '<span class="kyc-doc-missing">Required</span>'}
                </div>
                <p class="kyc-doc-hint">${esc(doc.hint)}</p>
                ${uploaded ? `<div class="kyc-doc-meta">${esc(uploaded.original_name || 'Document')} · ${uploaded.uploaded_at ? new Date(uploaded.uploaded_at).toLocaleDateString() : ''}</div>` : ''}
                <div class="kyc-doc-actions">
                  ${canEdit ? `<label class="btn-upload"><input type="file" accept=".jpg,.jpeg,.png,.pdf,.webp" data-kyc-upload="${doc.key}" hidden>${uploaded ? 'Replace file' : 'Upload file'}</label>` : ''}
                  ${uploaded ? `<button type="button" class="btn-link kyc-view-doc" data-doc-id="${uploaded.id}">View</button>` : ''}
                </div>
              </div>`;
            }).join('')}
          </div>
          <p class="kyc-upload-note">Accepted formats: JPG, PNG, PDF, WEBP · Max 10 MB per file</p>
        </div>

        <div class="widget">
          <div class="widget-header"><span class="widget-title">Submission</span></div>
          <p style="color:var(--text2);font-size:13px;margin:0 0 14px">Your data is encrypted and reviewed only by authorised compliance staff.</p>
          ${canEdit ? `
            <button class="btn-primary" type="button" id="kycSaveBtn" style="margin-bottom:10px;background:var(--navy3)">Save draft</button>
            <button class="btn-primary" type="button" id="kycSubmitBtn">Submit for review</button>
            <div class="status" id="kycStatus"></div>
          ` : `<p style="color:var(--text3);font-size:13px;margin:0">This submission is locked while under review or after approval.</p>`}
        </div>
      </div>
    </div>`;

  container.querySelectorAll('[data-kyc-upload]').forEach(input => {
    input.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const status = document.getElementById('kycStatus');
      try {
        if (status) { status.className = 'status'; status.textContent = 'Uploading…'; }
        const kycResult = await API.uploadKycDocument(e.target.dataset.kycUpload, file);
        profile.kyc = kycResult;
        initKycUI();
        renderKycPage();
      } catch (err) {
        if (status) { status.className = 'status error'; status.textContent = err.message; }
      }
    });
  });

  container.querySelectorAll('.kyc-view-doc').forEach(btn => {
    btn.onclick = () => API.openKycDocument(btn.dataset.docId);
  });

  document.getElementById('kycSaveBtn')?.addEventListener('click', async () => {
    const status = document.getElementById('kycStatus');
    try {
      profile.kyc = await API.saveKyc(collectKycForm());
      initKycUI();
      if (status) { status.className = 'status'; status.textContent = 'Draft saved.'; }
    } catch (err) {
      if (status) { status.className = 'status error'; status.textContent = err.message; }
    }
  });

  document.getElementById('kycSubmitBtn')?.addEventListener('click', async () => {
    const status = document.getElementById('kycStatus');
    try {
      const result = await API.submitKyc(collectKycForm());
      profile.kyc = result.kyc;
      initKycUI();
      renderKycPage();
      if (status) { status.className = 'status'; status.textContent = result.message || 'Submitted.'; }
    } catch (err) {
      if (err.data?.kyc) {
        profile.kyc = err.data.kyc;
        initKycUI();
        renderKycPage();
      }
      if (status) { status.className = 'status error'; status.textContent = err.message; }
    }
  });
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
    initKycUI();
    applyPortfolioData();
    initCurrencyConverter();
    showPage('overview');
  } catch {
    clearTokens();
    window.location.href = 'login';
  }
}

init();
