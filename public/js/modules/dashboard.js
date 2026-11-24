/**
 * Módulo del Dashboard Administrativo
 * Métricas en tiempo real, Gráficos Chart.js y Alertas de Taller
 */
let revenueChart = null;
let statusChart = null;

async function loadDashboard() {
  try {
    const res = await API.get('/api/reports/dashboard');
    if (res.success) {
      renderKPIs(res.kpis);
      renderCharts(res.charts);
      renderStockAlerts(res.stockAlerts);
      renderOverdueRepairs(res.overdueRepairs);
      renderLatestRepairs(res.latestRepairs);
    }
  } catch (err) {
    Toast.error('Error al cargar datos del dashboard: ' + err.message);
  }
}

function renderKPIs(kpis = {}) {
  // Clientes y Solicitudes
  setText('kpi-clients', kpis.totalClients || 0);
  setText('kpi-new-quotes', kpis.newQuotesCount || 0);
  setText('kpi-active-repairs', kpis.activeRepairsCount || 0);
  setText('kpi-finished-repairs', kpis.finishedRepairsCount || 0);
  setText('kpi-pending-budgets', kpis.pendingBudgetsCount || 0);

  // Finanzas del Mes
  const currency = '$';
  setText('kpi-month-income', `${currency} ${Number(kpis.monthIncome || 0).toLocaleString('es-AR')}`);
  setText('kpi-month-expense', `${currency} ${Number(kpis.monthExpense || 0).toLocaleString('es-AR')}`);
  setText('kpi-pending-collections', `${currency} ${Number(kpis.pendingCollections || 0).toLocaleString('es-AR')}`);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderCharts(charts = {}) {
  // 1. Gráfico de Facturación Mensual (Bar Chart)
  const revCtx = document.getElementById('revenueChart');
  if (revCtx && typeof Chart !== 'undefined') {
    const months = (charts.monthlyRevenue || []).map(m => m.month);
    const data = (charts.monthlyRevenue || []).map(m => m.income);

    if (revenueChart) revenueChart.destroy();

    revenueChart = new Chart(revCtx, {
      type: 'bar',
      data: {
        labels: months.length ? months : ['Mes Actual'],
        datasets: [{
          label: 'Ingresos Cobrados ($)',
          data: data.length ? data : [0],
          backgroundColor: 'rgba(212, 175, 55, 0.75)',
          borderColor: '#D4AF37',
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#A5A5A5' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#A5A5A5' }
          }
        }
      }
    });
  }

  // 2. Gráfico de Reparaciones por Estado (Doughnut Chart)
  const statusCtx = document.getElementById('statusChart');
  if (statusCtx && typeof Chart !== 'undefined') {
    const rawStatus = charts.statusCounts || {};
    const labels = Object.keys(rawStatus);
    const data = Object.values(rawStatus);

    if (statusChart) statusChart.destroy();

    statusChart = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            '#2F80ED', '#9B51E0', '#F2C94C', '#27AE60',
            '#E67E22', '#D4AF37', '#56CCF2', '#219653',
            '#6FCF97', '#333333'
          ],
          borderWidth: 2,
          borderColor: '#141414'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, color: '#A5A5A5', font: { size: 11 } }
          }
        }
      }
    });
  }
}

function renderStockAlerts(alerts = []) {
  const container = document.getElementById('dashboard-stock-alerts');
  if (!container) return;

  if (alerts.length === 0) {
    container.innerHTML = `<div class="text-muted" style="font-size: 0.85rem; padding: 1rem; text-align: center;">Todos los repuestos se encuentran sobre el stock mínimo.</div>`;
    return;
  }

  container.innerHTML = alerts.map(item => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
      <div>
        <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-white);">${item.name}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">Cód: ${item.code} | Ubic: ${item.location || 'General'}</div>
      </div>
      <div style="text-align: right;">
        <span class="badge badge-danger">Stock: ${item.stock}</span>
        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">Mín: ${item.minStock}</div>
      </div>
    </div>
  `).join('');
}

function renderOverdueRepairs(repairs = []) {
  const container = document.getElementById('dashboard-overdue-repairs');
  if (!container) return;

  if (repairs.length === 0) {
    container.innerHTML = `<div class="text-muted" style="font-size: 0.85rem; padding: 1rem; text-align: center;">No hay órdenes atrasadas actualmente.</div>`;
    return;
  }

  container.innerHTML = repairs.map(r => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
      <div>
        <div style="font-size: 0.88rem; font-weight: 600; color: var(--gold-bright);">${r.orderNumber} - ${r.clientName}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${r.componentType} (${r.brand || ''} ${r.model || ''})</div>
      </div>
      <div style="text-align: right;">
        <span class="badge badge-warning">${r.status}</span>
        <div style="font-size: 0.72rem; color: var(--color-danger); margin-top: 0.2rem;">Venció: ${new Date(r.estimatedDeliveryDate).toLocaleDateString('es-AR')}</div>
      </div>
    </div>
  `).join('');
}

function renderLatestRepairs(repairs = []) {
  const tbody = document.getElementById('dashboard-latest-repairs');
  if (!tbody) return;

  if (repairs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 2rem;">No hay órdenes de trabajo recientes.</td></tr>`;
    return;
  }

  tbody.innerHTML = repairs.map(r => `
    <tr>
      <td><strong>${r.orderNumber}</strong></td>
      <td>${r.clientName}</td>
      <td>${r.componentType}</td>
      <td><span class="badge badge-gold">${r.status}</span></td>
      <td>${r.technicianName || 'Sin asignar'}</td>
      <td class="text-right">
        <a href="/admin/reparaciones.html?id=${r.id}" class="btn btn-outline btn-sm">Ver OT</a>
      </td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('revenueChart')) {
    loadDashboard();
  }
});

