window.TFCharts = (function () {
  'use strict';

  let donutChart = null;
  let perfChart = null;

  function destroy() {
    if (donutChart) {
      donutChart.destroy();
      donutChart = null;
    }
    if (perfChart) {
      perfChart.destroy();
      perfChart = null;
    }
  }

  function init(portfolio) {
    if (typeof Chart === 'undefined') return;
    destroy();

    const allocation = portfolio?.allocation || [];
    const performance = portfolio?.performance || {};

    const donutEl = document.getElementById('donutChart');
    if (donutEl && allocation.length) {
      donutChart = new Chart(donutEl, {
        type: 'doughnut',
        data: {
          labels: allocation.map(a => a.name),
          datasets: [{
            data: allocation.map(a => a.pct),
            backgroundColor: allocation.map(a => a.color || '#94a3b8'),
            borderWidth: 0,
            hoverOffset: 4,
          }],
        },
        options: {
          cutout: '72%',
          plugins: { legend: { display: false } },
          animation: { animateRotate: true, duration: 900 },
        },
      });
    }

    const perfEl = document.getElementById('perfChart');
    const values = performance.values || [];
    const labels = performance.labels || [];
    if (perfEl && values.length) {
      const grad = perfEl.getContext('2d').createLinearGradient(0, 0, 0, 160);
      grad.addColorStop(0, 'rgba(59,130,246,0.18)');
      grad.addColorStop(1, 'rgba(59,130,246,0)');

      perfChart = new Chart(perfEl, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            data: values,
            borderColor: '#3b82f6',
            backgroundColor: grad,
            borderWidth: 2.5,
            pointRadius: 3,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            tension: 0.45,
            fill: true,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ' $' + Number(ctx.parsed.y).toLocaleString(),
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10, family: "'Inter'" }, color: '#8294b4' },
            },
            y: {
              grid: { color: '#e2e8f0', lineWidth: 1 },
              border: { display: false },
              ticks: {
                font: { size: 10, family: "'JetBrains Mono'" },
                color: '#8294b4',
                callback: v => (v >= 1000000 ? '$' + (v / 1000000).toFixed(1) + 'M' : '$' + (v / 1000).toFixed(0) + 'K'),
              },
            },
          },
        },
      });
    }
  }

  return { init, destroy };
})();
