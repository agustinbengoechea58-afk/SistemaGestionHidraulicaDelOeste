/**
 * Módulo de Reparaciones y Órdenes de Trabajo (OT)
 * 11 estados, historial, fotografías, repuestos y trazabilidad
 */
let repairsList = [];
let clientsCache = [];
let employeesCache = [];
let inventoryCache = [];
let currentRepairId = null;

async function loadRepairs() {
  const tbody = document.getElementById('repairs-table-body');
  if (!tbody) return;

  const status = document.getElementById('filter-repair-status') ? document.getElementById('filter-repair-status').value : '';
  const search = document.getElementById('search-repairs') ? document.getElementById('search-repairs').value : '';

  tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 2rem;"><span class="spinner"></span> Cargando órdenes de trabajo...</td></tr>`;

  try {
    const res = await API.get('/api/repairs', { status, search });
    if (res.success) {
      repairsList = res.data;
      renderRepairsTable(repairsList);
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger" style="padding: 2rem;">Error: ${err.message}</td></tr>`;
  }
}

function renderRepairsTable(repairs) {
  const tbody = document.getElementById('repairs-table-body');
  if (!tbody) return;

  if (repairs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 2.5rem;">No se encontraron órdenes de trabajo.</td></tr>`;
    return;
  }

  tbody.innerHTML = repairs.map(r => {
    let statusClass = 'badge-gold';
    if (['Reparado', 'Listo para entregar', 'Entregado'].includes(r.status)) statusClass = 'badge-success';
    else if (['Esperando repuestos', 'Esperando aprobación'].includes(r.status)) statusClass = 'badge-warning';
    else if (r.status === 'Cancelado') statusClass = 'badge-danger';

    return `
      <tr>
        <td><strong>${r.orderNumber}</strong></td>
        <td>
          <div style="font-weight: 600;">${r.clientName}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${r.clientPhone}</div>
        </td>
        <td>
          <div>${r.componentType}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${r.brand || ''} ${r.model || ''}</div>
        </td>
        <td><span class="badge ${statusClass}">${r.status}</span></td>
        <td>${r.technicianName || 'Sin asignar'}</td>
        <td>${new Date(r.receivedDate || r.createdAt).toLocaleDateString('es-AR')}</td>
        <td>
          <a href="/seguimiento.html?code=${r.trackingCode || r.orderNumber}" target="_blank" class="text-gold" style="font-family: monospace; font-size: 0.85rem;" title="Abrir portal de seguimiento">
            ${r.trackingCode} <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
          </a>
        </td>
        <td class="text-right">
          <div style="display: inline-flex; gap: 0.35rem;">
            <button class="btn btn-secondary btn-sm" onclick="openStatusModal('${r.id}')" title="Cambiar Estado"><i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i> Estado</button>
            <button class="btn btn-secondary btn-sm" onclick="openPartsModal('${r.id}')" title="Asignar Repuesto"><i class="fa-solid fa-screwdriver-wrench" aria-hidden="true"></i> Repuestos</button>
            <button class="btn btn-secondary btn-sm" onclick="openPhotosModal('${r.id}')" title="Fotos"><i class="fa-solid fa-camera" aria-hidden="true"></i> Fotos</button>
            <button class="btn btn-outline btn-sm" onclick="openEditRepairModal('${r.id}')" title="Editar"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Cargar select de Clientes, Técnicos e Inventario para los Modales
 */
async function loadAuxiliaryData() {
  try {
    const [clientsRes, empsRes, invRes] = await Promise.all([
      API.get('/api/clients'),
      API.get('/api/employees'),
      API.get('/api/inventory')
    ]);

    if (clientsRes.success) clientsCache = clientsRes.data;
    if (empsRes.success) employeesCache = empsRes.data;
    if (invRes.success) inventoryCache = invRes.data;

    populateSelects();
  } catch (e) {
    console.error('Error cargando datos auxiliares:', e);
  }
}

function populateSelects() {
  const clientSelect = document.getElementById('repair-clientId');
  if (clientSelect) {
    clientSelect.innerHTML = '<option value="">-- Seleccionar Cliente --</option>' + 
      clientsCache.map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('');
  }

  const techSelect = document.getElementById('repair-technicianId');
  if (techSelect) {
    techSelect.innerHTML = '<option value="">-- Asignar Técnico --</option>' + 
      employeesCache.map(e => `<option value="${e.id}">${e.name} (${e.role})</option>`).join('');
  }

  const partSelect = document.getElementById('part-inventoryId');
  if (partSelect) {
    partSelect.innerHTML = '<option value="">-- Seleccionar de Inventario (Opcional) --</option>' + 
      inventoryCache.map(i => `<option value="${i.id}">${i.name} (Disp: ${i.stock} | Cód: ${i.code})</option>`).join('');
  }
}

/**
 * Modal Crear / Editar Orden
 */
function openCreateRepairModal() {
  currentRepairId = null;
  document.getElementById('repair-form').reset();
  document.getElementById('repair-id').value = '';
  document.getElementById('repair-modal-title').textContent = 'Nueva Orden de Trabajo (OT)';
  document.getElementById('repair-modal').classList.add('active');
}

function openEditRepairModal(id) {
  const repair = repairsList.find(r => r.id === id);
  if (!repair) return;

  currentRepairId = id;
  document.getElementById('repair-id').value = repair.id;
  document.getElementById('repair-clientId').value = repair.clientId || '';
  document.getElementById('repair-componentType').value = repair.componentType || 'Bomba Hidráulica';
  document.getElementById('repair-brand').value = repair.brand || '';
  document.getElementById('repair-model').value = repair.model || '';
  document.getElementById('repair-serialNumber').value = repair.serialNumber || '';
  document.getElementById('repair-technicianId').value = repair.technicianId || '';
  document.getElementById('repair-estimatedDeliveryDate').value = repair.estimatedDeliveryDate ? repair.estimatedDeliveryDate.slice(0, 10) : '';
  document.getElementById('repair-description').value = repair.description || '';
  document.getElementById('repair-diagnosis').value = repair.diagnosis || '';

  document.getElementById('repair-modal-title').textContent = `Editar Orden ${repair.orderNumber}`;
  document.getElementById('repair-modal').classList.add('active');
}

async function saveRepair(e) {
  e.preventDefault();
  const id = document.getElementById('repair-id').value;
  const techSelect = document.getElementById('repair-technicianId');
  const selectedTechName = techSelect.options[techSelect.selectedIndex] ? techSelect.options[techSelect.selectedIndex].text.split(' (')[0] : '';

  const payload = {
    clientId: document.getElementById('repair-clientId').value,
    componentType: document.getElementById('repair-componentType').value,
    brand: document.getElementById('repair-brand').value.trim(),
    model: document.getElementById('repair-model').value.trim(),
    serialNumber: document.getElementById('repair-serialNumber').value.trim(),
    technicianId: techSelect.value,
    technicianName: selectedTechName,
    estimatedDeliveryDate: document.getElementById('repair-estimatedDeliveryDate').value,
    description: document.getElementById('repair-description').value.trim(),
    diagnosis: document.getElementById('repair-diagnosis').value.trim()
  };

  try {
    let res;
    if (id) {
      res = await API.put(`/api/repairs/${id}`, payload);
    } else {
      res = await API.post('/api/repairs', payload);
    }

    if (res.success) {
      Toast.success(res.message);
      document.getElementById('repair-modal').classList.remove('active');
      loadRepairs();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

/**
 * Modal Cambio de Estado (11 Estados)
 */
function openStatusModal(id) {
  const repair = repairsList.find(r => r.id === id);
  if (!repair) return;

  currentRepairId = id;
  document.getElementById('status-repair-title').textContent = `${repair.orderNumber} - ${repair.componentType}`;
  document.getElementById('status-current').textContent = repair.status;
  document.getElementById('status-new-select').value = repair.status;
  document.getElementById('status-note').value = '';
  document.getElementById('status-public-comment').value = '';

  // Renderizar historial
  const historyContainer = document.getElementById('status-history-list');
  if (historyContainer) {
    historyContainer.innerHTML = (repair.statusHistory || []).map(h => `
      <div style="padding: 0.6rem 0; border-bottom: 1px solid var(--border-color); font-size: 0.85rem;">
        <div style="display: flex; justify-content: space-between;">
          <strong class="text-gold">${h.status}</strong>
          <span class="text-dim">${new Date(h.date).toLocaleString('es-AR')}</span>
        </div>
        <div class="text-white">${h.note || ''}</div>
        <div class="text-dim" style="font-size: 0.75rem;">Por: ${h.user || 'Sistema'}</div>
      </div>
    `).join('');
  }

  document.getElementById('status-modal').classList.add('active');
}

async function saveStatusChange(e) {
  e.preventDefault();
  if (!currentRepairId) return;

  const status = document.getElementById('status-new-select').value;
  const note = document.getElementById('status-note').value.trim();
  const publicComment = document.getElementById('status-public-comment').value.trim();

  try {
    const res = await API.post(`/api/repairs/${currentRepairId}/status`, { status, note, publicComment });
    if (res.success) {
      Toast.success(res.message);
      document.getElementById('status-modal').classList.remove('active');
      loadRepairs();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

/**
 * Modal Asignación de Repuestos a la Reparación
 */
function openPartsModal(id) {
  const repair = repairsList.find(r => r.id === id);
  if (!repair) return;

  currentRepairId = id;
  document.getElementById('parts-repair-title').textContent = `${repair.orderNumber} - Repuestos Utilizados`;
  
  // Renderizar repuestos ya usados
  const partsList = document.getElementById('parts-used-list');
  if (partsList) {
    const items = repair.partsUsed || [];
    if (items.length === 0) {
      partsList.innerHTML = `<div class="text-muted" style="padding: 1rem; text-align: center;">No se han asignado repuestos a esta orden todavía.</div>`;
    } else {
      partsList.innerHTML = items.map(p => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid var(--border-color);">
          <div>
            <div style="font-weight: 600; color: var(--text-white);">${p.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${new Date(p.date).toLocaleDateString('es-AR')}</div>
          </div>
          <div style="text-align: right;">
            <span class="badge badge-gold">${p.quantity} unid.</span>
          </div>
        </div>
      `).join('');
    }
  }

  document.getElementById('part-form').reset();
  document.getElementById('parts-modal').classList.add('active');
}

async function savePartUsage(e) {
  e.preventDefault();
  if (!currentRepairId) return;

  const invSelect = document.getElementById('part-inventoryId');
  const inventoryId = invSelect.value;
  const description = document.getElementById('part-description').value.trim();
  const quantity = document.getElementById('part-quantity').value;

  try {
    const res = await API.post(`/api/repairs/${currentRepairId}/parts`, {
      inventoryId,
      description,
      quantity
    });

    if (res.success) {
      Toast.success(res.message);
      document.getElementById('parts-modal').classList.remove('active');
      loadRepairs();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

/**
 * Modal de Subida de Fotografías de la Orden
 */
function openPhotosModal(id) {
  const repair = repairsList.find(r => r.id === id);
  if (!repair) return;

  currentRepairId = id;
  document.getElementById('photos-repair-title').textContent = `Fotos - ${repair.orderNumber}`;

  const gallery = document.getElementById('repair-photos-gallery');
  const allPhotos = [
    ...(repair.receptionPhotos || []).map(p => ({ url: p, phase: 'Recepción' })),
    ...(repair.processPhotos || []).map(p => ({ url: p, phase: 'Proceso' })),
    ...(repair.finalPhotos || []).map(p => ({ url: p, phase: 'Final' }))
  ];

  if (allPhotos.length === 0) {
    gallery.innerHTML = `<div class="text-muted" style="grid-column: 1/-1; padding: 2rem; text-align: center;">No hay fotografías adjuntas a esta orden.</div>`;
  } else {
    gallery.innerHTML = allPhotos.map(p => `
      <div style="position: relative; height: 110px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-color);">
        <img src="${p.url}" alt="" style="width: 100%; height: 100%; object-fit: cover;">
        <span style="position: absolute; bottom: 2px; left: 2px; background: rgba(0,0,0,0.8); color: var(--gold-bright); font-size: 0.65rem; padding: 1px 4px; border-radius: 2px;">${p.phase}</span>
      </div>
    `).join('');
  }

  document.getElementById('photos-modal').classList.add('active');
}

async function uploadRepairPhotos(e) {
  e.preventDefault();
  if (!currentRepairId) return;

  const fileInput = document.getElementById('repair-photo-files');
  const phase = document.getElementById('repair-photo-phase').value;

  if (!fileInput.files || fileInput.files.length === 0) {
    Toast.warning('Seleccione al menos una fotografía.');
    return;
  }

  const formData = new FormData();
  formData.append('phase', phase);
  for (const f of fileInput.files) {
    formData.append('photos', f);
  }

  try {
    const res = await API.upload(`/api/repairs/${currentRepairId}/photos`, formData);
    if (res.success) {
      Toast.success(res.message);
      document.getElementById('photos-modal').classList.remove('active');
      loadRepairs();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('repairs-table-body')) {
    loadAuxiliaryData();
    loadRepairs();

    const search = document.getElementById('search-repairs');
    if (search) {
      let t;
      search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(loadRepairs, 300);
      });
    }

    const filterStatus = document.getElementById('filter-repair-status');
    if (filterStatus) filterStatus.addEventListener('change', loadRepairs);

    const repairForm = document.getElementById('repair-form');
    if (repairForm) repairForm.addEventListener('submit', saveRepair);

    const statusForm = document.getElementById('status-form');
    if (statusForm) statusForm.addEventListener('submit', saveStatusChange);

    const partForm = document.getElementById('part-form');
    if (partForm) partForm.addEventListener('submit', savePartUsage);

    const photoForm = document.getElementById('photo-form');
    if (photoForm) photoForm.addEventListener('submit', uploadRepairPhotos);
  }
});

