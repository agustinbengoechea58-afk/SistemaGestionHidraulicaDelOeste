/**
 * Módulo de Reportes y Exportación CSV
 */
async function loadReports() {
  try {
    const res = await API.get('/api/reports/dashboard');
    if (res.success) {
      renderSummaryCards(res.kpis);
      renderTopComponents(res.charts.topComponents);
    }
  } catch (err) {
    Toast.error('Error cargando reportes: ' + err.message);
  }
}

function renderSummaryCards(k = {}) {
  const currency = '$';
  document.getElementById('rep-income-month').textContent = `${currency} ${Number(k.monthIncome || 0).toLocaleString('es-AR')}`;
  document.getElementById('rep-expense-month').textContent = `${currency} ${Number(k.monthExpense || 0).toLocaleString('es-AR')}`;
  document.getElementById('rep-profit-month').textContent = `${currency} ${Number(k.monthProfit || 0).toLocaleString('es-AR')}`;
  document.getElementById('rep-active-repairs').textContent = k.activeRepairsCount || 0;
  document.getElementById('rep-finished-repairs').textContent = k.finishedRepairsCount || 0;
  document.getElementById('rep-pending-collections').textContent = `${currency} ${Number(k.pendingCollections || 0).toLocaleString('es-AR')}`;
}

function renderTopComponents(list = []) {
  const container = document.getElementById('top-components-list');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<div class="text-muted" style="padding: 1rem;">Sin datos suficientes aún.</div>`;
    return;
  }

  container.innerHTML = list.map(c => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid var(--border-color);">
      <span class="text-white" style="font-weight: 600;">${c.name}</span>
      <span class="badge badge-gold">${c.count} reparaciones</span>
    </div>
  `).join('');
}

function exportCsv(type) {
  const start = document.getElementById('rep-start-date') ? document.getElementById('rep-start-date').value : '';
  const end = document.getElementById('rep-end-date') ? document.getElementById('rep-end-date').value : '';

  const params = new URLSearchParams({ type, startDate: start, endDate: end }).toString();
  window.location.href = `/api/reports/export/csv?${params}`;
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('rep-income-month')) {
    loadReports();
  }
});

