window.SectionContentEditor = (() => {
  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function richValue(s) {
    return CKE.textareaValue(s);
  }

  function escAttr(s) {
    return esc(s).replace(/'/g, '&#39;');
  }

  function setByPath(obj, path, value) {
    const keys = path.split('.');
    let cur = obj;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const isLast = i === keys.length - 1;
      if (isLast) {
        cur[key] = value;
        return;
      }
      const next = keys[i + 1];
      if (/^\d+$/.test(next)) {
        if (!Array.isArray(cur[key])) cur[key] = [];
        i += 1;
        const idx = Number(next);
        if (i === keys.length - 1) {
          cur[key][idx] = value;
          return;
        }
        const after = keys[i + 1];
        if (cur[key][idx] == null) cur[key][idx] = /^\d+$/.test(after) ? [] : {};
        cur = cur[key][idx];
      } else {
        if (cur[key] == null || typeof cur[key] !== 'object' || Array.isArray(cur[key])) cur[key] = {};
        cur = cur[key];
      }
    }
  }

  function getByPath(obj, path) {
    return path.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), obj);
  }

  function collectForm(formEl, baseContent) {
    const out = JSON.parse(JSON.stringify(baseContent || {}));
    formEl.querySelectorAll('[data-json-path]').forEach(el => {
      const path = el.dataset.jsonPath;
      let val;
      if (el.hasAttribute('data-ckeditor')) {
        val = CKE.getValue(el);
      } else if (el.type === 'number') {
        val = el.value === '' ? '' : Number(el.value);
      } else {
        val = el.value;
      }
      setByPath(out, path, val);
    });
    return out;
  }

  function renderField(key, value, path) {
    if (typeof value === 'string') {
      if (CKE.isRichField(key)) {
        return `<div class="field-richtext"><label>${esc(key)}</label><textarea data-json-path="${escAttr(path)}" data-ckeditor>${richValue(value)}</textarea></div>`;
      }
      const multiline = value.length > 80 || value.includes('\n');
      if (multiline) {
        return `<div class="field"><label>${esc(key)}</label><textarea data-json-path="${escAttr(path)}">${esc(value)}</textarea></div>`;
      }
      return `<div class="field"><label>${esc(key)}</label><input data-json-path="${escAttr(path)}" value="${escAttr(value)}"></div>`;
    }
    return '';
  }

  function renderArray(key, arr, path) {
    if (!arr.length) return '';
    if (typeof arr[0] === 'string') {
      return arr.map((item, i) => {
        const p = `${path}.${i}`;
        const rich = CKE.isRichField(key) || key === 'paragraphs';
        if (rich) {
          return `<div class="field-richtext"><label>${esc(key)} ${i + 1}</label><textarea data-json-path="${escAttr(p)}" data-ckeditor>${richValue(item)}</textarea></div>`;
        }
        return `<div class="field"><label>${esc(key)} ${i + 1}</label><input data-json-path="${escAttr(p)}" value="${escAttr(item)}"></div>`;
      }).join('');
    }
    if (typeof arr[0] === 'object') {
      return arr.map((item, i) =>
        `<fieldset><legend>${esc(key)} ${i + 1}</legend>${renderObject(item, `${path}.${i}`)}</fieldset>`
      ).join('');
    }
    return '';
  }

  function renderObject(obj, path = '') {
    if (!obj || typeof obj !== 'object') return '';
    return Object.entries(obj).map(([key, value]) => {
      const p = path ? `${path}.${key}` : key;
      if (typeof value === 'string') return renderField(key, value, p);
      if (Array.isArray(value)) {
        return `<fieldset><legend>${esc(key)}</legend>${renderArray(key, value, p)}</fieldset>`;
      }
      if (value && typeof value === 'object') {
        return `<fieldset><legend>${esc(key)}</legend>${renderObject(value, p)}</fieldset>`;
      }
      return '';
    }).join('');
  }

  async function open(section, containerEl, { onSave, onCancel }) {
    CKE.destroyIn(containerEl);
    const content = section.content || {};
    containerEl.classList.remove('hidden');
    containerEl.innerHTML = `
      <h3 style="margin-top:0">Edit content — ${esc(section.title)}</h3>
      <p style="color:var(--muted);margin:0 0 16px">Rich descriptions use CKEditor. Images remain in <code>frontend/assets/</code>.</p>
      <form class="section-content-form" id="sectionContentForm">${renderObject(content)}</form>
      <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
        <button class="btn btn-primary" id="saveSectionContentBtn" type="button">Save content</button>
        <button class="btn btn-ghost" id="cancelSectionContentBtn" type="button">Cancel</button>
        <button class="btn btn-ghost" id="advancedJsonToggle" type="button">Advanced JSON</button>
      </div>
      <div class="field hidden" id="advancedJsonWrap" style="margin-top:16px">
        <label>Raw JSON</label>
        <textarea id="sectionContentJson" style="min-height:240px;font-family:ui-monospace,monospace">${esc(JSON.stringify(content, null, 2))}</textarea>
      </div>
      <div class="status" id="sectionContentStatus"></div>`;

    const form = document.getElementById('sectionContentForm');
    await CKE.initIn(form);

    document.getElementById('cancelSectionContentBtn').onclick = () => {
      CKE.destroyIn(containerEl);
      containerEl.classList.add('hidden');
      onCancel?.();
    };

    document.getElementById('advancedJsonToggle').onclick = () => {
      document.getElementById('advancedJsonWrap').classList.toggle('hidden');
    };

    document.getElementById('saveSectionContentBtn').onclick = async () => {
      const status = document.getElementById('sectionContentStatus');
      status.className = 'status';
      try {
        let payload;
        if (!document.getElementById('advancedJsonWrap').classList.contains('hidden')) {
          payload = JSON.parse(document.getElementById('sectionContentJson').value);
        } else {
          payload = collectForm(form, content);
        }
        await onSave(payload);
        status.textContent = 'Content saved. Refresh the public site to see changes.';
      } catch (e) {
        status.className = 'status error';
        status.textContent = e.message || 'Could not save content.';
      }
    };
  }

  return { open, collectForm, renderObject };
})();
