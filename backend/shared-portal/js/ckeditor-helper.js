window.CKE = (() => {
  const instances = new Map();

  const RICH_FIELD_KEYS = new Set([
    'lead', 'footnote', 'note', 'subheadline', 'disclaimer', 'form_note', 'form_sub',
    'geo_foot', 'quote_html', 'closing_html', 'text', 'summary', 'description', 'body',
    'admin_notes', 'html_content',
  ]);

  function isRichField(key) {
    if (!key) return false;
    if (key.endsWith('_html') || key.endsWith('Html')) return true;
    return RICH_FIELD_KEYS.has(key);
  }

  // Plugins included in CKEditor 5 Classic build (CDN classic/ckeditor.js).
  // Do not use super-build — it loads collaboration plugins that require a channelId.
  const toolbar = [
    'heading', '|', 'bold', 'italic', 'link', '|',
    'bulletedList', 'numberedList', '|', 'blockQuote', '|', 'undo', 'redo',
  ];

  async function init(el) {
    if (!el || instances.has(el)) return instances.get(el);
    if (!window.ClassicEditor) {
      console.warn('CKEditor ClassicEditor not loaded');
      return null;
    }
    const editor = await ClassicEditor.create(el, { toolbar });
    instances.set(el, editor);
    return editor;
  }

  async function initIn(container) {
    if (!container) return;
    const els = container.querySelectorAll('textarea[data-ckeditor]');
    await Promise.all([...els].map(el => init(el)));
  }

  function destroyIn(container) {
    if (!container) return;
    container.querySelectorAll('textarea[data-ckeditor]').forEach(el => {
      const editor = instances.get(el);
      if (editor) {
        editor.destroy().catch(() => {});
        instances.delete(el);
      }
    });
  }

  function getValue(el) {
    const editor = instances.get(el);
    if (editor) return editor.getData();
    return el?.value || '';
  }

  function stripHtml(html) {
    const d = document.createElement('div');
    d.innerHTML = html || '';
    return d.textContent.replace(/\s+/g, ' ').trim();
  }

  function textareaValue(html) {
    return String(html ?? '').replace(/&/g, '&amp;').replace(/<\/textarea/gi, '&lt;/textarea');
  }

  return { isRichField, init, initIn, destroyIn, getValue, stripHtml, textareaValue };
})();
