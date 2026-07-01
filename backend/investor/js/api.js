const API = {
  base: '',
  token() { return localStorage.getItem('investor_access_token') || ''; },
  authHeaders(json = true) {
    const h = { Authorization: 'Bearer ' + this.token() };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  },
  async request(path, options = {}) {
    const res = await fetch(this.base + path, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.detail || 'Request failed');
    return data;
  },
  login(username, password) {
    return this.request('/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  },
  me() { return this.request('/api/investor/me/', { headers: this.authHeaders() }); },
  kyc() { return this.request('/api/investor/kyc/', { headers: this.authHeaders() }); },
  saveKyc(payload) {
    return this.request('/api/investor/kyc/', {
      method: 'PATCH',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
  },
  submitKyc(payload) {
    return fetch(this.base + '/api/investor/kyc/submit/', {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || 'Submit failed');
        err.data = data;
        throw err;
      }
      return data;
    });
  },
  async uploadKycDocument(docType, file) {
    const form = new FormData();
    form.append('doc_type', docType);
    form.append('file', file);
    const res = await fetch(this.base + '/api/investor/kyc/upload/', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + this.token() },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
  async openKycDocument(docId) {
    const res = await fetch(this.base + `/api/investor/kyc/documents/${docId}/`, {
      headers: { Authorization: 'Bearer ' + this.token() },
    });
    if (!res.ok) throw new Error('Could not open document');
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), '_blank', 'noopener');
  },
  documents() { return this.request('/api/investor/documents/', { headers: this.authHeaders() }); },
  messages() { return this.request('/api/investor/messages/', { headers: this.authHeaders() }); },
  sendMessage(body, subject = 'Message to advisor') {
    return this.request('/api/investor/messages/', {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ body, subject }),
    });
  },
  register(payload) {
    return this.request('/api/investor/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
};

function saveTokens(data) {
  localStorage.setItem('investor_access_token', data.access);
  localStorage.setItem('investor_refresh_token', data.refresh);
}
function clearTokens() {
  localStorage.removeItem('investor_access_token');
  localStorage.removeItem('investor_refresh_token');
}
function requireAuth() {
  if (!API.token()) window.location.href = 'login';
}
