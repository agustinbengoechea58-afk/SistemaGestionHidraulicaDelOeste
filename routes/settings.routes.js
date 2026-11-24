/**
 * Rutas del Módulo de Configuración del Negocio y Notificaciones
 */
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/permissions');
const { 
  getDocument, 
  setDocument, 
  getCollection, 
  updateDocument 
} = require('../services/firestore.service');
const { invalidatePublicCache } = require('./public.routes');

router.use(authenticate);

/**
 * GET /api/settings
 */
router.get('/', async (req, res, next) => {
  try {
    const settings = await getDocument('site_settings', 'main') || {};
    const contact = await getDocument('site_contact', 'main') || {};
    res.json({
      success: true,
      data: {
        settings,
        contact
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/settings
 */
router.post('/', authorize(['SUPERADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    const { settings, contact } = req.body;

    if (settings) {
      await setDocument('site_settings', 'main', settings, true);
    }

    if (contact) {
      await setDocument('site_contact', 'main', contact, true);
    }

    invalidatePublicCache();

    res.json({
      success: true,
      message: 'Configuración de la empresa guardada exitosamente.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/settings/notifications
 * Notificaciones internas para el encabezado del panel
 */
router.get('/notifications', async (req, res, next) => {
  try {
    const notifications = await getCollection('notifications', {
      orderBy: 'createdAt',
      orderDirection: 'desc',
      limit: 15
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({
      success: true,
      unreadCount,
      data: notifications
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/settings/notifications/:id/read
 */
router.post('/notifications/:id/read', async (req, res, next) => {
  try {
    await updateDocument('notifications', req.params.id, { read: true });
    res.json({ success: true, message: 'Notificación marcada como leída.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

