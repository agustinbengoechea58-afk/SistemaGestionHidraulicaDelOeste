/**
 * Rutas del Módulo de Reparaciones y Órdenes de Trabajo (OT)
 * Gestión integral de 11 estados, historial, repuestos, fotos y trazabilidad
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/permissions');
const { validateRepair } = require('../middleware/validation');
const { 
  getCollection, 
  getDocument, 
  setDocument, 
  addDocument, 
  deleteDocument,
  queryDocuments 
} = require('../services/firestore.service');
const { uploadFile, validateImageFile } = require('../services/storage.service');
const { createNotification } = require('../services/notification.service');
const { getNextSequenceNumber } = require('../services/counter.service');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.use(authenticate, authorize(['SUPERADMIN', 'ADMIN', 'RECEPCIONISTA', 'TECNICO']));

/**
 * GET /api/repairs
 * Listar y filtrar reparaciones
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, search, technicianId, clientId, limit } = req.query;
    let repairs = await getCollection('repairs', {
      orderBy: 'createdAt',
      orderDirection: 'desc',
      limit: limit ? Number(limit) : 200
    });

    if (status) {
      repairs = repairs.filter(r => r.status === status);
    }

    if (technicianId) {
      repairs = repairs.filter(r => r.technicianId === technicianId);
    }

    if (clientId) {
      repairs = repairs.filter(r => r.clientId === clientId);
    }

    if (search) {
      const q = search.toLowerCase().trim();
      repairs = repairs.filter(r =>
        (r.orderNumber && r.orderNumber.toLowerCase().includes(q)) ||
        (r.trackingCode && r.trackingCode.toLowerCase().includes(q)) ||
        (r.clientName && r.clientName.toLowerCase().includes(q)) ||
        (r.clientPhone && r.clientPhone.includes(q)) ||
        (r.componentType && r.componentType.toLowerCase().includes(q)) ||
        (r.brand && r.brand.toLowerCase().includes(q)) ||
        (r.model && r.model.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, count: repairs.length, data: repairs });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/repairs/:id
 * Detalle completo de orden de trabajo
 */
router.get('/:id', async (req, res, next) => {
  try {
    const repair = await getDocument('repairs', req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, error: 'Orden de trabajo no encontrada.' });
    }
    res.json({ success: true, data: repair });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/repairs
 * Crear nueva orden de trabajo
 */
router.post('/', validateRepair, async (req, res, next) => {
  try {
    const client = await getDocument('clients', req.body.clientId);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    const orderNumber = await getNextSequenceNumber('orders');
    const trackingCode = orderNumber;
    const verificationCode = (client.phone || '0000').slice(-4);

    const now = new Date().toISOString();
    const initialStatus = req.body.status || 'Recibido';

    const repairData = {
      orderNumber,
      trackingCode,
      verificationCode,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      clientEmail: client.email || '',
      componentType: req.body.componentType,
      brand: req.body.brand || '',
      model: req.body.model || '',
      serialNumber: req.body.serialNumber || '',
      description: req.body.description || '',
      diagnosis: req.body.diagnosis || '',
      receivedDate: req.body.receivedDate || now,
      estimatedDeliveryDate: req.body.estimatedDeliveryDate || '',
      technicianId: req.body.technicianId || '',
      technicianName: req.body.technicianName || 'Sin asignar',
      status: initialStatus,
      receptionPhotos: req.body.receptionPhotos || [],
      processPhotos: req.body.processPhotos || [],
      finalPhotos: req.body.finalPhotos || [],
      partsUsed: req.body.partsUsed || [],
      laborHours: Number(req.body.laborHours) || 0,
      internalCosts: Number(req.body.internalCosts) || 0,
      warrantyMonths: Number(req.body.warrantyMonths) || 6,
      notes: req.body.notes || '',
      statusHistory: [
        {
          status: initialStatus,
          date: now,
          user: req.user.name,
          userRole: req.user.role,
          note: req.body.initialNote || 'Ingreso del componente al taller para diagnóstico.'
        }
      ],
      createdAt: now
    };

    const doc = await addDocument('repairs', repairData);

    await createNotification(
      'Nueva Orden de Trabajo',
      `Creada ${orderNumber} para ${client.name} (${repairData.componentType}).`,
      'info',
      `/admin/reparaciones.html`
    );

    res.status(201).json({
      success: true,
      data: doc,
      message: `Orden de trabajo ${orderNumber} generada con éxito.`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/repairs/:id
 * Editar datos de orden
 */
router.put('/:id', validateRepair, async (req, res, next) => {
  try {
    const existing = await getDocument('repairs', req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    }

    const updates = {
      componentType: req.body.componentType,
      brand: req.body.brand || '',
      model: req.body.model || '',
      serialNumber: req.body.serialNumber || '',
      description: req.body.description || '',
      diagnosis: req.body.diagnosis || '',
      estimatedDeliveryDate: req.body.estimatedDeliveryDate || existing.estimatedDeliveryDate,
      technicianId: req.body.technicianId || existing.technicianId,
      technicianName: req.body.technicianName || existing.technicianName,
      laborHours: Number(req.body.laborHours) || existing.laborHours,
      internalCosts: Number(req.body.internalCosts) || existing.internalCosts,
      warrantyMonths: Number(req.body.warrantyMonths) || existing.warrantyMonths,
      notes: req.body.notes || existing.notes
    };

    const updated = await setDocument('repairs', req.params.id, updates, true);
    res.json({ success: true, data: updated, message: 'Orden de trabajo actualizada.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/repairs/:id/status
 * Actualizar estado con registro de auditoría
 */
router.post('/:id/status', async (req, res, next) => {
  try {
    const { status, note, publicComment } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Debe especificar el nuevo estado.' });
    }

    const repair = await getDocument('repairs', req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    }

    const now = new Date().toISOString();
    const history = repair.statusHistory || [];
    history.push({
      status,
      date: now,
      user: req.user.name,
      userRole: req.user.role,
      note: note || `Cambio de estado a ${status}`,
      publicComment: publicComment || ''
    });

    const updates = {
      status,
      statusHistory: history
    };

    if (status === 'Reparado' || status === 'Listo para entregar') {
      updates.completedAt = now;
    } else if (status === 'Entregado') {
      updates.deliveredAt = now;
    }

    const updated = await setDocument('repairs', req.params.id, updates, true);

    // Alerta interna si finalizó
    if (status === 'Listo para entregar' || status === 'Reparado') {
      await createNotification(
        'Reparación Finalizada',
        `La orden ${repair.orderNumber} (${repair.componentType}) está lista para entregar.`,
        'success',
        `/admin/reparaciones.html`
      );
    }

    res.json({ success: true, data: updated, message: `Estado actualizado a "${status}".` });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/repairs/:id/photos
 * Subir fotos de recepción, proceso o final
 */
router.post('/:id/photos', upload.array('photos', 5), async (req, res, next) => {
  try {
    const { phase } = req.body; // 'receptionPhotos' | 'processPhotos' | 'finalPhotos'
    const photoKey = ['receptionPhotos', 'processPhotos', 'finalPhotos'].includes(phase) 
      ? phase 
      : 'processPhotos';

    const repair = await getDocument('repairs', req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    }

    const files = req.files || [];
    const newUrls = [];

    for (const file of files) {
      const valid = validateImageFile(file);
      if (valid.valid) {
        const uploaded = await uploadFile(file, `repairs/${repair.orderNumber}`);
        newUrls.push(uploaded.url);
      }
    }

    const currentPhotos = repair[photoKey] || [];
    const mergedPhotos = [...currentPhotos, ...newUrls];

    await setDocument('repairs', req.params.id, {
      [photoKey]: mergedPhotos
    }, true);

    res.json({
      success: true,
      message: `${newUrls.length} fotografías agregadas a la orden.`,
      photos: mergedPhotos
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/repairs/:id/parts
 * Asignar repuesto utilizado y descontar de inventario
 */
router.post('/:id/parts', async (req, res, next) => {
  try {
    const { inventoryId, quantity, description, unitCost } = req.body;
    const qty = Math.max(1, Number(quantity) || 1);

    const repair = await getDocument('repairs', req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    }

    let partName = description;
    let cost = Number(unitCost) || 0;

    // Si viene de inventario registrado, descontar stock
    if (inventoryId) {
      const product = await getDocument('inventory', inventoryId);
      if (product) {
        partName = product.name;
        cost = product.cost || cost;
        const currentStock = Number(product.stock) || 0;
        const newStock = Math.max(0, currentStock - qty);
        
        await setDocument('inventory', inventoryId, {
          stock: newStock,
          movements: [
            ...(product.movements || []),
            {
              type: 'salida',
              quantity: qty,
              reason: `Uso en reparación ${repair.orderNumber}`,
              date: new Date().toISOString(),
              user: req.user.name
            }
          ]
        }, true);
      }
    }

    const partsUsed = repair.partsUsed || [];
    partsUsed.push({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      inventoryId: inventoryId || null,
      name: partName,
      quantity: qty,
      cost,
      date: new Date().toISOString()
    });

    const updated = await setDocument('repairs', req.params.id, { partsUsed }, true);

    res.json({
      success: true,
      data: updated,
      message: `Repuesto asignado correctamente.`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/repairs/:id
 */
router.delete('/:id', authorize(['SUPERADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    await deleteDocument('repairs', req.params.id);
    res.json({ success: true, message: 'Orden de trabajo eliminada.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

