/* ═══════════════════════════════════════════════════════════
   TWARESH FINANCIAL SERVICES & CONSULTS LTD
   Chart Initialisation — charts.js
   Requires Chart.js v4 loaded before this file.
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── DONUT — Asset Allocation ── */
  function initDonut() {
    const ctx = document.getElementById('donutChart');
    if (!ctx) return;

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [
          'Bitcoin (BTC)', 'Ethereum (ETH)', 'Solana (SOL)',
          'US Equities',   'Gold (XAU)',      'Cash & Others'
        ],
        datasets: [{
          data: [72.4, 12.6, 6.8, 4.1, 2.1, 2.0],
          backgroundColor: [
            '#f59e0b', '#3b82f6', '#10b981',
            '#8b5cf6', '#f97316', '#94a3b8'
          ],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed}%`
            }
          }
        },
        animation: { animateRotate: true, duration: 900 }
      }
    });
  }

  /* ── LINE — Portfolio Performance ── */
  function initPerformance() {
    const ctx = document.getElementById('perfChart');
    if (!ctx) return;

    const grad = ctx.getContext('2d').createLinearGradient(0, 0, 0, 160);
    grad.addColorStop(0, 'rgba(59,130,246,0.18)');
    grad.addColorStop(1, 'rgba(59,130,246,0)');

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          data: [218000, 310000, 420000, 535000, 650000, 739470],
          borderColor: '#3b82f6',
          backgroundColor: grad,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          tension: 0.45,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ' $' + ctx.parsed.y.toLocaleString()
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 10, family: "'Inter'" },
              color: '#8294b4'
            }
          },
          y: {
            grid: { color: '#e2e8f0', lineWidth: 1 },
            border: { display: false },
            ticks: {
              font: { size: 10, family: "'JetBrains Mono'" },
              color: '#8294b4',
              callback: v =>
                v >= 1000000
                  ? '$' + (v / 1000000).toFixed(1) + 'M'
                  : '$' + (v / 1000).toFixed(0) + 'K'
            }
          }
        }
      }
    });
  }

  /* Boot both charts once the DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initDonut();
      initPerformance();
    });
  } else {
    initDonut();
    initPerformance();
  }
})();
