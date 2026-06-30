/* ═══════════════════════════════════════════════════════════
   TWARESH FINANCIAL SERVICES & CONSULTS LTD
   Application Logic — app.js
   Navigation · Currency Converter · UI interactions
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── CONSTANTS ── */
  var USD_TO_UGX = 3662; // indicative rate shown in dashboard

  /* ════════════════════════════════════
     NAVIGATION
     ════════════════════════════════════ */
  function showPage(id) {
    /* hide all pages */
    document.querySelectorAll('.page').forEach(function (p) {
      p.classList.remove('active');
    });
    /* deactivate all nav items */
    document.querySelectorAll('.nav-item').forEach(function (n) {
      n.classList.remove('active');
    });
    /* show requested page */
    var target = document.getElementById('page-' + id);
    if (target) target.classList.add('active');

    /* mark matching nav item active */
    document.querySelectorAll('.nav-item').forEach(function (n) {
      var onclick = n.getAttribute('onclick') || '';
      if (onclick.indexOf("'" + id + "'") !== -1) {
        n.classList.add('active');
      }
    });
  }

  /* Expose globally so inline onclick="" attributes work */
  window.showPage = showPage;

  /* ════════════════════════════════════
     CURRENCY CONVERTER
     ════════════════════════════════════ */
  function getUsdInput() {
    return document.getElementById('usd-input');
  }
  function getUgxOutput() {
    return document.getElementById('ugx-output');
  }

  function convertCurrency() {
    var input  = getUsdInput();
    var output = getUgxOutput();
    if (!input || !output) return;

    var usd = parseFloat(input.value) || 0;
    var ugx = Math.round(usd * USD_TO_UGX);
    output.textContent = ugx.toLocaleString();
  }

  function swapCurrency() {
    var input  = getUsdInput();
    var output = getUgxOutput();
    if (!input || !output) return;

    /* convert current USD value → UGX and put that in the input field */
    var usd = parseFloat(input.value) || 0;
    input.value = Math.round(usd * USD_TO_UGX);
    convertCurrency();
  }

  /* Expose for inline handlers */
  window.convertCurrency = convertCurrency;
  window.swapCurrency    = swapCurrency;

  /* ════════════════════════════════════
     DOWNLOAD REPORT (stub)
     ════════════════════════════════════ */
  function initDownloadButton() {
    var btn = document.querySelector('.btn-download');
    if (!btn) return;
    btn.addEventListener('click', function () {
      alert('Report generation coming soon.\nYour wealth concierge can provide a detailed PDF report.');
    });
  }

  /* ════════════════════════════════════
     SCHEDULE A CALL (stub)
     ════════════════════════════════════ */
  function initScheduleButtons() {
    document.querySelectorAll('.btn-schedule').forEach(function (btn) {
      btn.addEventListener('click', function () {
        alert('Scheduling link coming soon.\nContact your dedicated Private Wealth Concierge directly.');
      });
    });
  }

  /* ════════════════════════════════════
     LIVE-DOT PULSE (already via CSS)
     — Refresh the ugx output on load
     ════════════════════════════════════ */
  function initConverter() {
    var input = getUsdInput();
    if (input) {
      input.addEventListener('input', convertCurrency);
      convertCurrency(); /* set initial display value */
    }
  }

  /* ════════════════════════════════════
     BOOT
     ════════════════════════════════════ */
  function init() {
    initConverter();
    initDownloadButton();
    initScheduleButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
