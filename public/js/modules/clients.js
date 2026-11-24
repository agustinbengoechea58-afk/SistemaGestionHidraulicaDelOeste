/**
 * Módulo de Clientes - CRUD, Búsqueda e Historial
 */
let clientsList = [];

async function loadClients(search = '') {
  const tbody = document.getElementById('clients-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 2rem;"><span class="spinner"></span> Cargando clientes...</td></tr>`;

  try {
    const res = await API.get('/api/clients', { search });
    if (res.success) {
      clientsList = res.data;
      renderClientsTable(clientsList);
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger" style="padding: 2rem;">Error: ${err.message}</td></tr>`;
  }
}

function renderClientsTable(clients) {
  const tbody = document.getElementById('clients-table-body');
  if (!tbody) return;

  if (clients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2.5rem;">No se encontraron clientes registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = clients.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.dni || '<span class="text-dim">-</span>'}</td>
      <td><a href="tel:${c.phone}" class="text-gold">${c.phone}</a></td>
      <td>${c.email || '<span class="text-dim">-</span>'}</td>
      <td>${c.city || c.address || '<span class="text-dim">-</span>'}</td>
      <td>${new Date(c.createdAt).toLocaleDateString('es-AR')}</td>
      <td class="text-right">
        <div style="display: inline-flex; gap: 0.4rem;">
          <button class="btn btn-secondary btn-sm" onclick="viewClientHistory('${c.id}')" title="Ver Historial"><i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i> Historial</button>
          <button class="btn btn-outline btn-sm" onclick="openEditClientModal('${c.id}')" title="Editar"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
          <button class="btn btn-secondary btn-sm" onclick="deleteClient('${c.id}', '${c.name}')" title="Eliminar" style="color: var(--color-danger);"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openCreateClientModal() {
  document.getElementById('client-form').reset();
  document.getElementById('client-id').value = '';
  document.getElementById('client-modal-title').textContent = 'Nuevo Cliente';
  document.getElementById('client-modal').classList.add('active');
}

function openEditClientModal(id) {
  const client = clientsList.find(c => c.id === id);
  if (!client) return;

  document.getElementById('client-id').value = client.id;
  document.getElementById('client-name').value = client.name || '';
  document.getElementById('client-dni').value = client.dni || '';
  document.getElementById('client-phone').value = client.phone || '';
  document.getElementById('client-email').value = client.email || '';
  document.getElementById('client-address').value = client.address || '';
  document.getElementById('client-city').value = client.city || '';
  document.getElementById('client-notes').value = client.notes || '';

  document.getElementById('client-modal-title').textContent = 'Editar Cliente';
  document.getElementById('client-modal').classList.add('active');
}

async function saveClient(e) {
  e.preventDefault();
  const id = document.getElementById('client-id').value;
  const payload = {
    name: document.getElementById('client-name').value.trim(),
    dni: document.getElementById('client-dni').value.trim(),
    phone: document.getElementById('client-phone').value.trim(),
    email: document.getElementById('client-email').value.trim(),
    address: document.getElementById('client-address').value.trim(),
    city: document.getElementById('client-city').value.trim(),
    notes: document.getElementById('client-notes').value.trim()
  };

  try {
    let res;
    if (id) {
      res = await API.put(`/api/clients/${id}`, payload);
    } else {
      res = await API.post('/api/clients', payload);
    }

    if (res.success) {
      Toast.success(res.message);
      document.getElementById('client-modal').classList.remove('active');
      loadClients();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

async function deleteClient(id, name) {
  if (!confirm(`¿Está seguro de eliminar al cliente "${name}"? Esta acción no se puede deshacer.`)) return;

  try {
    const res = await API.delete(`/api/clients/${id}`);
    if (res.success) {
      Toast.success('Cliente eliminado correctamente.');
      loadClients();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

async function viewClientHistory(id) {
  const modal = document.getElementById('client-history-modal');
  const body = document.getElementById('client-history-body');
  if (!modal || !body) return;

  body.innerHTML = `<div class="text-center" style="padding: 2rem;"><span class="spinner"></span> Cargando historial...</div>`;
  modal.classList.add('active');

  try {
    const res = await API.get(`/api/clients/${id}`);
    if (res.success && res.data) {
      const c = res.data;
      const h = c.history || {};

      body.innerHTML = `
        <div style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
          <h3 class="text-gold-bright">${c.name}</h3>
          <p class="text-muted">Tel: ${c.phone} | Correo: ${c.email || 'N/A'} | DNI: ${c.dni || 'N/A'}</p>
        </div>

        <h4 class="text-white" style="margin-bottom: 0.75rem;">Órdenes de Trabajo (${(h.repairs || []).length})</h4>
        <div class="table-responsive" style="margin-bottom: 1.5rem;">
          <table class="table">
            <thead>
              <tr><th>OT</th><th>Componente</th><th>Estado</th><th>Fecha</th></tr>
            </thead>
            <tbody>
              ${(h.repairs || []).length === 0 ? '<tr><td colspan="4" class="text-muted">Sin reparaciones registradas.</td></tr>' : 
                h.repairs.map(r => `
                  <tr>
                    <td><strong>${r.orderNumber}</strong></td>
                    <td>${r.componentType} (${r.brand || ''} ${r.model || ''})</td>
                    <td><span class="badge badge-gold">${r.status}</span></td>
                    <td>${new Date(r.receivedDate || r.createdAt).toLocaleDateString('es-AR')}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>

        <h4 class="text-white" style="margin-bottom: 0.75rem;">Presupuestos Realizados (${(h.budgets || []).length})</h4>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr><th>Presupuesto</th><th>Total</th><th>Estado</th><th>Fecha</th></tr>
            </thead>
            <tbody>
              ${(h.budgets || []).length === 0 ? '<tr><td colspan="4" class="text-muted">Sin presupuestos emitidos.</td></tr>' : 
                h.budgets.map(b => `
                  <tr>
                    <td><strong>${b.number}</strong></td>
                    <td>$ ${Number(b.total || 0).toLocaleString('es-AR')}</td>
                    <td><span class="badge badge-gold">${b.status}</span></td>
                    <td>${new Date(b.issueDate || b.createdAt).toLocaleDateString('es-AR')}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      `;
    }
  } catch (err) {
    body.innerHTML = `<div class="text-danger">Error: ${err.message}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('clients-table-body')) {
    loadClients();

    const searchInput = document.getElementById('search-clients');
    if (searchInput) {
      let timeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => loadClients(searchInput.value), 300);
      });
    }

    const form = document.getElementById('client-form');
    if (form) form.addEventListener('submit', saveClient);
  }
});

