const API = {
  base: '',

  token() {
    return localStorage.getItem('access_token') || '';
  },

  authHeaders(json = true) {
    const headers = { Authorization: 'Bearer ' + this.token() };
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
  },

  async request(path, options = {}) {
    const res = await fetch(this.base + path, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || data.error || data.message || 'Request failed');
    return data;
  },

  login(username, password) {
    return this.request('/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  },

  me() {
    return this.request('/api/auth/me/', { headers: this.authHeaders() });
  },

  logout() {
    return this.request('/api/auth/logout/', {
      method: 'POST',
      headers: this.authHeaders(),
    }).catch(() => ({}));
  },

  getSettings() {
    return this.request('/api/admin/settings/', { headers: this.authHeaders() });
  },

  saveSettings(payload) {
    return this.request('/api/admin/settings/', {
      method: 'PUT',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  getSections() {
    return this.request('/api/admin/sections/', { headers: this.authHeaders() });
  },

  createSection(payload) {
    return this.request('/api/admin/sections/', {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  updateSection(slug, payload) {
    return this.request('/api/admin/sections/' + slug + '/', {
      method: 'PATCH',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  deleteSection(slug) {
    return fetch(this.base + '/api/admin/sections/' + slug + '/', {
      method: 'DELETE',
      headers: this.authHeaders(false),
    }).then(res => {
      if (!res.ok) throw new Error('Delete failed');
      return true;
    });
  },

  toggleSectionVisibility(slug) {
    return this.request('/api/admin/sections/' + slug + '/toggle-visibility/', {
      method: 'POST',
      headers: this.authHeaders(),
    });
  },

  getUsers() {
    return this.request('/api/auth/users/', { headers: this.authHeaders() });
  },

  createUser(payload) {
    return this.request('/api/auth/users/', {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  updateUser(id, payload) {
    return this.request('/api/auth/users/' + id + '/', {
      method: 'PATCH',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  getRoles() {
    return this.request('/api/auth/roles/', { headers: this.authHeaders() });
  },

  getInvestors() {
    return this.request('/api/admin/investors/', { headers: this.authHeaders() });
  },

  createInvestor(payload) {
    return this.request('/api/admin/investors/', {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  updateInvestor(id, payload) {
    return this.request('/api/admin/investors/' + id + '/', {
      method: 'PATCH',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  toggleInvestorPortal(id) {
    return this.request('/api/admin/investors/' + id + '/toggle_portal/', {
      method: 'POST',
      headers: this.authHeaders(),
    });
  },

  getInvestorActivity(id) {
    return this.request('/api/admin/investors/' + id + '/activity/', { headers: this.authHeaders() });
  },

  sendInvestorMessage(id, payload) {
    return this.request('/api/admin/investors/' + id + '/send_message/', {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  addInvestorDocument(investorId, payload) {
    return this.request('/api/admin/investors/' + investorId + '/documents/', {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  getSubmissions() {
    return this.request('/api/admin/submissions/', { headers: this.authHeaders() });
  },

  getNotifications() {
    return this.request('/api/admin/notifications/', { headers: this.authHeaders() });
  },

  getMessages() {
    return this.request('/api/admin/messages/', { headers: this.authHeaders() });
  },
};

function requireAuth() {
  if (!API.token()) window.location.href = 'login';
}

function saveTokens(data) {
  localStorage.setItem('access_token', data.access);
  localStorage.setItem('refresh_token', data.refresh);
}

function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}
