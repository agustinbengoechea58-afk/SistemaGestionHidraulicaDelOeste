/**
 * Módulo de Presupuestos de Reparación
 * Cálculo dinámico de ítems, totales, generación de PDF y compartir por WhatsApp
 */
let budgetsList = [];
let clientsCache = [];
let repairsCache = [];
let currentBudgetId = null;
let currentItems = [];

async function loadBudgets() {
  const tbody = document.getElementById('budgets-table-body');
  if (!tbody) return;

  const status = document.getElementById('filter-budget-status') ? document.getElementById('filter-budget-status').value : '';
  const search = document.getElementById('search-budgets') ? document.getElementById('search-budgets').value : '';

  tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 2rem;"><span class="spinner"></span> Cargando presupuestos...</td></tr>`;

  try {
    const res = await API.get('/api/budgets', { status, search });
    if (res.success) {
      budgetsList = res.data;
      renderBudgetsTable(budgetsList);
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger" style="padding: 2rem;">Error: ${err.message}</td></tr>`;
  }
}

function renderBudgetsTable(budgets) {
  const tbody = document.getElementById('budgets-table-body');
  if (!tbody) return;

  if (budgets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 2.5rem;">No se encontraron presupuestos emitidos.</td></tr>`;
    return;
  }

  tbody.innerHTML = budgets.map(b => {
    let statusClass = 'badge-gold';
    if (b.status === 'Aprobado') statusClass = 'badge-success';
    else if (b.status === 'Rechazado' || b.status === 'Anulado') statusClass = 'badge-danger';

    return `
      <tr>
        <td><strong>${b.number}</strong></td>
        <td>
          <div style="font-weight: 600;">${b.clientName}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${b.clientPhone}</div>
        </td>
        <td>${b.componentType}</td>
        <td><strong>$ ${Number(b.total || 0).toLocaleString('es-AR')}</strong></td>
        <td><span class="badge ${statusClass}">${b.status}</span></td>
        <td>${new Date(b.issueDate || b.createdAt).toLocaleDateString('es-AR')}</td>
        <td class="text-right">
          <div style="display: inline-flex; gap: 0.35rem;">
            <a href="/api/budgets/${b.id}/pdf" target="_blank" class="btn btn-outline btn-sm" title="Descargar PDF"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i> PDF</a>
            <button class="btn btn-whatsapp btn-sm" onclick="shareBudgetWhatsApp('${b.id}')" title="Compartir WhatsApp"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> WhatsApp</button>
            <button class="btn btn-secondary btn-sm" onclick="openBudgetStatusModal('${b.id}')" title="Cambiar Estado"><i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i></button>
            <button class="btn btn-secondary btn-sm" onclick="duplicateBudget('${b.id}')" title="Duplicar"><i class="fa-solid fa-copy" aria-hidden="true"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadAuxiliaryData() {
  try {
    const [clientsRes, repairsRes] = await Promise.all([
      API.get('/api/clients'),
      API.get('/api/repairs')
    ]);
    if (clientsRes.success) clientsCache = clientsRes.data;
    if (repairsRes.success) repairsCache = repairsRes.data;

    const clientSelect = document.getElementById('budget-clientId');
    if (clientSelect) {
      clientSelect.innerHTML = '<option value="">-- Seleccionar Cliente --</option>' + 
        clientsCache.map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('');
    }

    const repairSelect = document.getElementById('budget-repairId');
    if (repairSelect) {
      repairSelect.innerHTML = '<option value="">-- Vincular con Orden de Trabajo (Opcional) --</option>' + 
        repairsCache.map(r => `<option value="${r.id}">${r.orderNumber} - ${r.componentType} (${r.clientName})</option>`).join('');
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Modal Crear / Editar Presupuesto
 */
function openCreateBudgetModal() {
  currentBudgetId = null;
  document.getElementById('budget-form').reset();
  document.getElementById('budget-id').value = '';
  document.getElementById('budget-modal-title').textContent = 'Nuevo Presupuesto Técnico';

  // Ítems iniciales por defecto
  currentItems = [
    { description: 'Diagnóstico en banco de pruebas de alta presión', quantity: 1, unitPrice: 25000, subtotal: 25000 },
    { description: 'Mano de obra especializada desarme, maquinado y armado', quantity: 1, unitPrice: 65000, subtotal: 65000 }
  ];

  renderItemsTable();
  recalculateBudget();
  document.getElementById('budget-modal').classList.add('active');
}

function addItemRow() {
  currentItems.push({
    description: '',
    quantity: 1,
    unitPrice: 0,
    subtotal: 0
  });
  renderItemsTable();
}

function removeItemRow(index) {
  if (currentItems.length <= 1) {
    Toast.warning('El presupuesto debe contener al menos un ítem.');
    return;
  }
  currentItems.splice(index, 1);
  renderItemsTable();
  recalculateBudget();
}

function renderItemsTable() {
  const container = document.getElementById('budget-items-container');
  if (!container) return;

  container.innerHTML = currentItems.map((item, index) => `
    <div style="display: grid; grid-template-columns: 3fr 1fr 1.5fr 1.5fr 40px; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
      <input type="text" class="form-control form-control-sm" placeholder="Descripción del trabajo o repuesto" value="${item.description}" oninput="updateItemField(${index}, 'description', this.value)">
      <input type="number" class="form-control form-control-sm text-center" min="1" value="${item.quantity}" oninput="updateItemField(${index}, 'quantity', this.value)">
      <input type="number" class="form-control form-control-sm text-right" min="0" step="100" value="${item.unitPrice}" oninput="updateItemField(${index}, 'unitPrice', this.value)">
      <div style="font-weight: 600; text-align: right; color: var(--gold-bright); font-size: 0.9rem;">
        $ ${(item.subtotal || 0).toLocaleString('es-AR')}
      </div>
      <button type="button" class="btn btn-secondary btn-sm" onclick="removeItemRow(${index})" style="color: var(--color-danger); padding: 0.3rem 0.5rem;">&times;</button>
    </div>
  `).join('');
}

window.updateItemField = function(index, field, value) {
  if (field === 'description') {
    currentItems[index].description = value;
  } else if (field === 'quantity') {
    currentItems[index].quantity = Math.max(1, Number(value) || 1);
    currentItems[index].subtotal = currentItems[index].quantity * (currentItems[index].unitPrice || 0);
  } else if (field === 'unitPrice') {
    currentItems[index].unitPrice = Math.max(0, Number(value) || 0);
    currentItems[index].subtotal = (currentItems[index].quantity || 1) * currentItems[index].unitPrice;
  }
  renderItemsTable();
  recalculateBudget();
};

function recalculateBudget() {
  let subtotal = 0;
  currentItems.forEach(i => subtotal += (Number(i.subtotal) || 0));

  const discount = Math.max(0, Number(document.getElementById('budget-discount').value) || 0);
  const taxPercent = Math.max(0, Number(document.getElementById('budget-taxPercent').value) || 0);

  const taxableBase = Math.max(0, subtotal - discount);
  const taxAmount = (taxableBase * taxPercent) / 100;
  const total = taxableBase + taxAmount;

  document.getElementById('budget-subtotal-disp').textContent = `$ ${subtotal.toLocaleString('es-AR')}`;
  document.getElementById('budget-total-disp').textContent = `$ ${total.toLocaleString('es-AR')}`;
}

async function saveBudget(e) {
  e.preventDefault();
  const clientId = document.getElementById('budget-clientId').value;
  if (!clientId) {
    Toast.error('Debe seleccionar un cliente.');
    return;
  }

  const payload = {
    clientId,
    repairId: document.getElementById('budget-repairId').value,
    componentType: document.getElementById('budget-componentType').value.trim(),
    brand: document.getElementById('budget-brand').value.trim(),
    model: document.getElementById('budget-model').value.trim(),
    validDays: document.getElementById('budget-validDays').value,
    discount: document.getElementById('budget-discount').value,
    taxPercent: document.getElementById('budget-taxPercent').value,
    notes: document.getElementById('budget-notes').value.trim(),
    items: currentItems
  };

  try {
    let res;
    if (currentBudgetId) {
      res = await API.put(`/api/budgets/${currentBudgetId}`, payload);
    } else {
      res = await API.post('/api/budgets', payload);
    }

    if (res.success) {
      Toast.success(res.message);
      document.getElementById('budget-modal').classList.remove('active');
      loadBudgets();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

async function duplicateBudget(id) {
  if (!confirm('¿Desea crear una copia de este presupuesto?')) return;
  try {
    const res = await API.post(`/api/budgets/${id}/duplicate`, {});
    if (res.success) {
      Toast.success(res.message);
      loadBudgets();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

function openBudgetStatusModal(id) {
  currentBudgetId = id;
  const b = budgetsList.find(x => x.id === id);
  if (!b) return;

  document.getElementById('budget-status-title').textContent = `Presupuesto ${b.number}`;
  document.getElementById('budget-status-select').value = b.status;
  document.getElementById('budget-status-modal').classList.add('active');
}

async function saveBudgetStatus(e) {
  e.preventDefault();
  if (!currentBudgetId) return;

  const status = document.getElementById('budget-status-select').value;
  try {
    const res = await API.post(`/api/budgets/${currentBudgetId}/status`, { status });
    if (res.success) {
      Toast.success(res.message);
      document.getElementById('budget-status-modal').classList.remove('active');
      loadBudgets();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

async function shareBudgetWhatsApp(id) {
  try {
    const res = await API.get(`/api/budgets/${id}/whatsapp-link`);
    if (res.success && res.url) {
      window.open(res.url, '_blank');
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('budgets-table-body')) {
    loadAuxiliaryData();
    loadBudgets();

    const search = document.getElementById('search-budgets');
    if (search) {
      let t;
      search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(loadBudgets, 300);
      });
    }

    const filterStatus = document.getElementById('filter-budget-status');
    if (filterStatus) filterStatus.addEventListener('change', loadBudgets);

    const form = document.getElementById('budget-form');
    if (form) form.addEventListener('submit', saveBudget);

    const discountInput = document.getElementById('budget-discount');
    if (discountInput) discountInput.addEventListener('input', recalculateBudget);

    const taxInput = document.getElementById('budget-taxPercent');
    if (taxInput) taxInput.addEventListener('input', recalculateBudget);

    const statusForm = document.getElementById('budget-status-form');
    if (statusForm) statusForm.addEventListener('submit', saveBudgetStatus);
  }
});

