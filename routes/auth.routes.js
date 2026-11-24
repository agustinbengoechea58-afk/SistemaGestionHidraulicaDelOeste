/**
 * Rutas de Autenticación, Registro de Clientes y Control de Sesión V2
 */
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getCollection, getDocument, setDocument, addDocument, queryDocuments } = require('../services/firestore.service');
const { getNextSequenceNumber } = require('../services/counter.service');
const { getAuth, getStatus } = require('../config/firebase-admin');

/**
 * POST /api/auth/register-customer
 * Registro de nuevos clientes con numeración secuencial y vinculación de historial previo
 */
router.post('/register-customer', async (req, res, next) => {
  try {
    const { name, phone, email, password } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'El nombre es obligatorio.' });
    }
    if (!phone || phone.trim().length < 6) {
      return res.status(400).json({ success: false, error: 'Un teléfono válido es obligatorio.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Un correo electrónico válido es obligatorio.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Comprobar si ya existe en customers o employees
    const existing = await queryDocuments('customers', { email: cleanEmail });
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Ya existe una cuenta registrada con este correo electrónico.' });
    }

    // Generar número de cliente secuencial atómico
    const customerCode = await getNextSequenceNumber('customers');
    const now = new Date().toISOString();

    const customerData = {
      customerCode,
      name: name.trim(),
      phone: phone.trim(),
      email: cleanEmail,
      password: password, // En producción gestionado por Firebase Auth
      role: 'CUSTOMER',
      active: true,
      registeredAt: now,
      createdAt: now
    };

    const doc = await addDocument('customers', customerData);

    // Guardar también en clients para interoperabilidad con el ERP del taller
    await setDocument('clients', doc.id, {
      ...customerData,
      customerRefId: doc.id
    }, true);

    // Vinculación automática segura de consultas previas de invitado con este correo verificado
    const guestQuotes = await queryDocuments('quotes', { email: cleanEmail });
    for (const q of guestQuotes) {
      await setDocument('quotes', q.id, {
        customerId: doc.id,
        customerCode,
        isGuest: false,
        linkedAt: now
      }, true);
    }

    const token = `customer-token-${cleanEmail}`;
    res.cookie('authToken', token, { httpOnly: true, secure: false, maxAge: 24 * 60 * 60 * 1000 });

    res.status(201).json({
      success: true,
      token,
      customer: {
        id: doc.id,
        customerCode,
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        linkedPastInquiries: guestQuotes.length
      },
      message: `¡Cuenta creada exitosamente! Código: ${customerCode}`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Iniciar sesión (Tanto para Empleados como para Clientes)
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, idToken } = req.body;

    if (!email && !idToken) {
      return res.status(400).json({ success: false, error: 'Debe ingresar correo y contraseña o token de autenticación.' });
    }

    const { isInitialized } = getStatus();
    const auth = getAuth();

    // Caso 1: Se envía un Firebase ID Token desde el cliente web
    if (idToken && isInitialized && auth) {
      try {
        const decoded = await auth.verifyIdToken(idToken);
        const users = await queryDocuments('employees', { email: decoded.email });
        let user = users[0];
        let role = 'ADMIN';

        if (!user) {
          // Buscar en customers
          const custs = await queryDocuments('customers', { email: decoded.email });
          if (custs[0]) {
            user = custs[0];
            role = 'CUSTOMER';
          }
        }

        user = user || {
          uid: decoded.uid,
          email: decoded.email,
          name: decoded.name || decoded.email,
          role: role,
          active: true
        };

        if (user.active === false) {
          return res.status(403).json({ success: false, error: 'Cuenta deshabilitada.' });
        }

        res.cookie('authToken', idToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 });
        return res.json({
          success: true,
          token: idToken,
          user: {
            uid: user.uid || user.id,
            email: user.email,
            name: user.name,
            role: user.role || role
          }
        });
      } catch (tokenErr) {
        return res.status(401).json({ success: false, error: 'Token de Firebase inválido: ' + tokenErr.message });
      }
    }

    // Caso 2: Login directo por email y contraseña
    const cleanEmail = (email || '').trim().toLowerCase();
    
    // 2.1 Buscar primero en Empleados (Staff / Admin)
    const employees = await getCollection('employees');
    let user = employees.find(e => (e.email || '').toLowerCase() === cleanEmail);
    let userType = 'staff';

    // Si aún no hay usuarios y coincide con el admin por defecto
    if (!user && cleanEmail === (process.env.INITIAL_ADMIN_EMAIL || 'admin@hidraulicabengoechea.com').toLowerCase()) {
      if (password === (process.env.INITIAL_ADMIN_PASSWORD || 'AdminHidraulica2026!')) {
        user = {
          id: 'admin-root',
          email: cleanEmail,
          name: process.env.INITIAL_ADMIN_NAME || 'Agustín Bengoechea (Administrador)',
          role: 'SUPERADMIN',
          active: true
        };
        await setDocument('employees', 'admin-root', user);
      }
    }

    // 2.2 Si no es empleado, buscar en Clientes Registrados
    if (!user) {
      const customers = await getCollection('customers');
      user = customers.find(c => (c.email || '').toLowerCase() === cleanEmail);
      if (user) {
        userType = 'customer';
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas. Usuario no registrado.' });
    }

    if (user.active === false) {
      return res.status(403).json({ success: false, error: 'Esta cuenta ha sido desactivada temporalmente.' });
    }

    // Verificar contraseña
    if (user.password && user.password !== password) {
      return res.status(401).json({ success: false, error: 'Contraseña incorrecta.' });
    }

    // Generar token de sesión
    const token = userType === 'customer' ? `customer-token-${user.email}` : `dev-token-${user.email}`;
    res.cookie('authToken', token, { httpOnly: true, secure: false, maxAge: 24 * 60 * 60 * 1000 });

    return res.json({
      success: true,
      token,
      userType,
      user: {
        id: user.id || user.uid,
        email: user.email,
        name: user.name,
        role: user.role || (userType === 'customer' ? 'CUSTOMER' : 'ADMIN'),
        customerCode: user.customerCode || undefined
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.json({ success: true, message: 'Sesión finalizada correctamente.' });
});

module.exports = router;
