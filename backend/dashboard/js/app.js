requireAuth();

const pageContent = document.getElementById('pageContent');
let currentUser = null;
let siteSettings = null;

const pages = {
  overview: { render: renderOverview },
  sections: { render: renderSections },
  users: { render: renderUsers },
  investors: { render: renderInvestors },
  settings: { render: renderSettings },
  submissions: { render: renderSubmissions },
  messages: { render: renderMessages },
  reports: { render: renderReports },
  account: { render: renderAccount },
};

document.querySelectorAll('.nav-link[data-page]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(link.dataset.page);
  });
});

document.querySelectorAll('.dropdown').forEach(drop => {
  const btn = drop.querySelector('button');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.dropdown').forEach(d => { if (d !== drop) d.classList.remove('open'); });
    drop.classList.toggle('open');
  });
});

document.addEventListener('click', () => {
  document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await API.logout();
  clearTokens();
  window.location.href = 'login';
});

async function init() {
  pageContent.innerHTML = '<div class="card" style="padding:24px;color:var(--muted)">Loading dashboard…</div>';
  try {
    currentUser = await API.me();
    if (!hasAdminAccess(currentUser)) {
      clearTokens();
      pageContent.innerHTML = '<div class="card status error"><h2 style="margin-top:0">Access denied</h2><p>This account does not have admin dashboard access. Use an admin account or sign in at the investor portal.</p><p><a href="login">Back to sign in</a></p></div>';
      return;
    }
    document.getElementById('profileName').textContent = currentUser.full_name;
    document.getElementById('profileEmail').textContent = currentUser.email || currentUser.username;
    document.getElementById('profileAvatar').textContent = (currentUser.full_name || 'A').charAt(0).toUpperCase();
    document.getElementById('profileRole').textContent = currentUser.permissions?.role || 'Site Manager';
    setGreeting();
    if (!currentUser.permissions?.can_manage_users) {
      document.getElementById('navUsers')?.classList.add('hidden');
    }
    if (!currentUser.permissions?.can_manage_investors) {
      document.getElementById('navInvestors')?.classList.add('hidden');
    }
    document.getElementById('quickAddBtn')?.addEventListener('click', () => {
      navigate('investors');
      setTimeout(() => document.getElementById('addInvestorBtn')?.click(), 300);
    });
    siteSettings = await API.getSettings().catch(err => {
      console.warn('Site settings unavailable:', err.message);
      return {};
    });
    await loadTopbarData();
    await navigate('overview');
  } catch (err) {
    if (err.status === 401) {
      clearTokens();
      window.location.href = 'login';
      return;
    }
    pageContent.innerHTML = `<div class="card status error"><h2 style="margin-top:0">Could not load dashboard</h2><p>${escapeHtml(err.message || 'Unknown error')}</p><p style="font-size:13px;color:var(--muted)">If this persists after deploy, run <code>python manage.py migrate</code> on the backend.</p><p><button class="btn btn-ghost" type="button" onclick="location.reload()">Retry</button></p></div>`;
  }
}

function setGreeting() {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const name = (currentUser?.full_name || 'Admin').split(' ')[0];
  document.getElementById('greetingText').textContent = `Good ${period}, ${name}`;
}

async function loadTopbarData() {
  const [notifications, messages] = await Promise.all([
    API.getNotifications().catch(() => []),
    API.getMessages().catch(() => []),
  ]);

  const unreadNotes = notifications.filter(n => !n.is_read);
  const unreadMsgs = messages.filter(m => !m.is_read);

  const noteBadge = document.getElementById('notificationBadge');
  const msgBadge = document.getElementById('messageBadge');
  noteBadge.textContent = unreadNotes.length;
  msgBadge.textContent = unreadMsgs.length;
  noteBadge.classList.toggle('hidden', unreadNotes.length === 0);
  msgBadge.classList.toggle('hidden', unreadMsgs.length === 0);

  document.getElementById('notificationList').innerHTML = notifications.length
    ? notifications.slice(0, 6).map(n => `
        <div class="menu-item">
          <strong>${escapeHtml(n.title)}</strong>
          <small>${escapeHtml(n.message)}</small>
        </div>`).join('')
    : '<div class="menu-item"><small>No notifications yet.</small></div>';

  document.getElementById('messageList').innerHTML = messages.length
    ? messages.slice(0, 6).map(m => `
        <div class="menu-item">
          <strong>${escapeHtml(m.subject)}</strong>
          <small>${escapeHtml(m.sender_name)} · ${new Date(m.created_at).toLocaleString()}</small>
        </div>`).join('')
    : '<div class="menu-item"><small>No messages yet.</small></div>';
}

async function navigate(page) {
  const config = pages[page];
  if (!config) return;
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });
  pageContent.innerHTML = '<div class="card" style="padding:24px;color:var(--muted)">Loading…</div>';
  try {
    await Promise.resolve(config.render());
  } catch (err) {
    pageContent.innerHTML = `<div class="card status error"><h2 style="margin-top:0">Could not load this page</h2><p>${escapeHtml(err.message || 'Request failed')}</p></div>`;
  }
}

async function renderOverview() {
  const [sections, submissions, investors, users] = await Promise.all([
    API.getSections(),
    API.getSubmissions(),
    API.getInvestors().catch(() => []),
    API.getUsers().catch(() => []),
  ]);
  const published = sections.filter(s => s.is_published).length;
  const unread = submissions.filter(s => !s.is_read).length;
  const activeInvestors = investors.filter(i => i.portal_enabled).length;

  pageContent.innerHTML = `
    <div class="dash-grid">
      <div class="dash-stats">
        <div class="card metric-card"><div><div class="label">Total Investors</div><div class="value">${investors.length}</div><div class="metric-sub">${activeInvestors} portal active</div></div><div class="metric-icon">◉</div></div>
        <div class="card metric-card"><div><div class="label">Published Sections</div><div class="value">${published}</div><div class="metric-sub">${sections.length} total sections</div></div><div class="metric-icon">◉</div></div>
        <div class="card metric-card"><div><div class="label">Unread Submissions</div><div class="value">${unread}</div><div class="metric-sub">${submissions.length} all time</div></div><div class="metric-icon">◉</div></div>
        <div class="card metric-card"><div><div class="label">Admin Users</div><div class="value">${users.length}</div><div class="metric-sub">Platform team</div></div><div class="metric-icon">◉</div></div>
      </div>
      <div class="dash-mid">
        <div class="card">
          <div class="card-head"><h3>Section Visibility</h3></div>
          <div class="alloc-layout">
            <div class="chart-wrap sm"><canvas id="adminAllocChart"></canvas></div>
            <div class="legend-list">
              <div class="legend-item"><div class="legend-left"><span class="legend-dot" style="background:#7c3aed"></span>Published</div><strong>${published}</strong></div>
              <div class="legend-item"><div class="legend-left"><span class="legend-dot" style="background:#d1d5db"></span>Hidden</div><strong>${sections.length - published}</strong></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Submission Activity</h3><div class="perf-ytd">${submissions.length} total enquiries</div></div>
          <div class="chart-wrap"><canvas id="adminPerfChart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Platform Snapshot</h3></div>
          <div class="side-list">
            <div class="side-item"><div class="side-item-row"><strong>Site</strong><span>${escapeHtml(siteSettings?.site_name || 'Twaresh Denis')}</span></div></div>
            <div class="side-item"><div class="side-item-row"><strong>Investors</strong><span>${investors.length}</span></div></div>
            <div class="side-item"><div class="side-item-row"><strong>Unread submissions</strong><span class="${unread ? 'neg' : 'pos'}">${unread}</span></div></div>
            <div class="side-item"><div class="side-item-row"><strong>Your role</strong><span>${escapeHtml(currentUser.permissions?.role || 'Admin')}</span></div></div>
          </div>
        </div>
      </div>
      <div class="dash-lower">
        <div class="card">
          <div class="card-head"><h3>Recent Submissions</h3><button class="btn btn-outline btn-sm" type="button" onclick="navigate('submissions')">View all</button></div>
          <div class="table-wrap">${renderSubmissionTable(submissions.slice(0, 6))}</div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Investor Accounts</h3><button class="btn btn-outline btn-sm" type="button" onclick="navigate('investors')">Manage</button></div>
          <div class="side-list">${investors.length ? investors.slice(0, 5).map(inv => `
            <div class="side-item">
              <strong>${escapeHtml(inv.full_name)}</strong>
              <small>${escapeHtml(inv.user?.username || inv.username || '')}</small>
              <div class="side-item-row"><span>${inv.portal_enabled ? '<span class="badge success">Active</span>' : '<span class="badge muted">Disabled</span>'}</span><span>${escapeHtml(inv.portfolio?.net_worth || inv.portfolio?.aum || '—')}</span></div>
            </div>`).join('') : '<div style="color:var(--muted);padding:12px">No investors yet.</div>'}
          </div>
        </div>
      </div>
    </div>`;

  TICCharts.donut('adminAllocChart', ['Published', 'Hidden'], [published, Math.max(sections.length - published, 0)], ['#7c3aed', '#e5e7eb'], String(published), 'live');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const counts = months.map((_, i) => submissions.filter(s => new Date(s.created_at).getMonth() === i).length);
  TICCharts.line('adminPerfChart', months, counts.length ? counts : [0, 1, 0, 2, 1, submissions.length]);
}

async function renderReports() {
  const [sections, submissions, investors] = await Promise.all([
    API.getSections(), API.getSubmissions(), API.getInvestors().catch(() => []),
  ]);
  pageContent.innerHTML = `
    <div class="page-heading"><h2>Reports</h2><p>Platform activity summary.</p></div>
    <div class="dash-stats">
      <div class="card metric-card"><div><div class="label">Sections</div><div class="value">${sections.length}</div></div></div>
      <div class="card metric-card"><div><div class="label">Submissions</div><div class="value">${submissions.length}</div></div></div>
      <div class="card metric-card"><div><div class="label">Investors</div><div class="value">${investors.length}</div></div></div>
    </div>`;
}

function renderAccount() {
  pageContent.innerHTML = `
    <div class="page-heading"><h2>Settings</h2><p>Your admin account.</p></div>
    <div class="card" style="max-width:480px">
      <div class="side-list">
        <div class="side-item"><small>Name</small><strong>${escapeHtml(currentUser.full_name)}</strong></div>
        <div class="side-item"><small>Email</small><strong>${escapeHtml(currentUser.email || currentUser.username)}</strong></div>
        <div class="side-item"><small>Role</small><strong>${escapeHtml(currentUser.permissions?.role || 'Admin')}</strong></div>
      </div>
    </div>`;
}

async function renderSections() {
  const sections = await API.getSections();
  const pageSections = sections.filter(s => s.page_key).sort((a, b) => a.sort_order - b.sort_order);
  const customSections = sections.filter(s => !s.page_key);

  pageContent.innerHTML = `
    <div class="page-heading"><h2>Page Sections</h2><p>Show or hide public site sections and edit content.</p></div>
    <div class="card" style="margin-bottom:18px">
      <h3 style="color:var(--text);font-size:18px;margin:0 0 8px">Public page sections</h3>
      <p style="color:var(--muted);margin:0 0 16px">Each row maps to a <code>data-section</code> block in the frontend HTML. Toggle visibility without deleting content.</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Section</th><th>Frontend key</th><th>Type</th><th>Visible</th><th>Content</th></tr>
          </thead>
          <tbody>
            ${pageSections.map(section => `
              <tr>
                <td><strong>${escapeHtml(section.title)}</strong></td>
                <td><code>${escapeHtml(section.page_key)}</code></td>
                <td><span class="tag muted">${escapeHtml(section.section_type)}</span></td>
                <td>
                  <label class="toggle">
                    <input type="checkbox" data-slug="${section.slug}" ${section.is_published ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                  </label>
                </td>
                <td><button class="btn btn-ghost edit-content" data-slug="${section.slug}" type="button">Edit content</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="page-toolbar">
      <div><span class="tag">${customSections.length} custom sections</span></div>
      <button class="btn btn-primary" id="addSectionBtn" type="button">Add custom section</button>
    </div>
    <div class="card table-wrap">
      <table>
        <thead>
          <tr><th>Title</th><th>Slug</th><th>Type</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          ${customSections.length ? customSections.map(section => `
            <tr>
              <td>${escapeHtml(section.title)}</td>
              <td>${escapeHtml(section.slug)}</td>
              <td><span class="tag muted">${escapeHtml(section.section_type)}</span></td>
              <td>${section.is_published ? '<span class="tag">Published</span>' : '<span class="tag muted">Hidden</span>'}</td>
              <td>
                <button class="btn btn-ghost edit-section" data-slug="${section.slug}" type="button">Edit</button>
                <button class="btn btn-danger delete-section" data-slug="${section.slug}" type="button">Delete</button>
              </td>
            </tr>`).join('') : '<tr><td colspan="5">No custom sections yet.</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="card hidden" id="sectionEditor" style="margin-top:18px"></div>`;

  pageContent.querySelectorAll('.toggle input').forEach(input => {
    input.addEventListener('change', async () => {
      try {
        await API.toggleSectionVisibility(input.dataset.slug);
      } catch {
        input.checked = !input.checked;
        alert('Could not update section visibility.');
      }
    });
  });

  document.getElementById('addSectionBtn')?.addEventListener('click', () => openSectionEditor());
  pageContent.querySelectorAll('.edit-section').forEach(btn => {
    btn.addEventListener('click', () => openSectionEditor(customSections.find(s => s.slug === btn.dataset.slug)));
  });
  pageContent.querySelectorAll('.edit-content').forEach(btn => {
    btn.addEventListener('click', () => openSectionContentEditor(pageSections.find(s => s.slug === btn.dataset.slug)));
  });
  pageContent.querySelectorAll('.delete-section').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this custom section?')) return;
      await API.deleteSection(btn.dataset.slug);
      renderSections();
    });
  });
}

function openSectionContentEditor(section) {
  const editor = document.getElementById('sectionEditor');
  SectionContentEditor.open(section, editor, {
    onSave: async (content) => {
      await API.updateSection(section.slug, { content });
      renderSections();
    },
  });
}

async function renderInvestors() {
  if (!currentUser.permissions?.can_manage_investors) {
    pageContent.innerHTML = '<div class="card">You do not have permission to manage investors.</div>';
    return;
  }
  const investors = await API.getInvestors();
  pageContent.innerHTML = `
    <div class="page-heading"><h2>Investors</h2><p>Create accounts, manage portfolios, and control portal access.</p></div>
    <div class="page-toolbar">
      <div><span class="tag">${investors.length} investor accounts</span></div>
      <button class="btn btn-primary" id="addInvestorBtn" type="button">Add investor</button>
    </div>
    <div class="card table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Username</th><th>Type</th><th>Portal</th><th>AUM</th><th></th></tr></thead>
        <tbody>
          ${investors.length ? investors.map(inv => `
            <tr>
              <td>${escapeHtml(inv.full_name)}</td>
              <td>${escapeHtml(inv.user?.username || inv.username || '-')}</td>
              <td>${escapeHtml(inv.investor_type)}</td>
              <td>${inv.portal_enabled ? '<span class="tag">Active</span>' : '<span class="tag muted">Disabled</span>'}</td>
              <td>${escapeHtml(inv.portfolio?.aum || '—')}</td>
              <td>
                <button class="btn btn-ghost manage-investor" data-id="${inv.id}" type="button">Manage</button>
              </td>
            </tr>`).join('') : '<tr><td colspan="6">No investors yet.</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="card hidden" id="investorEditor" style="margin-top:18px"></div>`;

  document.getElementById('addInvestorBtn').onclick = () => openInvestorEditor(null, investors);
  pageContent.querySelectorAll('.manage-investor').forEach(btn => {
    btn.onclick = () => openInvestorEditor(investors.find(i => i.id === Number(btn.dataset.id)), investors);
  });
}

async function openInvestorEditor(investor, allInvestors) {
  const editor = document.getElementById('investorEditor');
  editor.classList.remove('hidden');
  CKE.destroyIn(editor);
  const p = investor?.portfolio || {};
  editor.innerHTML = `
    <h3 style="margin-top:0">${investor ? 'Manage investor' : 'New investor'}</h3>
    <div class="grid-2">
      ${investor ? '' : '<div class="field"><label>Username</label><input id="inv-username"></div>'}
      <div class="field"><label>Full name</label><input id="inv-name" value="${escapeAttr(investor?.full_name || '')}"></div>
      <div class="field"><label>Email</label><input id="inv-email" value="${escapeAttr(investor?.email || '')}"></div>
      <div class="field"><label>Password ${investor ? '(optional)' : ''}</label><input id="inv-password" type="password"></div>
      <div class="field"><label>Phone</label><input id="inv-phone" value="${escapeAttr(investor?.phone || '')}"></div>
      <div class="field"><label>Investor type</label>
        <select id="inv-type">
          ${['hnwi','entrepreneur','executive','family_office','institutional','other'].map(t =>
            `<option value="${t}" ${investor?.investor_type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="field"><label>Portfolio JSON (aum, ytd_return, allocation, etc.)</label><textarea id="inv-portfolio" style="min-height:160px;font-family:ui-monospace,monospace">${escapeHtml(JSON.stringify(p, null, 2))}</textarea></div>
    <div class="field-richtext"><label>Admin notes</label><textarea id="inv-notes" data-ckeditor>${richTextareaValue(investor?.admin_notes || '')}</textarea></div>
    <div class="field"><label>Document title</label><input id="doc-title" placeholder="Q1 Performance Report"></div>
    <div class="field-richtext"><label>Document description</label><textarea id="doc-description" data-ckeditor placeholder="Optional summary shown in the investor portal"></textarea></div>
    <div class="field"><label>Document URL</label><input id="doc-url" placeholder="https://..."></div>
    <button class="btn btn-primary" id="saveInvestorBtn" type="button">Save investor</button>
    ${investor ? `<button class="btn btn-ghost" id="togglePortalBtn" type="button">${investor.portal_enabled ? 'Disable portal' : 'Enable portal'}</button>` : ''}
    ${investor ? `<button class="btn btn-ghost" id="viewActivityBtn" type="button">View activity log</button>` : ''}
    <div id="investorActivity" style="margin-top:16px"></div>`;

  await CKE.initIn(editor);

  document.getElementById('saveInvestorBtn').onclick = async () => {
    let portfolio = {};
    try { portfolio = JSON.parse(document.getElementById('inv-portfolio').value || '{}'); } catch { alert('Invalid portfolio JSON'); return; }
    const payload = {
      full_name: document.getElementById('inv-name').value.trim(),
      email: document.getElementById('inv-email').value.trim(),
      phone: document.getElementById('inv-phone').value.trim(),
      investor_type: document.getElementById('inv-type').value,
      portfolio,
      admin_notes: CKE.getValue(document.getElementById('inv-notes')),
    };
    const password = document.getElementById('inv-password').value;
    if (password) payload.password = password;
    if (investor) {
      await API.updateInvestor(investor.id, payload);
      const docTitle = document.getElementById('doc-title').value.trim();
      const docUrl = document.getElementById('doc-url').value.trim();
      const docDescription = CKE.getValue(document.getElementById('doc-description'));
      if (docTitle) {
        await API.addInvestorDocument(investor.id, {
          title: docTitle,
          description: docDescription,
          file_url: docUrl,
          doc_type: 'report',
          is_visible: true,
        });
      }
    } else {
      payload.username_input = document.getElementById('inv-username').value.trim();
      payload.username = payload.username_input;
      if (!payload.username || !password) { alert('Username and password required'); return; }
      await API.createInvestor(payload);
    }
    renderInvestors();
  };

  if (investor) {
    document.getElementById('togglePortalBtn').onclick = async () => { await API.toggleInvestorPortal(investor.id); renderInvestors(); };
    document.getElementById('viewActivityBtn').onclick = async () => {
      const activity = await API.getInvestorActivity(investor.id);
      document.getElementById('investorActivity').innerHTML = activity.length
        ? `<table class="submissions"><thead><tr><th>When</th><th>Action</th><th>Detail</th></tr></thead><tbody>${activity.map(a => `<tr><td>${new Date(a.created_at).toLocaleString()}</td><td>${escapeHtml(a.action)}</td><td>${escapeHtml(a.detail)}</td></tr>`).join('')}</tbody></table>`
        : '<p>No activity recorded.</p>';
    };
  }
}

async function renderUsers() {
  if (!currentUser.permissions?.can_manage_users) {
    pageContent.innerHTML = '<div class="card">You do not have permission to manage users.</div>';
    return;
  }

  const [users, roles] = await Promise.all([API.getUsers(), API.getRoles()]);
  pageContent.innerHTML = `
    <div class="page-heading"><h2>Users &amp; Roles</h2><p>Manage dashboard team access.</p></div>
    <div class="page-toolbar">
      <div><span class="tag">${users.length} users · ${roles.length} roles</span></div>
      <button class="btn btn-primary" id="addUserBtn" type="button">Add user</button>
    </div>
    <div class="grid-2">
      <div class="card table-wrap">
        <h3 style="color:var(--text);margin-top:0">Users</h3>
        <table>
          <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${users.map(user => `
              <tr>
                <td>${escapeHtml(user.username)}</td>
                <td>${escapeHtml(user.email || '-')}</td>
                <td>${escapeHtml(user.role?.name || 'Unassigned')}</td>
                <td>${user.is_active ? '<span class="tag">Active</span>' : '<span class="tag muted">Inactive</span>'}</td>
                <td><button class="btn btn-ghost edit-user" data-id="${user.id}" type="button">Edit</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="card">
        <h3 style="color:var(--text);margin-top:0">Roles</h3>
        ${roles.map(role => `
          <div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06)">
            <strong>${escapeHtml(role.name)}</strong>
            <div style="color:var(--muted);font-size:13px;margin-top:4px">${escapeHtml(role.description)}</div>
            <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
              ${role.can_manage_users ? '<span class="tag">Manage users</span>' : ''}
              ${role.can_manage_content ? '<span class="tag">Manage content</span>' : ''}
              ${role.can_view_submissions ? '<span class="tag">View submissions</span>' : ''}
              ${role.can_manage_investors ? '<span class="tag">Manage investors</span>' : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>
    <div class="card hidden" id="userEditor" style="margin-top:18px"></div>`;

  document.getElementById('addUserBtn').onclick = () => openUserEditor(null, roles);
  pageContent.querySelectorAll('.edit-user').forEach(btn => {
    btn.onclick = () => openUserEditor(users.find(u => u.id === Number(btn.dataset.id)), roles);
  });
}

function openUserEditor(user, roles) {
  const editor = document.getElementById('userEditor');
  editor.classList.remove('hidden');
  editor.innerHTML = `
    <h3 style="margin-top:0">${user ? 'Edit user' : 'New user'}</h3>
    <div class="grid-2">
      <div class="field"><label>Username</label><input id="u-username" value="${escapeAttr(user?.username || '')}" ${user ? 'readonly' : ''}></div>
      <div class="field"><label>Email</label><input id="u-email" type="email" value="${escapeAttr(user?.email || '')}"></div>
      <div class="field"><label>Password ${user ? '(leave blank to keep)' : ''}</label><input id="u-password" type="password"></div>
      <div class="field"><label>Role</label>
        <select id="u-role">
          ${roles.map(r => `<option value="${r.id}" ${user?.role?.id === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="field"><label><input id="u-active" type="checkbox" ${user?.is_active !== false ? 'checked' : ''}> Active</label></div>
    <button class="btn btn-primary" id="saveUserBtn" type="button">Save user</button>`;

  document.getElementById('saveUserBtn').onclick = async () => {
    const payload = {
      email: document.getElementById('u-email').value.trim(),
      role_id: Number(document.getElementById('u-role').value),
      is_active: document.getElementById('u-active').checked,
      is_staff: true,
    };
    const password = document.getElementById('u-password').value;
    if (password) payload.password = password;
    if (user) await API.updateUser(user.id, payload);
    else {
      payload.username = document.getElementById('u-username').value.trim();
      if (!payload.username || !password) {
        alert('Username and password are required for new users.');
        return;
      }
      await API.createUser(payload);
    }
    renderUsers();
  };
}

async function openSectionEditor(section) {
  const editor = document.getElementById('sectionEditor');
  editor.classList.remove('hidden');
  CKE.destroyIn(editor);
  editor.innerHTML = `
    <h3 style="margin-top:0">${section ? 'Edit section' : 'New section'}</h3>
    <div class="grid-2">
      <div class="field"><label>Title</label><input id="secTitle" value="${escapeAttr(section?.title || '')}"></div>
      <div class="field"><label>Slug</label><input id="secSlug" value="${escapeAttr(section?.slug || '')}" ${section ? 'readonly' : ''}></div>
      <div class="field"><label>Type</label>
        <select id="secType">
          ${['hero','about','stats','philosophy','services','insights','contact','custom','html'].map(t =>
            `<option value="${t}" ${section?.section_type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Sort order</label><input id="secOrder" type="number" value="${section?.sort_order ?? 0}"></div>
    </div>
    <div class="field"><label>JSON content</label><textarea id="secContent">${escapeHtml(JSON.stringify(section?.content || {}, null, 2))}</textarea></div>
    <div class="field-richtext"><label>HTML content (for html/custom sections)</label><textarea id="secHtml" data-ckeditor>${richTextareaValue(section?.html_content || '')}</textarea></div>
    <div class="field"><label><input id="secPublished" type="checkbox" ${section?.is_published !== false ? 'checked' : ''}> Published</label></div>
    <button class="btn btn-primary" id="saveSectionBtn" type="button">Save section</button>`;

  await CKE.init(document.getElementById('secHtml'));

  document.getElementById('saveSectionBtn').onclick = async () => {
    let content = {};
    try {
      content = JSON.parse(document.getElementById('secContent').value || '{}');
    } catch {
      alert('Invalid JSON in content field');
      return;
    }
    const payload = {
      title: document.getElementById('secTitle').value.trim(),
      slug: document.getElementById('secSlug').value.trim(),
      section_type: document.getElementById('secType').value,
      sort_order: Number(document.getElementById('secOrder').value || 0),
      content,
      html_content: CKE.getValue(document.getElementById('secHtml')),
      is_published: document.getElementById('secPublished').checked,
    };
    if (section) await API.updateSection(section.slug, payload);
    else await API.createSection(payload);
    renderSections();
  };
}

const SOCIAL_PLATFORM_ORDER = ['linkedin', 'twitter', 'instagram', 'facebook', 'youtube', 'tiktok', 'telegram', 'github'];
const SOCIAL_PLATFORM_LABELS = {
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  telegram: 'Telegram',
  github: 'GitHub',
};

function mergeSocials(saved) {
  const map = Object.fromEntries((saved || []).map(item => [item.key, item]));
  return SOCIAL_PLATFORM_ORDER.map(key => ({
    key,
    label: SOCIAL_PLATFORM_LABELS[key],
    url: map[key]?.url || '',
    enabled: !!map[key]?.enabled,
    show_in_contact: map[key]?.show_in_contact ?? key === 'linkedin',
  }));
}

function renderSocialRows(socials) {
  return mergeSocials(socials).map(item => `
    <tr data-social-key="${item.key}">
      <td><label class="toggle" style="margin:0"><input type="checkbox" class="social-enabled" ${item.enabled ? 'checked' : ''}><span class="slider"></span></label></td>
      <td><strong>${escapeHtml(item.label)}</strong></td>
      <td><input class="social-url" type="url" placeholder="https://..." value="${escapeAttr(item.url)}" style="width:100%"></td>
      <td><label><input type="checkbox" class="social-contact" ${item.show_in_contact ? 'checked' : ''}> Show in contact</label></td>
    </tr>`).join('');
}

function collectSocialsFromForm() {
  return [...document.querySelectorAll('#socialsTable tbody tr')].map(row => ({
    key: row.dataset.socialKey,
    label: SOCIAL_PLATFORM_LABELS[row.dataset.socialKey],
    url: row.querySelector('.social-url').value.trim(),
    enabled: row.querySelector('.social-enabled').checked,
    show_in_contact: row.querySelector('.social-contact').checked,
  }));
}

async function renderSettings() {
  const s = siteSettings || await API.getSettings();
  pageContent.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <h3 style="color:var(--text);font-size:18px">Brand & contact</h3>
        <div class="field"><label>Site name</label><input id="siteName" value="${escapeAttr(s.site_name || '')}"></div>
        <div class="field"><label>Tagline</label><input id="brandTag" value="${escapeAttr(s.brand?.tagline || '')}"></div>
        <div class="field"><label>Badge</label><input id="brandBadge" value="${escapeAttr(s.brand?.badge || '')}"></div>
        <div class="field"><label>Email</label><input id="contactEmail" value="${escapeAttr(s.contact?.email || '')}"></div>
        <div class="field"><label>Phone</label><input id="contactPhone" value="${escapeAttr(s.contact?.phone || '')}"></div>
        <div class="field"><label>Calendly</label><input id="contactCalendly" value="${escapeAttr(s.contact?.calendly || '')}"></div>
      </div>
      <div class="card">
        <h3 style="color:var(--text);font-size:18px">Hero & SEO</h3>
        <div class="field"><label>Hero headline</label><input id="heroHeadline" value="${escapeAttr(s.hero?.headline || '')}"></div>
        <div class="field"><label>Highlighted word</label><input id="heroHighlight" value="${escapeAttr(s.hero?.highlight || '')}"></div>
        <div class="field"><label>Headline suffix</label><input id="heroSuffix" value="${escapeAttr(s.hero?.headlineSuffix || '')}"></div>
        <div class="field-richtext"><label>Subheadline</label><textarea id="heroSub" data-ckeditor>${richTextareaValue(s.hero?.subheadline || '')}</textarea></div>
        <div class="field"><label>SEO title</label><input id="seoTitle" value="${escapeAttr(s.seo?.title || '')}"></div>
        <div class="field-richtext"><label>SEO description</label><textarea id="seoDescription" data-ckeditor>${richTextareaValue(s.seo?.description || '')}</textarea></div>
      </div>
    </div>
    <div class="card" style="margin-top:18px">
      <h3 style="color:var(--text);font-size:18px;margin-top:0">Social profiles</h3>
      <p style="color:var(--muted);font-size:13px;margin:0 0 16px">Enable platforms and add profile URLs. Only enabled profiles with a URL appear on the public site footer. Optionally show them in the contact section too.</p>
      <div class="table-wrap">
        <table id="socialsTable">
          <thead>
            <tr><th>Show</th><th>Platform</th><th>Profile URL</th><th>Contact section</th></tr>
          </thead>
          <tbody>${renderSocialRows(s.socials)}</tbody>
        </table>
      </div>
    </div>
    <div class="card" style="margin-top:18px">
      <h3 style="color:var(--text);font-size:18px;margin-top:0">Navigation (header &amp; footer)</h3>
      <p style="color:var(--muted);font-size:13px;margin:0 0 12px">Edit top navigation, mobile menu, and footer link columns. Header items support <code>style</code>: <code>ghost</code> or <code>gold</code> for buttons; optional <code>li_class</code>, <code>calendly</code>, <code>contact_key</code> on footer links.</p>
      <div class="field"><label>Navigation JSON</label><textarea id="navJson" style="min-height:320px;font-family:ui-monospace,monospace">${escapeHtml(JSON.stringify(s.navigation || {}, null, 2))}</textarea></div>
    </div>
    <button class="btn btn-primary" id="saveSettingsBtn" type="button" style="margin-top:18px">Save settings</button>
    <div class="status" id="settingsStatus"></div>`;

  await CKE.initIn(pageContent);

  document.getElementById('saveSettingsBtn').onclick = async () => {
    let navigation = s.navigation || {};
    try {
      navigation = JSON.parse(document.getElementById('navJson').value || '{}');
    } catch {
      alert('Invalid navigation JSON');
      return;
    }
    const payload = {
      site_name: document.getElementById('siteName').value.trim(),
      brand: {
        name: document.getElementById('siteName').value.trim(),
        tagline: document.getElementById('brandTag').value.trim(),
        badge: document.getElementById('brandBadge').value.trim(),
      },
      contact: {
        ...s.contact,
        email: document.getElementById('contactEmail').value.trim(),
        phone: document.getElementById('contactPhone').value.trim(),
        calendly: document.getElementById('contactCalendly').value.trim(),
      },
      socials: collectSocialsFromForm(),
      hero: {
        headline: document.getElementById('heroHeadline').value.trim(),
        highlight: document.getElementById('heroHighlight').value.trim(),
        headlineSuffix: document.getElementById('heroSuffix').value.trim(),
        subheadline: CKE.getValue(document.getElementById('heroSub')),
      },
      seo: {
        ...s.seo,
        title: document.getElementById('seoTitle').value.trim(),
        description: CKE.stripHtml(CKE.getValue(document.getElementById('seoDescription'))),
      },
      navigation,
    };
    siteSettings = await API.saveSettings(payload);
    document.getElementById('settingsStatus').textContent = 'Settings saved successfully.';
  };
}

async function renderSubmissions() {
  const submissions = await API.getSubmissions();
  pageContent.innerHTML = `
    <div class="card table-wrap">
      ${renderSubmissionTable(submissions)}
    </div>`;
}

async function renderMessages() {
  const messages = await API.getMessages();
  pageContent.innerHTML = `
    <div class="card table-wrap">
      <table>
        <thead><tr><th>Subject</th><th>From</th><th>Date</th><th>Status</th></tr></thead>
        <tbody>
          ${messages.length ? messages.map(m => `
            <tr>
              <td>${escapeHtml(m.subject)}</td>
              <td>${escapeHtml(m.sender_name)}</td>
              <td>${new Date(m.created_at).toLocaleString()}</td>
              <td>${m.is_read ? '<span class="tag muted">Read</span>' : '<span class="tag">Unread</span>'}</td>
            </tr>`).join('') : '<tr><td colspan="4">No messages yet.</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

function renderSubmissionTable(submissions) {
  if (!submissions.length) return '<p>No submissions yet.</p>';
  return `<table>
    <thead><tr><th>Date</th><th>Name</th><th>Email</th><th>Profile</th><th>Message</th><th>Status</th></tr></thead>
    <tbody>
      ${submissions.map(item => `
        <tr>
          <td>${new Date(item.created_at).toLocaleString()}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.email)}</td>
          <td>${escapeHtml(item.investor_profile)}</td>
          <td>${escapeHtml(item.message)}</td>
          <td>${item.is_read ? '<span class="tag muted">Read</span>' : '<span class="tag">New</span>'}</td>
        </tr>`).join('')}
    </tbody>
  </table>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function richTextareaValue(value) {
  return CKE.textareaValue(value);
}

init();
window.navigate = navigate;
