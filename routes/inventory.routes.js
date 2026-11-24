/**
 * Rutas del Módulo de Inventario de Repuestos y Materiales
 * Entradas, salidas, alertas de stock mínimo y trazabilidad
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
  deleteDocument 
} = require('../services/firestore.service');
const { createNotification } = require('../services/notification.service');

router.use(authenticate, authorize(['SUPERADMIN', 'ADMIN', 'TECNICO']));

/**
 * GET /api/inventory
 * Listar repuestos con filtros y alertas
 */
router.get('/', async (req, res, next) => {
  try {
    const { category, search, lowStock, limit } = req.query;
    let items = await getCollection('inventory', {
      orderBy: 'name',
      orderDirection: 'asc',
      limit: limit ? Number(limit) : 300
    });

    if (category) {
      items = items.filter(i => i.category === category);
    }

    if (lowStock === 'true') {
      items = items.filter(i => Number(i.stock || 0) <= Number(i.minStock || 0));
    }

    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(i =>
        (i.name && i.name.toLowerCase().includes(q)) ||
        (i.code && i.code.toLowerCase().includes(q)) ||
        (i.category && i.category.toLowerCase().includes(q)) ||
        (i.location && i.location.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/inventory/alerts
 * Resumen de repuestos con bajo stock
 */
router.get('/alerts', async (req, res, next) => {
  try {
    const items = await getCollection('inventory');
    const lowStockItems = items.filter(i => Number(i.stock || 0) <= Number(i.minStock || 0));
    res.json({ success: true, count: lowStockItems.length, data: lowStockItems });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/inventory
 * Crear nuevo repuesto
 */
router.post('/', authorize(['SUPERADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    const { code, name, category, supplierId, supplierName, cost, salePrice, stock, minStock, location, description } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'El nombre del repuesto es obligatorio.' });
    }

    const itemCode = code ? code.trim().toUpperCase() : `REP-${Date.now().toString().slice(-5)}`;

    const itemData = {
      code: itemCode,
      name: name.trim(),
      category: category || 'General',
      supplierId: supplierId || '',
      supplierName: supplierName || '',
      cost: Number(cost) || 0,
      salePrice: Number(salePrice) || 0,
      stock: Number(stock) || 0,
      minStock: Number(minStock) || 2,
      location: location || '',
      description: description || '',
      movements: [
        {
          type: 'inicial',
          quantity: Number(stock) || 0,
          reason: 'Stock inicial de alta',
          date: new Date().toISOString(),
          user: req.user.name
        }
      ],
      createdAt: new Date().toISOString()
    };

    const doc = await addDocument('inventory', itemData);
    res.status(201).json({ success: true, data: doc, message: `Repuesto ${itemData.name} creado.` });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/inventory/:id
 * Editar datos de repuesto
 */
router.put('/:id', authorize(['SUPERADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    const existing = await getDocument('inventory', req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Repuesto no encontrado' });
    }

    const updates = {
      name: req.body.name || existing.name,
      code: req.body.code ? req.body.code.trim().toUpperCase() : existing.code,
      category: req.body.category || existing.category,
      supplierId: req.body.supplierId || existing.supplierId,
      supplierName: req.body.supplierName || existing.supplierName,
      cost: Number(req.body.cost) !== undefined ? Number(req.body.cost) : existing.cost,
      salePrice: Number(req.body.salePrice) !== undefined ? Number(req.body.salePrice) : existing.salePrice,
      minStock: Number(req.body.minStock) !== undefined ? Number(req.body.minStock) : existing.minStock,
      location: req.body.location || existing.location,
      description: req.body.description !== undefined ? req.body.description : existing.description
    };

    const updated = await setDocument('inventory', req.params.id, updates, true);
    res.json({ success: true, data: updated, message: 'Repuesto actualizado.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/inventory/:id/movement
 * Registrar entrada, salida o ajuste de stock
 */
router.post('/:id/movement', async (req, res, next) => {
  try {
    const { type, quantity, reason } = req.body; // 'entrada' | 'salida' | 'ajuste'
    const qty = Number(quantity);

    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, error: 'La cantidad debe ser un número positivo.' });
    }

    const item = await getDocument('inventory', req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Repuesto no encontrado' });
    }

    let currentStock = Number(item.stock) || 0;
    let newStock = currentStock;

    if (type === 'entrada') {
      newStock += qty;
    } else if (type === 'salida') {
      if (currentStock < qty) {
        return res.status(400).json({ success: false, error: `Stock insuficiente. Disponible: ${currentStock}` });
      }
      newStock -= qty;
    } else if (type === 'ajuste') {
      newStock = qty;
    } else {
      return res.status(400).json({ success: false, error: 'Tipo de movimiento inválido (entrada, salida o ajuste).' });
    }

    const movements = item.movements || [];
    movements.push({
      type,
      quantity: qty,
      stockBefore: currentStock,
      stockAfter: newStock,
      reason: reason || 'Movimiento de almacén',
      date: new Date().toISOString(),
      user: req.user.name
    });

    const updated = await setDocument('inventory', req.params.id, {
      stock: newStock,
      movements
    }, true);

    // Si el stock cae por debajo del mínimo, generar notificación interna
    if (newStock <= (item.minStock || 2)) {
      await createNotification(
        'Alerta de Stock Bajo',
        `El repuesto "${item.name}" (${item.code}) tiene stock crítico (${newStock} u.). Reponer existencias.`,
        'warning',
        `/admin/inventario.html`
      );
    }

    res.json({
      success: true,
      data: updated,
      message: `Movimiento de ${type} registrado. Nuevo stock: ${newStock}`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/inventory/:id
 */
router.delete('/:id', authorize(['SUPERADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    await deleteDocument('inventory', req.params.id);
    res.json({ success: true, message: 'Repuesto eliminado del inventario.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

