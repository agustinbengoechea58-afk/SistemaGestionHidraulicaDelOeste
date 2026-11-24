/**
 * Módulo de Caja y Finanzas
 * Control de ingresos, egresos, cobros y balances
 */
let paymentsList = [];

async function loadPayments() {
  const tbody = document.getElementById('payments-table-body');
  if (!tbody) return;

  const type = document.getElementById('filter-payment-type') ? document.getElementById('filter-payment-type').value : '';
  const category = document.getElementById('filter-payment-cat') ? document.getElementById('filter-payment-cat').value : '';
  const method = document.getElementById('filter-payment-method') ? document.getElementById('filter-payment-method').value : '';
  const startDate = document.getElementById('filter-payment-start') ? document.getElementById('filter-payment-start').value : '';
  const endDate = document.getElementById('filter-payment-end') ? document.getElementById('filter-payment-end').value : '';

  tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 2rem;"><span class="spinner"></span> Cargando movimientos...</td></tr>`;

  try {
    const res = await API.get('/api/payments', { type, category, method, startDate, endDate });
    if (res.success) {
      paymentsList = res.data;
      renderPaymentsTable(paymentsList);

      const s = res.summary || {};
      document.getElementById('finance-total-income').textContent = `$ ${Number(s.totalIncome || 0).toLocaleString('es-AR')}`;
      document.getElementById('finance-total-expense').textContent = `$ ${Number(s.totalExpense || 0).toLocaleString('es-AR')}`;
      
      const net = Number(s.netBalance || 0);
      const netEl = document.getElementById('finance-net-balance');
      netEl.textContent = `$ ${net.toLocaleString('es-AR')}`;
      netEl.style.color = net >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger" style="padding: 2rem;">Error: ${err.message}</td></tr>`;
  }
}

function renderPaymentsTable(movements) {
  const tbody = document.getElementById('payments-table-body');
  if (!tbody) return;

  if (movements.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2.5rem;">No se encontraron movimientos registrados en el período.</td></tr>`;
    return;
  }

  tbody.innerHTML = movements.map(m => {
    const isIncome = m.type === 'ingreso';
    return `
      <tr>
        <td><strong>${m.movementNumber}</strong></td>
        <td>
          <span class="badge ${isIncome ? 'badge-success' : 'badge-danger'}">
            ${isIncome ? '▲ INGRESO' : '▼ EGRESO'}
          </span>
        </td>
        <td>
          <div style="font-weight: 600;">${m.concept}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${m.category} ${m.clientName ? `• Cliente: ${m.clientName}` : ''}</div>
        </td>
        <td><span class="badge badge-gold">${m.method}</span></td>
        <td>
          <strong style="color: ${isIncome ? '#2ECC71' : '#FF6B6B'}; font-size: 1rem;">
            ${isIncome ? '+' : '-'} $ ${Number(m.amount || 0).toLocaleString('es-AR')}
          </strong>
        </td>
        <td>${new Date(m.date).toLocaleDateString('es-AR')}</td>
        <td class="text-right">
          <button class="btn btn-secondary btn-sm" onclick="deleteMovement('${m.id}')" title="Anular Movimiento" style="color: var(--color-danger);"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

function openCreatePaymentModal(defaultType = 'ingreso') {
  document.getElementById('payment-form').reset();
  document.getElementById('payment-type').value = defaultType;
  document.getElementById('payment-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('payment-modal').classList.add('active');
}

async function savePayment(e) {
  e.preventDefault();
  const payload = {
    type: document.getElementById('payment-type').value,
    category: document.getElementById('payment-category').value,
    concept: document.getElementById('payment-concept').value.trim(),
    amount: document.getElementById('payment-amount').value,
    method: document.getElementById('payment-method').value,
    date: document.getElementById('payment-date').value,
    receiptNumber: document.getElementById('payment-receipt').value.trim(),
    notes: document.getElementById('payment-notes').value.trim()
  };

  try {
    const res = await API.post('/api/payments', payload);
    if (res.success) {
      Toast.success(res.message);
      document.getElementById('payment-modal').classList.remove('active');
      loadPayments();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

async function deleteMovement(id) {
  if (!confirm('¿Confirma la anulación de este movimiento contable?')) return;
  try {
    const res = await API.delete(`/api/payments/${id}`);
    if (res.success) {
      Toast.success(res.message);
      loadPayments();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('payments-table-body')) {
    loadPayments();

    const filters = ['filter-payment-type', 'filter-payment-cat', 'filter-payment-method', 'filter-payment-start', 'filter-payment-end'];
    filters.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', loadPayments);
    });

    const form = document.getElementById('payment-form');
    if (form) form.addEventListener('submit', savePayment);
  }
});

