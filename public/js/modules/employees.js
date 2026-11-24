/**
 * Módulo de Empleados y Equipo Técnico
 */
let employeesList = [];

async function loadEmployees() {
  const tbody = document.getElementById('employees-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 2rem;"><span class="spinner"></span> Cargando empleados...</td></tr>`;

  try {
    const res = await API.get('/api/employees');
    if (res.success) {
      employeesList = res.data;
      renderEmployeesTable(employeesList);
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger" style="padding: 2rem;">Error: ${err.message}</td></tr>`;
  }
}

function renderEmployeesTable(employees) {
  const tbody = document.getElementById('employees-table-body');
  if (!tbody) return;

  if (employees.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2.5rem;">No se encontraron empleados.</td></tr>`;
    return;
  }

  tbody.innerHTML = employees.map(e => `
    <tr>
      <td><strong>${e.name}</strong></td>
      <td>${e.email}</td>
      <td>${e.phone || '<span class="text-dim">-</span>'}</td>
      <td><span class="badge badge-gold">${e.role}</span></td>
      <td>${e.specialty || 'General'}</td>
      <td>
        <span class="badge ${e.active ? 'badge-success' : 'badge-danger'}">
          ${e.active ? 'ACTIVO' : 'INACTIVO'}
        </span>
      </td>
      <td class="text-right">
        <div style="display: inline-flex; gap: 0.35rem;">
          <button class="btn btn-outline btn-sm" onclick="openEditEmployeeModal('${e.id}')"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
          <button class="btn btn-secondary btn-sm" onclick="toggleEmployeeStatus('${e.id}', ${e.active})" title="Activar/Desactivar">
            ${e.active ? 'Bloquear' : 'Habilitar'}
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openCreateEmployeeModal() {
  document.getElementById('employee-form').reset();
  document.getElementById('employee-id').value = '';
  document.getElementById('employee-modal-title').textContent = 'Nuevo Empleado / Técnico';
  document.getElementById('employee-modal').classList.add('active');
}

function openEditEmployeeModal(id) {
  const emp = employeesList.find(e => e.id === id);
  if (!emp) return;

  document.getElementById('employee-id').value = emp.id;
  document.getElementById('employee-name').value = emp.name || '';
  document.getElementById('employee-email').value = emp.email || '';
  document.getElementById('employee-email').disabled = true; // No modificar email en edición
  document.getElementById('employee-phone').value = emp.phone || '';
  document.getElementById('employee-role').value = emp.role || 'TECNICO';
  document.getElementById('employee-specialty').value = emp.specialty || '';
  document.getElementById('employee-password').value = '';
  document.getElementById('employee-password').placeholder = 'Dejar en blanco para mantener actual';

  document.getElementById('employee-modal-title').textContent = 'Editar Empleado';
  document.getElementById('employee-modal').classList.add('active');
}

async function saveEmployee(e) {
  e.preventDefault();
  const id = document.getElementById('employee-id').value;
  const payload = {
    name: document.getElementById('employee-name').value.trim(),
    email: document.getElementById('employee-email').value.trim(),
    phone: document.getElementById('employee-phone').value.trim(),
    role: document.getElementById('employee-role').value,
    specialty: document.getElementById('employee-specialty').value.trim()
  };

  const pwd = document.getElementById('employee-password').value.trim();
  if (pwd) payload.password = pwd;

  try {
    let res;
    if (id) {
      res = await API.put(`/api/employees/${id}`, payload);
    } else {
      res = await API.post('/api/employees', payload);
    }

    if (res.success) {
      Toast.success(res.message);
      document.getElementById('employee-modal').classList.remove('active');
      loadEmployees();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

async function toggleEmployeeStatus(id, currentStatus) {
  const newStatus = !currentStatus;
  const verb = newStatus ? 'habilitar' : 'bloquear el acceso de';
  if (!confirm(`¿Confirma que desea ${verb} este usuario?`)) return;

  try {
    const res = await API.put(`/api/employees/${id}`, { active: newStatus });
    if (res.success) {
      Toast.success(res.message);
      loadEmployees();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('employees-table-body')) {
    loadEmployees();

    const form = document.getElementById('employee-form');
    if (form) form.addEventListener('submit', saveEmployee);
  }
});

