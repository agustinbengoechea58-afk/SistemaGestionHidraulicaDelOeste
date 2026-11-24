/**
 * Rutas del Módulo de Proveedores
 * Registro de proveedores de retenes, barras, válvulas y fluidos hidráulicos
 */
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/permissions');
const { 
  getCollection, 
  getDocument, 
  setDocument, 
  addDocument, 
  deleteDocument,
  queryDocuments 
} = require('../services/firestore.service');

router.use(authenticate, authorize(['SUPERADMIN', 'ADMIN']));

/**
 * GET /api/suppliers
 */
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    let suppliers = await getCollection('suppliers', { orderBy: 'name', orderDirection: 'asc' });

    if (search) {
      const q = search.toLowerCase().trim();
      suppliers = suppliers.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, count: suppliers.length, data: suppliers });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/suppliers/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const supplier = await getDocument('suppliers', req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    }

    // Obtener productos asociados a este proveedor en el inventario
    const products = await queryDocuments('inventory', { supplierId: req.params.id });

    res.json({
      success: true,
      data: {
        ...supplier,
        products
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/suppliers
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, contactPerson, phone, email, address, category, notes } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'El nombre o razón social del proveedor es obligatorio.' });
    }

    const supplierData = {
      name: name.trim(),
      contactPerson: contactPerson || '',
      phone: phone || '',
      email: email || '',
      address: address || '',
      category: category || 'Repuestos Hidráulicos',
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    const doc = await addDocument('suppliers', supplierData);
    res.status(201).json({ success: true, data: doc, message: 'Proveedor creado correctamente.' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/suppliers/:id
 */
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await getDocument('suppliers', req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    }

    const updates = {
      name: req.body.name || existing.name,
      contactPerson: req.body.contactPerson || existing.contactPerson,
      phone: req.body.phone || existing.phone,
      email: req.body.email || existing.email,
      address: req.body.address || existing.address,
      category: req.body.category || existing.category,
      notes: req.body.notes || existing.notes
    };

    const updated = await setDocument('suppliers', req.params.id, updates, true);
    res.json({ success: true, data: updated, message: 'Proveedor actualizado.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/suppliers/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await deleteDocument('suppliers', req.params.id);
    res.json({ success: true, message: 'Proveedor eliminado.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

