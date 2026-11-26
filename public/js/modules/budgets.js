/**
 * Módulo de Presupuestos y Solicitudes Web
 * Gestión de consultas online recibidas de clientes y emisión de cotizaciones formales
 */
let inquiriesList = [];
let budgetsList = [];
let clientsCache = [];
let repairsCache = [];
let currentBudgetId = null;
let currentItems = [];
let activeTab = 'inquiries';

/**
 * 1. Pestañas de Navegación
 */
function switchBudgetTab(tab) {
  activeTab = tab;
  const tabInquiries = document.getElementById('tab-btn-inquiries');
  const tabFormal = document.getElementById('tab-btn-formal');
  const secInquiries = document.getElementById('section-inquiries');
  const secFormal = document.getElementById('section-formal');

  if (tab === 'inquiries') {
    if (tabInquiries) tabInquiries.classList.add('active');
    if (tabFormal) tabFormal.classList.remove('active');
    if (secInquiries) secInquiries.style.display = 'block';
    if (secFormal) secFormal.style.display = 'none';
    loadInquiries();
  } else {
    if (tabFormal) tabFormal.classList.add('active');
    if (tabInquiries) tabInquiries.classList.remove('active');
    if (secFormal) secFormal.style.display = 'block';
    if (secInquiries) secInquiries.style.display = 'none';
    loadBudgets();
  }
}

/**
 * 2. Cargar Solicitudes Web Recibidas
 */
async function loadInquiries() {
  const tbody = document.getElementById('inquiries-table-body');
  if (!tbody) return;

  const status = document.getElementById('filter-inquiry-status') ? document.getElementById('filter-inquiry-status').value : '';
  const search = document.getElementById('search-inquiries') ? document.getElementById('search-inquiries').value : '';

  tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 2.5rem;"><span class="spinner"></span> Cargando consultas web desde la base de datos...</td></tr>`;

  try {
    const res = await API.get('/api/budgets/inquiries', { status, search });
    if (res.success) {
      inquiriesList = res.data;
      renderInquiriesTable(inquiriesList);

      // Actualizar badge de nuevas consultas
      const newCount = inquiriesList.filter(q => q.status === 'Nueva consulta' || q.status === 'Nueva solicitud').length;
      const badge = document.getElementById('quotes-badge');
      if (badge) {
        badge.textContent = newCount;
        badge.className = newCount > 0 ? 'badge badge-gold pulse-gold' : 'badge badge-secondary';
      }
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger" style="padding: 2.5rem;">Error al cargar solicitudes: ${err.message}</td></tr>`;
  }
}

function renderInquiriesTable(inquiries) {
  const tbody = document.getElementById('inquiries-table-body');
  if (!tbody) return;

  if (inquiries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 3rem;">No se encontraron solicitudes web registradas.</td></tr>`;
    return;
  }

  tbody.innerHTML = inquiries.map(q => {
    let statusClass = 'badge-gold';
    if (q.status === 'Aprobada' || q.status === 'Aprobado') statusClass = 'badge-success';
    else if (q.status === 'En revisión') statusClass = 'badge-warning';
    else if (q.status === 'Presupuestado') statusClass = 'badge-cyan';
    else if (q.status === 'Rechazada' || q.status === 'Rechazado') statusClass = 'badge-danger';

    const cleanPhone = (q.phone || '').replace(/\D/g, '');
    const vehicleText = [q.brand, q.model].filter(Boolean).join(' ') || (q.vehicle ? [q.vehicle.brand, q.vehicle.model].filter(Boolean).join(' ') : 'Vehículo no especificado');
    const repairTypeText = q.repairType || q.componentType || 'Bomba / Cremallera';
    const photos = Array.isArray(q.photos) ? q.photos : [];

    const photosHtml = photos.length > 0 ? `
      <div class="photo-thumb-grid">
        ${photos.slice(0, 3).map(p => `
          <div class="photo-thumb-item" onclick="openInquiryPhoto('${p}')" title="Ver foto en tamaño completo">
            <img src="${p}" alt="Foto" loading="lazy">
          </div>
        `).join('')}
        ${photos.length > 3 ? `<span style="font-size: 0.75rem; color: var(--gold-bright); align-self: center;">+${photos.length - 3}</span>` : ''}
      </div>
    ` : '<span class="text-muted" style="font-size: 0.78rem;">Sin fotos</span>';

    return `
      <tr>
        <td>
          <strong class="text-gold-bright" style="font-family: monospace; font-size: 0.95rem;">${q.inquiryNumber || q.trackingCode || 'SIN CÓDIGO'}</strong>
        </td>
        <td>
          <div style="font-weight: 600;">${q.name}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${q.email || ''}</div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span>${q.phone}</span>
            ${cleanPhone ? `
              <a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent('Hola ' + q.name + ', te contactamos de Hidraulica del oeste A.B respecto a tu consulta ' + (q.inquiryNumber || q.trackingCode || '') + '.')}" target="_blank" class="btn btn-whatsapp btn-sm" style="padding: 0.2rem 0.45rem; font-size: 0.75rem;" title="Chatear por WhatsApp">
                <i class="fa-brands fa-whatsapp"></i>
              </a>
            ` : ''}
          </div>
        </td>
        <td>
          <div style="font-weight: 600; color: var(--text-white);">${repairTypeText}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${vehicleText}</div>
          <div style="font-size: 0.78rem; color: #a5a5a5; max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${q.description || ''}">
            ${q.description || ''}
          </div>
        </td>
        <td>${photosHtml}</td>
        <td>
          <div style="font-size: 0.82rem;">${new Date(q.createdAt).toLocaleDateString('es-AR')}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${new Date(q.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
        </td>
        <td><span class="badge ${statusClass}">${q.status}</span></td>
        <td class="text-right">
          <div style="display: inline-flex; gap: 0.35rem;">
            <button class="btn btn-primary btn-sm" onclick="quoteInquiry('${q.id}')" title="Crear Presupuesto Formal con estos datos">
              <i class="fa-solid fa-file-circle-plus" aria-hidden="true"></i> Cotizar
            </button>
            <button class="btn btn-secondary btn-sm" onclick="openInquiryDetails('${q.id}')" title="Ver Detalle Técnico">
              <i class="fa-solid fa-eye" aria-hidden="true"></i>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="openInquiryStatusModal('${q.id}', '${q.status}')" title="Cambiar Estado">
              <i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="deleteInquiry('${q.id}')" style="color: var(--color-danger);" title="Eliminar Consulta">
              <i class="fa-solid fa-trash" aria-hidden="true"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * 3. Detalle Completo de Solicitud Web
 */
window.openInquiryDetails = async function(id) {
  try {
    const res = await API.get(`/api/budgets/inquiries/${id}`);
    if (!res.success || !res.data) throw new Error(res.error || 'No se encontró la consulta');
    const q = res.data;

    const modalBody = document.getElementById('inquiry-detail-content');
    const modalFooter = document.getElementById('inquiry-detail-footer');

    const cleanPhone = (q.phone || '').replace(/\D/g, '');
    const vehicle = q.vehicle || {};
    const photos = Array.isArray(q.photos) ? q.photos : [];

    modalBody.innerHTML = `
      <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
          <div>
            <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Código de Seguimiento</span>
            <div style="font-size: 1.4rem; font-weight: 700; color: var(--gold-bright);">${q.inquiryNumber || q.trackingCode}</div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Estado Actual</span>
            <div><span class="badge badge-gold" style="font-size: 0.88rem;">${q.status}</span></div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
          <div>
            <div class="text-muted" style="font-size: 0.78rem;">CLIENTE</div>
            <strong style="color: var(--text-white);">${q.name}</strong>
            <div style="color: var(--gold-bright);">${q.phone}</div>
            <div style="color: var(--text-muted); font-size: 0.82rem;">${q.email || 'Sin email'}</div>
          </div>
          <div>
            <div class="text-muted" style="font-size: 0.78rem;">VEHÍCULO / COMPONENTE</div>
            <strong style="color: var(--text-white);">${q.repairType || q.componentType}</strong>
            <div>${[q.brand, q.model].filter(Boolean).join(' ') || [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ')}</div>
            <div style="color: var(--text-muted); font-size: 0.82rem;">Recibido: ${new Date(q.createdAt).toLocaleString('es-AR')}</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.92rem; color: var(--gold-bright); margin-bottom: 0.4rem;">Descripción del Problema Técnico:</h4>
        <div style="background: var(--bg-dark-gray); border-radius: var(--radius-sm); padding: 0.85rem; font-size: 0.9rem; line-height: 1.5; color: var(--text-white); white-space: pre-wrap;">
          ${q.description || 'Sin descripción detallada proporcionada.'}
        </div>
      </div>

      ${photos.length > 0 ? `
        <div style="margin-bottom: 1.25rem;">
          <h4 style="font-size: 0.92rem; color: var(--gold-bright); margin-bottom: 0.5rem;">Fotografías Enviadas por el Cliente (${photos.length}):</h4>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            ${photos.map(p => `
              <div style="width: 110px; height: 110px; border-radius: var(--radius-md); overflow: hidden; border: 1.5px solid var(--gold-primary); cursor: pointer;" onclick="openInquiryPhoto('${p}')">
                <img src="${p}" alt="Foto" style="width: 100%; height: 100%; object-fit: cover;">
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${q.pricingEstimate && q.pricingEstimate.total ? `
        <div style="background: rgba(212, 175, 55, 0.1); border: 1px dashed var(--gold-primary); border-radius: var(--radius-md); padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Estimación Automática Base:</span>
            <div style="font-weight: 700; color: var(--gold-bright); font-size: 1.1rem;">$ ${Number(q.pricingEstimate.total).toLocaleString('es-AR')}</div>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); text-align: right;">
            Mano de obra: $ ${Number(q.pricingEstimate.baseLabor || 0).toLocaleString('es-AR')}
          </div>
        </div>
      ` : ''}
    `;

    modalFooter.innerHTML = `
      ${cleanPhone ? `
        <a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent('Hola ' + q.name + ', te contactamos de Hidraulica del oeste A.B respecto a tu consulta ' + (q.inquiryNumber || q.trackingCode) + '.')}" target="_blank" class="btn btn-whatsapp btn-sm">
          <i class="fa-brands fa-whatsapp"></i> WhatsApp
        </a>
      ` : ''}
      <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('inquiry-detail-modal').classList.remove('active'); quoteInquiry('${q.id}')">
        <i class="fa-solid fa-file-circle-plus"></i> Cotizar Presupuesto
      </button>
      <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('inquiry-detail-modal').classList.remove('active')">
        Cerrar
      </button>
    `;

    document.getElementById('inquiry-detail-modal').classList.add('active');
  } catch (err) {
    Toast.error(err.message);
  }
};

/**
 * 4. Convertir Solicitud Web a Presupuesto Formal
 */
window.quoteInquiry = async function(id) {
  try {
    const res = await API.post(`/api/budgets/inquiries/${id}/convert`, {});
    if (!res.success) throw new Error(res.error || 'Error al procesar la solicitud');

    const client = res.client;
    const inquiry = res.inquiry;

    // Recargar auxiliares si no están
    await loadAuxiliaryData();

    // Abrir modal de presupuesto
    openCreateBudgetModal();

    // Prellenar datos
    document.getElementById('budget-inquiryId').value = inquiry.id;
    const clientSelect = document.getElementById('budget-clientId');
    if (clientSelect) clientSelect.value = client.id;

    document.getElementById('budget-componentType').value = inquiry.repairType || inquiry.componentType || 'Bomba / Cremallera Hidráulica';
    document.getElementById('budget-brand').value = inquiry.brand || (inquiry.vehicle && inquiry.vehicle.brand) || '';
    document.getElementById('budget-model').value = inquiry.model || (inquiry.vehicle && inquiry.vehicle.model) || '';
    document.getElementById('budget-notes').value = `Solicitud Web ${inquiry.inquiryNumber || inquiry.trackingCode}: ${inquiry.description || ''}`;

    Toast.success('Cliente vinculado. Complete los ítems para emitir el presupuesto formal.');
  } catch (err) {
    Toast.error(err.message);
  }
};

/**
 * 5. Cambiar Estado de Solicitud Web
 */
window.openInquiryStatusModal = function(id, currentStatus) {
  document.getElementById('inquiry-status-id').value = id;
  const select = document.getElementById('inquiry-status-select');
  if (select && currentStatus) select.value = currentStatus;
  document.getElementById('inquiry-status-modal').classList.add('active');
};

async function saveInquiryStatus(e) {
  e.preventDefault();
  const id = document.getElementById('inquiry-status-id').value;
  const status = document.getElementById('inquiry-status-select').value;
  const notes = document.getElementById('inquiry-status-notes').value;

  try {
    const res = await API.put(`/api/budgets/inquiries/${id}/status`, { status, notes });
    if (res.success) {
      Toast.success('Estado actualizado correctamente.');
      document.getElementById('inquiry-status-modal').classList.remove('active');
      loadInquiries();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

/**
 * 6. Eliminar Solicitud Web
 */
window.deleteInquiry = async function(id) {
  if (!confirm('¿Confirma que desea eliminar esta solicitud web?')) return;
  try {
    const res = await API.delete(`/api/budgets/inquiries/${id}`);
    if (res.success) {
      Toast.success('Solicitud eliminada con éxito.');
      loadInquiries();
    }
  } catch (err) {
    Toast.error(err.message);
  }
};

/**
 * 7. Abrir Foto en Tamaño Completo
 */
window.openInquiryPhoto = function(url) {
  const modal = document.getElementById('inquiry-photo-modal');
  const img = document.getElementById('inquiry-photo-img');
  if (modal && img) {
    img.src = url;
    modal.classList.add('active');
  }
};

/**
 * =========================================================================
 * 8. Presupuestos Formales Emitidos (Taller)
 * =========================================================================
 */
async function loadBudgets() {
  const tbody = document.getElementById('budgets-table-body');
  if (!tbody) return;

  const status = document.getElementById('filter-budget-status') ? document.getElementById('filter-budget-status').value : '';
  const search = document.getElementById('search-budgets') ? document.getElementById('search-budgets').value : '';

  tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 2.5rem;"><span class="spinner"></span> Cargando presupuestos emitidos...</td></tr>`;

  try {
    const res = await API.get('/api/budgets', { status, search });
    if (res.success) {
      budgetsList = res.data;
      renderBudgetsTable(budgetsList);

      const formalBadge = document.getElementById('formal-budgets-badge');
      if (formalBadge) formalBadge.textContent = budgetsList.length;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger" style="padding: 2.5rem;">Error: ${err.message}</td></tr>`;
  }
}

function renderBudgetsTable(budgets) {
  const tbody = document.getElementById('budgets-table-body');
  if (!tbody) return;

  if (budgets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 3rem;">No se encontraron presupuestos emitidos.</td></tr>`;
    return;
  }

  tbody.innerHTML = budgets.map(b => {
    let statusClass = 'badge-gold';
    if (b.status === 'Aprobado') statusClass = 'badge-success';
    else if (b.status === 'Rechazado' || b.status === 'Anulado') statusClass = 'badge-danger';

    return `
      <tr>
        <td><strong class="text-gold-bright">${b.number}</strong></td>
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
            <a href="/api/budgets/${b.id}/pdf" target="_blank" class="btn btn-outline btn-sm" title="Descargar PDF">
              <i class="fa-solid fa-file-pdf" aria-hidden="true"></i> PDF
            </a>
            <button class="btn btn-whatsapp btn-sm" onclick="shareBudgetWhatsApp('${b.id}')" title="Compartir WhatsApp">
              <i class="fa-brands fa-whatsapp" aria-hidden="true"></i> WhatsApp
            </button>
            <button class="btn btn-secondary btn-sm" onclick="openBudgetStatusModal('${b.id}')" title="Cambiar Estado">
              <i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="duplicateBudget('${b.id}')" title="Duplicar Presupuesto">
              <i class="fa-solid fa-copy" aria-hidden="true"></i>
            </button>
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
      repairSelect.innerHTML = '<option value="">-- Ninguna (Presupuesto previo) --</option>' + 
        repairsCache.map(r => `<option value="${r.id}">${r.orderNumber} - ${r.componentType} (${r.clientName})</option>`).join('');
    }
  } catch (e) {
    console.error('Error cargando datos auxiliares:', e);
  }
}

/**
 * 9. Modal Crear / Editar Presupuesto Formal
 */
window.openCreateBudgetModal = function() {
  currentBudgetId = null;
  document.getElementById('budget-form').reset();
  document.getElementById('budget-id').value = '';
  document.getElementById('budget-inquiryId').value = '';
  document.getElementById('budget-modal-title').textContent = 'Nuevo Presupuesto Técnico';

  currentItems = [
    { description: 'Diagnóstico en banco de pruebas de alta presión', quantity: 1, unitPrice: 25000, subtotal: 25000 },
    { description: 'Mano de obra especializada desarme, maquinado y armado', quantity: 1, unitPrice: 65000, subtotal: 65000 }
  ];

  renderItemsTable();
  recalculateBudget();
  document.getElementById('budget-modal').classList.add('active');
};

window.addItemRow = function() {
  currentItems.push({
    description: '',
    quantity: 1,
    unitPrice: 0,
    subtotal: 0
  });
  renderItemsTable();
};

window.removeItemRow = function(index) {
  if (currentItems.length <= 1) {
    Toast.warning('El presupuesto debe contener al menos un ítem.');
    return;
  }
  currentItems.splice(index, 1);
  renderItemsTable();
  recalculateBudget();
};

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
  if (field === 'quantity') {
    currentItems[index].quantity = Number(value) || 1;
  } else if (field === 'unitPrice') {
    currentItems[index].unitPrice = Number(value) || 0;
  } else {
    currentItems[index][field] = value;
  }
  currentItems[index].subtotal = currentItems[index].quantity * currentItems[index].unitPrice;
  renderItemsTable();
  recalculateBudget();
};

function recalculateBudget() {
  const subtotal = currentItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const discount = Number(document.getElementById('budget-discount').value) || 0;
  const taxPercent = Number(document.getElementById('budget-taxPercent').value) || 0;

  const base = Math.max(0, subtotal - discount);
  const tax = Math.round((base * taxPercent) / 100);
  const total = base + tax;

  document.getElementById('summary-subtotal').textContent = `$ ${subtotal.toLocaleString('es-AR')}`;
  document.getElementById('summary-discount').textContent = `- $ ${discount.toLocaleString('es-AR')}`;
  document.getElementById('summary-tax').textContent = `$ ${tax.toLocaleString('es-AR')}`;
  document.getElementById('summary-total').textContent = `$ ${total.toLocaleString('es-AR')}`;
}

async function saveBudget(e) {
  e.preventDefault();
  const subtotal = currentItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const discount = Number(document.getElementById('budget-discount').value) || 0;
  const taxPercent = Number(document.getElementById('budget-taxPercent').value) || 0;
  const base = Math.max(0, subtotal - discount);
  const taxAmount = Math.round((base * taxPercent) / 100);
  const total = base + taxAmount;

  const clientId = document.getElementById('budget-clientId').value;
  if (!clientId) {
    Toast.error('Por favor seleccione un cliente.');
    return;
  }

  const payload = {
    clientId,
    repairId: document.getElementById('budget-repairId').value || '',
    componentType: document.getElementById('budget-componentType').value.trim(),
    brand: document.getElementById('budget-brand').value.trim(),
    model: document.getElementById('budget-model').value.trim(),
    items: currentItems,
    subtotal,
    discount,
    taxPercent,
    taxAmount,
    total,
    validityDays: document.getElementById('budget-validityDays').value.trim(),
    warranty: document.getElementById('budget-warranty').value.trim(),
    notes: document.getElementById('budget-notes').value.trim()
  };

  try {
    const res = await API.post('/api/budgets', payload);
    if (res.success) {
      Toast.success('Presupuesto técnico generado exitosamente.');
      document.getElementById('budget-modal').classList.remove('active');

      // Si venía de una consulta web, actualizar estado
      const inquiryId = document.getElementById('budget-inquiryId').value;
      if (inquiryId) {
        await API.put(`/api/budgets/inquiries/${inquiryId}/status`, {
          status: 'Presupuestado',
          notes: `Presupuesto ${res.data ? res.data.number : ''} emitido por $ ${total.toLocaleString('es-AR')}`
        }).catch(() => {});
      }

      loadBudgets();
      loadInquiries();
    }
  } catch (err) {
    Toast.error(err.message || 'Error al emitir el presupuesto.');
  }
}

window.openBudgetStatusModal = function(id) {
  currentBudgetId = id;
  const budget = budgetsList.find(b => b.id === id);
  if (budget) {
    document.getElementById('budget-status-select').value = budget.status;
    document.getElementById('budget-status-title').textContent = `Estado Presupuesto ${budget.number}`;
  }
  document.getElementById('budget-status-modal').classList.add('active');
};

async function saveBudgetStatus(e) {
  e.preventDefault();
  if (!currentBudgetId) return;
  const status = document.getElementById('budget-status-select').value;

  try {
    const res = await API.put(`/api/budgets/${currentBudgetId}/status`, { status });
    if (res.success) {
      Toast.success(res.message);
      document.getElementById('budget-status-modal').classList.remove('active');
      loadBudgets();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

window.shareBudgetWhatsApp = async function(id) {
  try {
    const res = await API.get(`/api/budgets/${id}/whatsapp-link`);
    if (res.success && res.url) {
      window.open(res.url, '_blank');
    }
  } catch (err) {
    Toast.error(err.message);
  }
};

window.duplicateBudget = async function(id) {
  const b = budgetsList.find(x => x.id === id);
  if (!b) return;

  openCreateBudgetModal();
  document.getElementById('budget-clientId').value = b.clientId || '';
  document.getElementById('budget-componentType').value = b.componentType || '';
  document.getElementById('budget-brand').value = b.brand || '';
  document.getElementById('budget-model').value = b.model || '';
  document.getElementById('budget-discount').value = b.discount || 0;
  document.getElementById('budget-taxPercent').value = b.taxPercent || 0;
  document.getElementById('budget-validityDays').value = b.validityDays || '15 días corridos';
  document.getElementById('budget-warranty').value = b.warranty || '6 meses';
  document.getElementById('budget-notes').value = b.notes ? `Copia: ${b.notes}` : '';

  if (Array.isArray(b.items) && b.items.length > 0) {
    currentItems = JSON.parse(JSON.stringify(b.items));
  }
  renderItemsTable();
  recalculateBudget();
  Toast.info(`Datos copiados del presupuesto ${b.number}`);
};

/**
 * 10. Inicialización
 */
document.addEventListener('DOMContentLoaded', () => {
  loadAuxiliaryData();

  // Soporte para navegación directa por hash (#inquiries o #formal)
  const hash = window.location.hash;
  if (hash === '#formal') {
    switchBudgetTab('formal');
  } else {
    switchBudgetTab('inquiries');
  }

  // Búsqueda en Solicitudes Web
  const searchInq = document.getElementById('search-inquiries');
  if (searchInq) {
    let t;
    searchInq.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(loadInquiries, 300);
    });
  }

  const filterInq = document.getElementById('filter-inquiry-status');
  if (filterInq) filterInq.addEventListener('change', loadInquiries);

  // Búsqueda en Presupuestos Formales
  const searchBudgets = document.getElementById('search-budgets');
  if (searchBudgets) {
    let t;
    searchBudgets.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(loadBudgets, 300);
    });
  }

  const filterBudgets = document.getElementById('filter-budget-status');
  if (filterBudgets) filterBudgets.addEventListener('change', loadBudgets);

  // Formularios
  const budgetForm = document.getElementById('budget-form');
  if (budgetForm) budgetForm.addEventListener('submit', saveBudget);

  const statusForm = document.getElementById('budget-status-form');
  if (statusForm) statusForm.addEventListener('submit', saveBudgetStatus);

  const inquiryStatusForm = document.getElementById('inquiry-status-form');
  if (inquiryStatusForm) inquiryStatusForm.addEventListener('submit', saveInquiryStatus);

  const discountInput = document.getElementById('budget-discount');
  if (discountInput) discountInput.addEventListener('input', recalculateBudget);

  const taxInput = document.getElementById('budget-taxPercent');
  if (taxInput) taxInput.addEventListener('input', recalculateBudget);
});
