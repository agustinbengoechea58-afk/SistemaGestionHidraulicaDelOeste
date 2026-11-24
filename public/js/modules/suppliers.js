/**
 * Módulo de Proveedores
 */
let suppliersList = [];

async function loadSuppliers(search = '') {
  const tbody = document.getElementById('suppliers-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 2rem;"><span class="spinner"></span> Cargando proveedores...</td></tr>`;

  try {
    const res = await API.get('/api/suppliers', { search });
    if (res.success) {
      suppliersList = res.data;
      renderSuppliersTable(suppliersList);
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger" style="padding: 2rem;">Error: ${err.message}</td></tr>`;
  }
}

function renderSuppliersTable(suppliers) {
  const tbody = document.getElementById('suppliers-table-body');
  if (!tbody) return;

  if (suppliers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 2.5rem;">No se encontraron proveedores registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = suppliers.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td>${s.contactPerson || '<span class="text-dim">-</span>'}</td>
      <td><a href="tel:${s.phone}" class="text-gold">${s.phone || 'N/A'}</a></td>
      <td>${s.email || '<span class="text-dim">-</span>'}</td>
      <td><span class="badge badge-gold">${s.category || 'General'}</span></td>
      <td class="text-right">
        <div style="display: inline-flex; gap: 0.35rem;">
          <button class="btn btn-outline btn-sm" onclick="openEditSupplierModal('${s.id}')"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
          <button class="btn btn-secondary btn-sm" onclick="deleteSupplier('${s.id}', '${s.name}')" style="color: var(--color-danger);"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openCreateSupplierModal() {
  document.getElementById('supplier-form').reset();
  document.getElementById('supplier-id').value = '';
  document.getElementById('supplier-modal-title').textContent = 'Nuevo Proveedor';
  document.getElementById('supplier-modal').classList.add('active');
}

function openEditSupplierModal(id) {
  const s = suppliersList.find(x => x.id === id);
  if (!s) return;

  document.getElementById('supplier-id').value = s.id;
  document.getElementById('supplier-name').value = s.name || '';
  document.getElementById('supplier-contact').value = s.contactPerson || '';
  document.getElementById('supplier-phone').value = s.phone || '';
  document.getElementById('supplier-email').value = s.email || '';
  document.getElementById('supplier-category').value = s.category || 'Repuestos Hidráulicos';
  document.getElementById('supplier-address').value = s.address || '';
  document.getElementById('supplier-notes').value = s.notes || '';

  document.getElementById('supplier-modal-title').textContent = 'Editar Proveedor';
  document.getElementById('supplier-modal').classList.add('active');
}

async function saveSupplier(e) {
  e.preventDefault();
  const id = document.getElementById('supplier-id').value;
  const payload = {
    name: document.getElementById('supplier-name').value.trim(),
    contactPerson: document.getElementById('supplier-contact').value.trim(),
    phone: document.getElementById('supplier-phone').value.trim(),
    email: document.getElementById('supplier-email').value.trim(),
    category: document.getElementById('supplier-category').value,
    address: document.getElementById('supplier-address').value.trim(),
    notes: document.getElementById('supplier-notes').value.trim()
  };

  try {
    let res;
    if (id) {
      res = await API.put(`/api/suppliers/${id}`, payload);
    } else {
      res = await API.post('/api/suppliers', payload);
    }

    if (res.success) {
      Toast.success(res.message);
      document.getElementById('supplier-modal').classList.remove('active');
      loadSuppliers();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

async function deleteSupplier(id, name) {
  if (!confirm(`¿Eliminar proveedor "${name}"?`)) return;
  try {
    const res = await API.delete(`/api/suppliers/${id}`);
    if (res.success) {
      Toast.success(res.message);
      loadSuppliers();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('suppliers-table-body')) {
    loadSuppliers();

    const search = document.getElementById('search-suppliers');
    if (search) {
      let t;
      search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => loadSuppliers(search.value), 300);
      });
    }

    const form = document.getElementById('supplier-form');
    if (form) form.addEventListener('submit', saveSupplier);
  }
});

