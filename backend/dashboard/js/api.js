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

  async refreshAccessToken() {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return false;
    try {
      const res = await fetch(this.base + '/api/auth/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.access) {
        localStorage.setItem('access_token', data.access);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  },

  async request(path, options = {}, allowRetry = true) {
    const res = await fetch(this.base + path, options);
    if (res.status === 401 && allowRetry && !path.includes('/auth/login/')) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        const headers = { ...(options.headers || {}) };
        headers.Authorization = 'Bearer ' + this.token();
        return this.request(path, { ...options, headers }, false);
      }
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.detail || data.error || data.message || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },

  login(username, password) {
    return this.request('/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }, false);
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

  patchSettings(payload) {
    return this.request('/api/admin/settings/', {
      method: 'PATCH',
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

  reviewInvestorKyc(investorId, payload) {
    return this.request('/api/admin/investors/' + investorId + '/review_kyc/', {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  async openInvestorKycDocument(investorId, docId) {
    const res = await fetch(this.base + `/api/admin/investors/${investorId}/kyc/documents/${docId}/`, {
      headers: this.authHeaders(false),
    });
    if (!res.ok) throw new Error('Could not open document');
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), '_blank', 'noopener');
  },

  getSubmissions() {
    return this.request('/api/admin/submissions/', { headers: this.authHeaders() });
  },

  getNotifications() {
    return this.request('/api/admin/notifications/', { headers: this.authHeaders() });
  },

  markNotificationRead(id) {
    return this.request(`/api/admin/notifications/${id}/mark_read/`, {
      method: 'POST',
      headers: this.authHeaders(),
    });
  },

  markAllNotificationsRead() {
    return this.request('/api/admin/notifications/mark_all_read/', {
      method: 'POST',
      headers: this.authHeaders(),
    });
  },

  getMessages() {
    return this.request('/api/admin/messages/', { headers: this.authHeaders() });
  },

  markMessageRead(id) {
    return this.request(`/api/admin/messages/${id}/mark_read/`, {
      method: 'POST',
      headers: this.authHeaders(),
    });
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

function hasAdminAccess(user) {
  if (!user) return false;
  if (user.is_staff || user.is_superuser) return true;
  const p = user.permissions || {};
  return !!(p.can_manage_content || p.can_manage_users || p.can_manage_investors || p.can_view_submissions);
}
