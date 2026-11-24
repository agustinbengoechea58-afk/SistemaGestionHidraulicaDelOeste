/**
 * Middleware de Control de Accesos por Roles (RBAC)
 * SUPERADMIN, ADMIN, RECEPCIONISTA, TECNICO, CONTADOR
 */

const ROLE_PERMISSIONS = {
  SUPERADMIN: ['*'],
  ADMIN: [
    'clients', 'repairs', 'budgets', 'inventory', 'suppliers',
    'payments', 'reports', 'settings', 'cms', 'quotes'
  ],
  RECEPCIONISTA: [
    'clients', 'quotes', 'repairs'
  ],
  TECNICO: [
    'repairs', 'repairs:technical', 'inventory:view'
  ],
  CONTADOR: [
    'payments', 'reports', 'budgets:view', 'repairs:view'
  ]
};

function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const userRole = (req.user.role || '').toUpperCase();

    // SUPERADMIN siempre tiene acceso irrestricto
    if (userRole === 'SUPERADMIN') {
      return next();
    }

    if (allowedRoles.length === 0) {
      return next();
    }

    const hasRole = allowedRoles.map(r => r.toUpperCase()).includes(userRole);
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}. Tu rol actual es: ${userRole}`
      });
    }

    next();
  };
}

module.exports = {
  authorize,
  ROLE_PERMISSIONS
};

