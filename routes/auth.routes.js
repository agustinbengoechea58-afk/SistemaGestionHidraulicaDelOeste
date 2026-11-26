
/**
 * Rutas de Autenticación, Registro de Clientes y Control de Sesión V2
 */
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');

const {
  getCollection,
  getDocument,
  setDocument,
  addDocument,
  queryDocuments
} = require('../services/firestore.service');

const { getNextSequenceNumber } = require('../services/counter.service');
const { getAuth, getStatus } = require('../config/firebase-admin');


/**
 * CONFIGURACIÓN DEL ADMINISTRADOR PRINCIPAL
 * Los datos se obtienen exclusivamente del archivo .env
 */
const INITIAL_ADMIN_EMAIL = (process.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
const INITIAL_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || '';
const INITIAL_ADMIN_NAME = process.env.INITIAL_ADMIN_NAME || 'Administrador';


/**
 * MOSTRAR CREDENCIALES DEL ADMINISTRADOR EN CONSOLA
 */
console.log('\n================================================');
console.log('       HIDRÁULICA DEL OESTE - ADMINISTRADOR');
console.log('================================================');

if (INITIAL_ADMIN_EMAIL && INITIAL_ADMIN_PASSWORD) {
  console.log('Nombre:       ', INITIAL_ADMIN_NAME);
  console.log('Usuario:      ', INITIAL_ADMIN_EMAIL);
  console.log('Contraseña:   ', INITIAL_ADMIN_PASSWORD);
  console.log('Estado:         CONFIGURADO');
} else {
  console.log('ERROR: Faltan datos del administrador en .env');

  if (!INITIAL_ADMIN_EMAIL) {
    console.log('Falta INITIAL_ADMIN_EMAIL');
  }

  if (!INITIAL_ADMIN_PASSWORD) {
    console.log('Falta INITIAL_ADMIN_PASSWORD');
  }
}

console.log('================================================\n');


/**
 * POST /api/auth/register-customer
 * Registro de nuevos clientes con numeración secuencial
 * y vinculación de historial previo
 */
router.post('/register-customer', async (req, res, next) => {
  try {
    const { name, phone, email, password } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'El nombre es obligatorio.'
      });
    }

    if (!phone || phone.trim().length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Un teléfono válido es obligatorio.'
      });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Un correo electrónico válido es obligatorio.'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Comprobar si ya existe en customers
    const existing = await queryDocuments('customers', {
      email: cleanEmail
    });

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe una cuenta registrada con este correo electrónico.'
      });
    }

    // Generar número de cliente secuencial
    const customerCode = await getNextSequenceNumber('customers');
    const now = new Date().toISOString();

    const customerData = {
      customerCode,
      name: name.trim(),
      phone: phone.trim(),
      email: cleanEmail,
      password: password,
      role: 'CUSTOMER',
      active: true,
      registeredAt: now,
      createdAt: now
    };

    const doc = await addDocument('customers', customerData);

    // Guardar también en clients para interoperabilidad con el ERP
    await setDocument('clients', doc.id, {
      ...customerData,
      customerRefId: doc.id
    }, true);

    // Vincular consultas anteriores
    const guestQuotes = await queryDocuments('quotes', {
      email: cleanEmail
    });

    for (const q of guestQuotes) {
      await setDocument('quotes', q.id, {
        customerId: doc.id,
        customerCode,
        isGuest: false,
        linkedAt: now
      }, true);
    }

    const token = `customer-token-${cleanEmail}`;

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

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
 * Iniciar sesión para Administradores, Empleados y Clientes
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, idToken } = req.body;

    if (!email && !idToken) {
      return res.status(400).json({
        success: false,
        error: 'Debe ingresar correo y contraseña o token de autenticación.'
      });
    }

    const { isInitialized } = getStatus();
    const auth = getAuth();


    /**
     * CASO 1: AUTENTICACIÓN MEDIANTE FIREBASE ID TOKEN
     */
    if (idToken && isInitialized && auth) {
      try {
        const decoded = await auth.verifyIdToken(idToken);
        const cleanEmail = (decoded.email || '').trim().toLowerCase();

        if (!cleanEmail) {
          return res.status(401).json({
            success: false,
            error: 'El token no contiene un correo electrónico válido.'
          });
        }

        // Comprobar si es el administrador configurado en .env
        const isInitialAdmin =
          INITIAL_ADMIN_EMAIL &&
          cleanEmail === INITIAL_ADMIN_EMAIL;

        const employees = await queryDocuments('employees', {
          email: cleanEmail
        });

        let user = employees[0];

        if (!user && !isInitialAdmin) {
          const customers = await queryDocuments('customers', {
            email: cleanEmail
          });

          user = customers[0];

          if (!user) {
            return res.status(403).json({
              success: false,
              error: 'El usuario no está registrado en el sistema.'
            });
          }
        }

        if (isInitialAdmin) {
          user = user || {
            id: 'admin-root',
            uid: decoded.uid,
            email: INITIAL_ADMIN_EMAIL,
            name: INITIAL_ADMIN_NAME,
            role: 'SUPERADMIN',
            active: true
          };
        }

        if (user.active === false) {
          return res.status(403).json({
            success: false,
            error: 'Cuenta deshabilitada.'
          });
        }

        const role = isInitialAdmin
          ? 'SUPERADMIN'
          : (user.role || 'CUSTOMER');

        res.cookie('authToken', idToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000
        });

        return res.json({
          success: true,
          token: idToken,
          user: {
            uid: user.uid || user.id || decoded.uid,
            email: cleanEmail,
            name: user.name || decoded.name || cleanEmail,
            role
          }
        });

      } catch (tokenErr) {
        console.error('Error verificando Firebase ID Token:', tokenErr.message);

        return res.status(401).json({
          success: false,
          error: 'Token de Firebase inválido.'
        });
      }
    }


    /**
     * CASO 2: LOGIN DIRECTO CON EMAIL Y CONTRASEÑA
     */
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'Debe ingresar correo electrónico y contraseña.'
      });
    }


    /**
     * 2.1 ADMINISTRADOR PRINCIPAL DESDE .ENV
     */
    if (
      INITIAL_ADMIN_EMAIL &&
      INITIAL_ADMIN_PASSWORD &&
      cleanEmail === INITIAL_ADMIN_EMAIL
    ) {

      if (password !== INITIAL_ADMIN_PASSWORD) {
        return res.status(401).json({
          success: false,
          error: 'Contraseña incorrecta.'
        });
      }

      const adminUser = {
        id: 'admin-root',
        email: INITIAL_ADMIN_EMAIL,
        name: INITIAL_ADMIN_NAME,
        role: 'SUPERADMIN',
        active: true
      };

      // Crear o actualizar el administrador en employees
      await setDocument('employees', 'admin-root', adminUser);

      const token = `dev-token-${INITIAL_ADMIN_EMAIL}`;

      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      console.log('\n[ADMIN] Inicio de sesión correcto');
      console.log('[ADMIN] Usuario:', INITIAL_ADMIN_EMAIL);
      console.log('[ADMIN] Rol: SUPERADMIN\n');

      return res.json({
        success: true,
        token,
        userType: 'staff',
        user: {
          id: 'admin-root',
          email: INITIAL_ADMIN_EMAIL,
          name: INITIAL_ADMIN_NAME,
          role: 'SUPERADMIN'
        },
        message: 'Administrador autenticado correctamente.'
      });
    }


    /**
     * 2.2 BUSCAR EN EMPLEADOS
     */
    const employees = await getCollection('employees');

    let user = employees.find(
      e => (e.email || '').trim().toLowerCase() === cleanEmail
    );

    let userType = 'staff';


    /**
     * 2.3 SI NO ES EMPLEADO, BUSCAR EN CLIENTES
     */
    if (!user) {
      const customers = await getCollection('customers');

      user = customers.find(
        c => (c.email || '').trim().toLowerCase() === cleanEmail
      );

      if (user) {
        userType = 'customer';
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas. Usuario no registrado.'
      });
    }

    if (user.active === false) {
      return res.status(403).json({
        success: false,
        error: 'Esta cuenta ha sido desactivada temporalmente.'
      });
    }


    /**
     * 2.4 VERIFICAR CONTRASEÑA
     */
    if (!user.password || user.password !== password) {
      return res.status(401).json({
        success: false,
        error: 'Contraseña incorrecta.'
      });
    }


    /**
     * 2.5 GENERAR SESIÓN
     */
    const token = userType === 'customer'
      ? `customer-token-${user.email}`
      : `dev-token-${user.email}`;

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

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
    console.error('Error en autenticación:', err);
    next(err);
  }
});


/**
 * GET /api/auth/me
 * Obtener usuario de la sesión actual
 */
router.get('/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});


/**
 * POST /api/auth/logout
 * Cerrar sesión
 */
router.post('/logout', (req, res) => {
  res.clearCookie('authToken');

  res.json({
    success: true,
    message: 'Sesión finalizada correctamente.'
  });
});


module.exports = router;
