/**
 * Módulo de Inventario de Repuestos y Materiales
 */
let inventoryList = [];
let currentItemId = null;

async function loadInventory() {
  const tbody = document.getElementById('inventory-table-body');
  if (!tbody) return;

  const category = document.getElementById('filter-inventory-cat') ? document.getElementById('filter-inventory-cat').value : '';
  const lowStock = document.getElementById('filter-inventory-low') ? document.getElementById('filter-inventory-low').checked : false;
  const search = document.getElementById('search-inventory') ? document.getElementById('search-inventory').value : '';

  tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 2rem;"><span class="spinner"></span> Cargando inventario...</td></tr>`;

  try {
    const res = await API.get('/api/inventory', { category, lowStock, search });
    if (res.success) {
      inventoryList = res.data;
      renderInventoryTable(inventoryList);
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger" style="padding: 2rem;">Error: ${err.message}</td></tr>`;
  }
}

function renderInventoryTable(items) {
  const tbody = document.getElementById('inventory-table-body');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 2.5rem;">No se encontraron repuestos registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(i => {
    const isCritical = Number(i.stock || 0) <= Number(i.minStock || 0);
    return `
      <tr style="${isCritical ? 'background-color: rgba(235, 87, 87, 0.06);' : ''}">
        <td><strong>${i.code}</strong></td>
        <td>
          <div style="font-weight: 600;">${i.name}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${i.description || ''}</div>
        </td>
        <td><span class="badge badge-gold">${i.category}</span></td>
        <td>
          <span class="badge ${isCritical ? 'badge-danger' : 'badge-success'}">
            ${i.stock} u.
          </span>
          <span style="font-size: 0.72rem; color: var(--text-muted); margin-left: 4px;">(Mín: ${i.minStock})</span>
        </td>
        <td>$ ${Number(i.cost || 0).toLocaleString('es-AR')}</td>
        <td><strong>$ ${Number(i.salePrice || 0).toLocaleString('es-AR')}</strong></td>
        <td>${i.location || '<span class="text-dim">N/A</span>'}</td>
        <td class="text-right">
          <div style="display: inline-flex; gap: 0.35rem;">
            <button class="btn btn-secondary btn-sm" onclick="openMovementModal('${i.id}')" title="Registrar Entrada/Salida"><i class="fa-solid fa-boxes-stacked" aria-hidden="true"></i> Movimiento</button>
            <button class="btn btn-outline btn-sm" onclick="openEditItemModal('${i.id}')" title="Editar"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openCreateItemModal() {
  currentItemId = null;
  document.getElementById('item-form').reset();
  document.getElementById('item-id').value = '';
  document.getElementById('item-modal-title').textContent = 'Nuevo Repuesto / Material';
  document.getElementById('item-modal').classList.add('active');
}

function openEditItemModal(id) {
  const item = inventoryList.find(i => i.id === id);
  if (!item) return;

  currentItemId = id;
  document.getElementById('item-id').value = item.id;
  document.getElementById('item-code').value = item.code || '';
  document.getElementById('item-name').value = item.name || '';
  document.getElementById('item-category').value = item.category || 'Retenes';
  document.getElementById('item-cost').value = item.cost || 0;
  document.getElementById('item-salePrice').value = item.salePrice || 0;
  document.getElementById('item-stock').value = item.stock || 0;
  document.getElementById('item-stock').disabled = true; // El stock se modifica por movimientos
  document.getElementById('item-minStock').value = item.minStock || 2;
  document.getElementById('item-location').value = item.location || '';
  document.getElementById('item-description').value = item.description || '';

  document.getElementById('item-modal-title').textContent = 'Editar Repuesto';
  document.getElementById('item-modal').classList.add('active');
}

async function saveItem(e) {
  e.preventDefault();
  const id = document.getElementById('item-id').value;
  const payload = {
    code: document.getElementById('item-code').value.trim(),
    name: document.getElementById('item-name').value.trim(),
    category: document.getElementById('item-category').value,
    cost: document.getElementById('item-cost').value,
    salePrice: document.getElementById('item-salePrice').value,
    stock: document.getElementById('item-stock').value,
    minStock: document.getElementById('item-minStock').value,
    location: document.getElementById('item-location').value.trim(),
    description: document.getElementById('item-description').value.trim()
  };

  try {
    let res;
    if (id) {
      res = await API.put(`/api/inventory/${id}`, payload);
    } else {
      res = await API.post('/api/inventory', payload);
    }

    if (res.success) {
      Toast.success(res.message);
      document.getElementById('item-modal').classList.remove('active');
      loadInventory();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

function openMovementModal(id) {
  const item = inventoryList.find(i => i.id === id);
  if (!item) return;

  currentItemId = id;
  document.getElementById('movement-item-name').textContent = `${item.name} (${item.code})`;
  document.getElementById('movement-current-stock').textContent = `${item.stock} unidades`;
  document.getElementById('movement-form').reset();
  document.getElementById('movement-modal').classList.add('active');
}

async function saveMovement(e) {
  e.preventDefault();
  if (!currentItemId) return;

  const payload = {
    type: document.getElementById('movement-type').value,
    quantity: document.getElementById('movement-quantity').value,
    reason: document.getElementById('movement-reason').value.trim()
  };

  try {
    const res = await API.post(`/api/inventory/${currentItemId}/movement`, payload);
    if (res.success) {
      Toast.success(res.message);
      document.getElementById('movement-modal').classList.remove('active');
      loadInventory();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('inventory-table-body')) {
    loadInventory();

    const search = document.getElementById('search-inventory');
    if (search) {
      let t;
      search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(loadInventory, 300);
      });
    }

    const filterCat = document.getElementById('filter-inventory-cat');
    if (filterCat) filterCat.addEventListener('change', loadInventory);

    const filterLow = document.getElementById('filter-inventory-low');
    if (filterLow) filterLow.addEventListener('change', loadInventory);

    const itemForm = document.getElementById('item-form');
    if (itemForm) itemForm.addEventListener('submit', saveItem);

    const movementForm = document.getElementById('movement-form');
    if (movementForm) movementForm.addEventListener('submit', saveMovement);
  }
});

