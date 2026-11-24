/**
 * Rutas del Módulo de Clientes
 * CRUD, Búsqueda, Historial de Reparaciones, Presupuestos y Pagos
 */
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/permissions');
const { validateClient } = require('../middleware/validation');
const { 
  getCollection, 
  getDocument, 
  setDocument, 
  addDocument, 
  deleteDocument,
  queryDocuments 
} = require('../services/firestore.service');

router.use(authenticate, authorize(['SUPERADMIN', 'ADMIN', 'RECEPCIONISTA']));

/**
 * GET /api/clients
 * Listar y buscar clientes
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, limit } = req.query;
    let clients = await getCollection('clients', {
      orderBy: 'createdAt',
      orderDirection: 'desc',
      limit: limit ? Number(limit) : 200
    });

    if (search) {
      const q = search.toLowerCase().trim();
      clients = clients.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.dni && c.dni.includes(q))
      );
    }

    res.json({ success: true, count: clients.length, data: clients });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/clients/:id
 * Detalle del cliente e historial completo
 */
router.get('/:id', async (req, res, next) => {
  try {
    const client = await getDocument('clients', req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    // Cargar historial de órdenes de trabajo asociadas
    const repairs = await queryDocuments('repairs', { clientId: req.params.id });
    // Cargar historial de presupuestos
    const budgets = await queryDocuments('budgets', { clientId: req.params.id });
    // Cargar historial de pagos
    const payments = await queryDocuments('payments', { clientId: req.params.id });

    res.json({
      success: true,
      data: {
        ...client,
        history: {
          repairs,
          budgets,
          payments
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/clients
 * Crear cliente nuevo
 */
router.post('/', validateClient, async (req, res, next) => {
  try {
    const clientData = {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email || '',
      dni: req.body.dni || '',
      address: req.body.address || '',
      city: req.body.city || '',
      notes: req.body.notes || '',
      createdAt: new Date().toISOString()
    };

    const doc = await addDocument('clients', clientData);
    res.status(201).json({
      success: true,
      data: doc,
      message: 'Cliente creado con éxito.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/clients/:id
 * Editar cliente
 */
router.put('/:id', validateClient, async (req, res, next) => {
  try {
    const existing = await getDocument('clients', req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    const updated = await setDocument('clients', req.params.id, {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email || '',
      dni: req.body.dni || '',
      address: req.body.address || '',
      city: req.body.city || '',
      notes: req.body.notes || ''
    }, true);

    res.json({
      success: true,
      data: updated,
      message: 'Cliente actualizado correctamente.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/clients/:id
 * Archivar / eliminar cliente
 */
router.delete('/:id', authorize(['SUPERADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    await deleteDocument('clients', req.params.id);
    res.json({ success: true, message: 'Cliente eliminado correctamente.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

