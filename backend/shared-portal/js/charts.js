window.TICCharts = (() => {
  const instances = {};

  function destroy(key) {
    if (instances[key]) {
      instances[key].destroy();
      delete instances[key];
    }
  }

  function donut(canvasId, labels, values, colors, centerText, centerSub) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    instances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 6,
        }],
      },
      options: {
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed}`,
            },
          },
        },
        animation: { animateRotate: true, duration: 900 },
        maintainAspectRatio: false,
      },
    });

    const wrap = canvas.closest('.chart-wrap');
    if (wrap) {
      let center = wrap.querySelector('.donut-center');
      if (!center) {
        center = document.createElement('div');
        center.className = 'donut-center';
        wrap.appendChild(center);
      }
      center.innerHTML = `
        <div class="donut-pct">${centerText || ''}</div>
        ${centerSub ? `<div class="donut-label">${centerSub}</div>` : ''}`;
    }
  }

  function line(canvasId, labels, values, color) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    const c = color || '#3b82f6';
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 220);
    grad.addColorStop(0, hexToRgba(c, 0.18));
    grad.addColorStop(1, hexToRgba(c, 0));

    instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: c,
          backgroundColor: grad,
          fill: true,
          tension: 0.45,
          pointRadius: 3,
          pointBackgroundColor: c,
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          borderWidth: 2.5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.y} submission${ctx.parsed.y === 1 ? '' : 's'}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#8294b4', font: { size: 10, family: 'Inter' } },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#e2e8f0', lineWidth: 1 },
            border: { display: false },
            ticks: {
              precision: 0,
              color: '#8294b4',
              font: { size: 10, family: "'JetBrains Mono', monospace" },
            },
          },
        },
      },
    });
  }

  function sparkline(canvasId, values, color) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    const c = color || '#3b82f6';
    instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: values.map((_, i) => i),
        datasets: [{
          data: values,
          borderColor: c,
          backgroundColor: 'transparent',
          tension: 0.45,
          pointRadius: 0,
          borderWidth: 2,
        }],
      },
      options: {
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        maintainAspectRatio: false,
      },
    });
  }

  function hexToRgba(hex, alpha) {
    const raw = String(hex || '#3b82f6').replace('#', '');
    const full = raw.length === 3 ? raw.split('').map(ch => ch + ch).join('') : raw;
    const num = parseInt(full, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return { destroy, donut, line, sparkline };
})();
