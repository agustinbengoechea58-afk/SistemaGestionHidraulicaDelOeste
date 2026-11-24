/**
 * Middleware de Autenticación mediante Firebase Authentication Tokens V2
 * Soporta Usuarios del Staff (Roles Administrativos) y Clientes Registrados
 */
const { getAuth, getStatus } = require('../config/firebase-admin');
const { getCollection, queryDocuments } = require('../services/firestore.service');

async function authenticate(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split('Bearer ')[1].trim();
    } else if (req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Acceso no autorizado. Debe iniciar sesión.'
      });
    }

    const { isInitialized } = getStatus();
    const auth = getAuth();

    // Verificación con Firebase Admin SDK si está conectado
    if (isInitialized && auth) {
      try {
        const decodedToken = await auth.verifyIdToken(token);
        // 1. Buscar en employees
        let users = await queryDocuments('employees', { email: decodedToken.email });
        let user = users[0];
        let role = decodedToken.role || 'ADMIN';
        let isCustomer = false;

        // 2. Si no es empleado, buscar en customers
        if (!user) {
          const custs = await queryDocuments('customers', { email: decodedToken.email });
          if (custs[0]) {
            user = custs[0];
            role = 'CUSTOMER';
            isCustomer = true;
          }
        }

        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          name: user ? user.name : (decodedToken.name || decodedToken.email),
          role: user ? (user.role || role) : role,
          isCustomer,
          customerCode: user ? user.customerCode : undefined,
          active: user ? user.active !== false : true
        };

        if (!req.user.active) {
          return res.status(403).json({ success: false, error: 'Cuenta deshabilitada por la administración.' });
        }

        return next();
      } catch (fbErr) {
        // Fallback para tokens locales dev-token y customer-token
      }
    }

    // Modo local / desarrollo
    if (token.startsWith('customer-token-')) {
      const email = token.replace('customer-token-', '');
      const customers = await getCollection('customers');
      const found = customers.find(c => (c.email || '').toLowerCase() === email.toLowerCase());
      if (found) {
        req.user = {
          uid: found.id,
          id: found.id,
          email: found.email,
          name: found.name,
          role: 'CUSTOMER',
          isCustomer: true,
          customerCode: found.customerCode,
          active: found.active !== false
        };
        return next();
      }
    }

    if (token.startsWith('dev-token-') || token.length > 5) {
      const email = token.startsWith('dev-token-') ? token.replace('dev-token-', '') : null;
      const employees = await getCollection('employees');
      const found = email 
        ? employees.find(e => (e.email || '').toLowerCase() === email.toLowerCase())
        : employees.find(e => e.token === token || e.id === token || (e.email || '').toLowerCase() === (process.env.INITIAL_ADMIN_EMAIL || '').toLowerCase());

      if (found) {
        req.user = {
          uid: found.uid || found.id,
          id: found.id,
          email: found.email,
          name: found.name,
          role: found.role || 'SUPERADMIN',
          isCustomer: false,
          active: found.active !== false
        };
        return next();
      }
    }

    return res.status(401).json({
      success: false,
      error: 'Token de autenticación no reconocido o sesión inválida.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error de autenticación en el servidor: ' + error.message
    });
  }
}

module.exports = authenticate;
