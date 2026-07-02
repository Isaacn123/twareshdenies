const KYC_DOC_LABELS = {
  id_front: 'Government ID — front',
  id_back: 'Government ID — back',
  proof_of_address: 'Proof of address (≤ 90 days)',
  selfie: 'Selfie holding your ID',
};

const KYC_STATUS_CLASS = {
  not_started: 'muted',
  in_progress: 'info',
  submitted: 'warning',
  under_review: 'warning',
  approved: 'success',
  rejected: 'danger',
};

function kycStatusBadge(status, label) {
  const cls = KYC_STATUS_CLASS[status] || 'muted';
  return `<span class="kyc-badge kyc-badge-${cls}">${escapeHtml(label || status)}</span>`;
}

function kycSetAllSections(open) {
  document.querySelectorAll('#kycAdminPanel details').forEach(el => { el.open = open; });
}

function renderKycAdminPanel(investor) {
  const kyc = investor?.kyc || {};
  const docs = kyc.documents || {};
  const docRows = Object.values(docs);
  const statusLabel = kyc.status_label || kyc.status || 'Not started';

  return `
    <div id="kycAdminPanel" class="stack-sections" style="margin-top:18px">
      <div class="pf-section-toolbar">
        <span style="color:var(--muted);font-size:13px">KYC sections · ${escapeHtml(statusLabel)}</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn btn-ghost btn-sm" data-kyc-action="expand-all">Expand all</button>
          <button type="button" class="btn btn-ghost btn-sm" data-kyc-action="collapse-all">Collapse all</button>
        </div>
      </div>

      <details class="expand-row pf-section">
        <summary><span>Status overview</span><span class="expand-meta">${escapeHtml(statusLabel)} · ${kyc.progress_pct ?? 0}%</span></summary>
        <div class="expand-body">
          <p style="color:var(--muted);font-size:13px;margin:0 0 14px">Review identity documents and compliance details submitted by the investor.</p>
          <div class="grid-2">
            <div class="side-item"><small>Status</small><strong>${kycStatusBadge(kyc.status, kyc.status_label)}</strong></div>
            <div class="side-item"><small>Progress</small><strong>${kyc.progress_pct ?? 0}% complete</strong></div>
            <div class="side-item"><small>Submitted</small><strong>${kyc.submitted_at ? new Date(kyc.submitted_at).toLocaleString() : '—'}</strong></div>
            <div class="side-item"><small>Reviewed</small><strong>${kyc.reviewed_at ? new Date(kyc.reviewed_at).toLocaleString() : '—'}</strong></div>
          </div>
        </div>
      </details>

      <details class="expand-row pf-section">
        <summary><span>Identity details</span><span class="expand-meta">${escapeHtml(kyc.nationality || kyc.id_type || 'Not provided')}</span></summary>
        <div class="expand-body grid-2">
          <div class="side-item"><small>Date of birth</small><strong>${escapeHtml(kyc.date_of_birth || '—')}</strong></div>
          <div class="side-item"><small>Nationality</small><strong>${escapeHtml(kyc.nationality || '—')}</strong></div>
          <div class="side-item"><small>Country of residence</small><strong>${escapeHtml(kyc.country_of_residence || '—')}</strong></div>
          <div class="side-item"><small>ID type / number</small><strong>${escapeHtml(kyc.id_type || '—')} ${escapeHtml(kyc.id_number || '')}</strong></div>
          <div class="side-item" style="grid-column:1/-1"><small>Address</small><strong>${escapeHtml([kyc.address_line1, kyc.address_line2, kyc.city, kyc.postal_code].filter(Boolean).join(', ') || '—')}</strong></div>
          <div class="side-item"><small>Occupation</small><strong>${escapeHtml(kyc.occupation || '—')}</strong></div>
          <div class="side-item" style="grid-column:1/-1"><small>Source of funds</small><strong>${escapeHtml(kyc.source_of_funds || '—')}</strong></div>
        </div>
      </details>

      <details class="expand-row pf-section">
        <summary><span>Uploaded documents</span><span class="expand-meta">${docRows.length} files</span></summary>
        <div class="expand-body">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Document</th><th>Filename</th><th>Uploaded</th><th></th></tr></thead>
              <tbody>
                ${docRows.length ? docRows.map(doc => `
                  <tr>
                    <td>${escapeHtml(doc.doc_type_label || doc.doc_type)}</td>
                    <td>${escapeHtml(doc.original_name || '—')}</td>
                    <td>${doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : '—'}</td>
                    <td><button type="button" class="btn btn-ghost btn-sm kyc-view-doc" data-doc-id="${doc.id}">View</button></td>
                  </tr>`).join('') : '<tr><td colspan="4" style="color:var(--muted)">No documents uploaded yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </details>

      ${kyc.rejection_reason ? `
      <details class="expand-row pf-section">
        <summary><span>Previous rejection</span><span class="expand-meta">Rejected</span></summary>
        <div class="expand-body">
          <div class="card" style="margin:0;border-color:rgba(239,68,68,.35);background:rgba(239,68,68,.06)">
            <strong style="color:#ef4444">Previous rejection reason</strong>
            <p style="margin:8px 0 0;color:var(--text)">${escapeHtml(kyc.rejection_reason)}</p>
          </div>
        </div>
      </details>` : ''}

      <details class="expand-row pf-section">
        <summary><span>Review &amp; actions</span><span class="expand-meta">Approve · reject · notes</span></summary>
        <div class="expand-body stack-sections">
          <div class="grid-2">
            <div class="field" style="grid-column:1/-1"><label>Internal admin notes</label><textarea id="kycAdminNotes" rows="3" class="table-input">${escapeAttr(kyc.admin_notes || '')}</textarea></div>
            <div class="field" style="grid-column:1/-1"><label>Rejection reason (shown to investor if rejected)</label><textarea id="kycRejectionReason" rows="2" class="table-input" placeholder="Explain what needs to be corrected">${escapeAttr(kyc.rejection_reason || '')}</textarea></div>
          </div>
          <div class="page-toolbar" style="margin:0">
            <button type="button" class="btn btn-primary" id="kycApproveBtn" ${kyc.status === 'approved' ? 'disabled' : ''}>Approve KYC</button>
            <button type="button" class="btn btn-ghost" id="kycReviewBtn" ${kyc.status === 'under_review' ? 'disabled' : ''}>Mark under review</button>
            <button type="button" class="btn btn-ghost" id="kycRejectBtn" ${!['under_review', 'submitted', 'in_progress'].includes(kyc.status) ? '' : ''}>Reject KYC</button>
          </div>
        </div>
      </details>
    </div>`;
}

function bindKycAdmin(investorId) {
  const panel = document.getElementById('kycAdminPanel');
  if (!panel || panel.dataset.bound) return;
  panel.dataset.bound = '1';

  panel.addEventListener('click', e => {
    const btn = e.target.closest('[data-kyc-action]');
    if (!btn) return;
    e.preventDefault();
    if (btn.dataset.kycAction === 'expand-all') kycSetAllSections(true);
    if (btn.dataset.kycAction === 'collapse-all') kycSetAllSections(false);
  });

  panel.querySelectorAll('.kyc-view-doc').forEach(btn => {
    btn.onclick = () => API.openInvestorKycDocument(investorId, btn.dataset.docId);
  });

  document.getElementById('kycApproveBtn')?.addEventListener('click', async () => {
    await API.reviewInvestorKyc(investorId, {
      status: 'approved',
      admin_notes: document.getElementById('kycAdminNotes').value.trim(),
    });
    renderInvestors();
  });

  document.getElementById('kycReviewBtn')?.addEventListener('click', async () => {
    await API.reviewInvestorKyc(investorId, {
      status: 'under_review',
      admin_notes: document.getElementById('kycAdminNotes').value.trim(),
    });
    renderInvestors();
  });

  document.getElementById('kycRejectBtn')?.addEventListener('click', async () => {
    const reason = document.getElementById('kycRejectionReason').value.trim();
    if (!reason) {
      alert('Please provide a rejection reason for the investor.');
      return;
    }
    await API.reviewInvestorKyc(investorId, {
      status: 'rejected',
      rejection_reason: reason,
      admin_notes: document.getElementById('kycAdminNotes').value.trim(),
    });
    renderInvestors();
  });
}
