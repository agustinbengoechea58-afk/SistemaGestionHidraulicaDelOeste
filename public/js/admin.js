/**
 * Controlador Principal del Panel de Administración (Admin Shell)
 */
document.addEventListener('DOMContentLoaded', () => {
  // Verificar autenticación previa antes de renderizar
  if (!Auth.requireAuth()) return;

  initAdminUser();
  initSidebar();
  initNotifications();
  highlightActiveLink();

  // Actualizar nombre de la empresa en el panel admin desde la configuración/env
  if (typeof API !== 'undefined') {
    API.get('/api/public/config').then(res => {
      if (res && res.success && res.data && res.data.name) {
        document.querySelectorAll('.sidebar-brand-name').forEach(el => el.textContent = res.data.name.split(' ')[0] || res.data.name);
      }
    }).catch(() => {});
  }
});

/**
 * 1. Inicializar Usuario en el Header
 */
function initAdminUser() {
  const user = Auth.getUser();
  if (!user) return;

  const nameEl = document.getElementById('admin-user-name');
  const roleEl = document.getElementById('admin-user-role');
  const avatarEl = document.getElementById('admin-user-avatar');

  if (nameEl) nameEl.textContent = user.name || user.email;
  if (roleEl) roleEl.textContent = user.role || 'ADMIN';
  if (avatarEl) {
    const initials = (user.name || user.email || 'A').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    avatarEl.textContent = initials;
  }

  // Ocultar módulos restringidos según rol
  applyRoleVisibility(user.role);
}

function applyRoleVisibility(role) {
  // Configuración de restricciones según el rol
  if (role === 'TECNICO') {
    document.querySelectorAll('.role-admin-only, .role-finance-only').forEach(el => el.classList.add('hidden'));
  } else if (role === 'CONTADOR') {
    document.querySelectorAll('.role-admin-only, .role-tech-only').forEach(el => el.classList.add('hidden'));
  } else if (role === 'RECEPCIONISTA') {
    document.querySelectorAll('.role-admin-only, .role-finance-only').forEach(el => el.classList.add('hidden'));
  }
}

/**
 * 2. Navegación y Sidebar
 */
function initSidebar() {
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.admin-sidebar');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Logout
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('¿Desea cerrar la sesión actual?')) {
        Auth.logout();
      }
    });
  }
}

function highlightActiveLink() {
  const currentPath = window.location.pathname;
  document.querySelectorAll('.sidebar-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (currentPath.endsWith(href) || (href.includes('dashboard') && currentPath.endsWith('/admin/')))) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * 3. Sistema de Notificaciones Internas en Encabezado
 */
async function initNotifications() {
  const bell = document.getElementById('notif-bell');
  const dropdown = document.getElementById('notif-dropdown');
  const badge = document.getElementById('notif-badge');
  const list = document.getElementById('notif-list');

  if (!bell || !dropdown) return;

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !bell.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });

  await fetchNotifications();

  // Polling silencioso cada 60 segundos
  setInterval(fetchNotifications, 60000);
}

async function fetchNotifications() {
  const badge = document.getElementById('notif-badge');
  const list = document.getElementById('notif-list');

  try {
    const res = await API.get('/api/settings/notifications');
    if (res.success) {
      const count = res.unreadCount || 0;
      if (badge) {
        if (count > 0) {
          badge.textContent = count > 99 ? '99+' : count;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }

      if (list) {
        if (!res.data || res.data.length === 0) {
          list.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No hay notificaciones pendientes.</div>`;
          return;
        }

        list.innerHTML = res.data.map(n => `
          <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead('${n.id}', '${n.link || ''}')">
            <div class="notif-title">${n.title}</div>
            <div class="notif-message">${n.message}</div>
            <div class="notif-time">${new Date(n.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} - ${new Date(n.createdAt).toLocaleDateString('es-AR')}</div>
          </div>
        `).join('');
      }
    }
  } catch (e) {
    // Silencioso
  }
}

window.markNotifRead = async function(id, link) {
  try {
    await API.post(`/api/settings/notifications/${id}/read`, {});
    if (link) {
      window.location.href = link;
    } else {
      fetchNotifications();
    }
  } catch (e) {
    if (link) window.location.href = link;
  }
};

