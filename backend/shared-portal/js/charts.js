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
          hoverOffset: 4,
        }],
      },
      options: {
        cutout: '72%',
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
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
      center.innerHTML = `${centerText || ''}${centerSub ? `<small>${centerSub}</small>` : ''}`;
    }
  }

  function line(canvasId, labels, values, color) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    const c = color || '#7c3aed';
    instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: c,
          backgroundColor: c + '22',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2.5,
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
          y: { display: false },
        },
        maintainAspectRatio: false,
      },
    });
  }

  function sparkline(canvasId, values, color) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    const c = color || '#7c3aed';
    instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: values.map((_, i) => i),
        datasets: [{
          data: values,
          borderColor: c,
          backgroundColor: 'transparent',
          tension: 0.4,
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

  return { destroy, donut, line, sparkline };
})();
