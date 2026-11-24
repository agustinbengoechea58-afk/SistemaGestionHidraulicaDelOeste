/**
 * Rutas del Módulo de Presupuestos
 * Generación de cotizaciones, cálculo de totales, PDF y envío por WhatsApp
 */
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/permissions');
const { validateBudget } = require('../middleware/validation');
const { 
  getCollection, 
  getDocument, 
  setDocument, 
  addDocument, 
  deleteDocument,
  queryDocuments 
} = require('../services/firestore.service');
const { generateBudgetPDF } = require('../services/pdf.service');
const { generateWhatsAppLink, buildWhatsAppMessage, createNotification } = require('../services/notification.service');
const { getNextSequenceNumber } = require('../services/counter.service');
const { sendAutoNotificationBudgetReady } = require('../services/whatsapp.service');

router.use(authenticate, authorize(['SUPERADMIN', 'ADMIN', 'RECEPCIONISTA', 'CONTADOR']));

/**
 * GET /api/budgets
 * Listar presupuestos con filtros
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, clientId, search, limit } = req.query;
    let budgets = await getCollection('budgets', {
      orderBy: 'createdAt',
      orderDirection: 'desc',
      limit: limit ? Number(limit) : 200
    });

    if (status) {
      budgets = budgets.filter(b => b.status === status);
    }

    if (clientId) {
      budgets = budgets.filter(b => b.clientId === clientId);
    }

    if (search) {
      const q = search.toLowerCase().trim();
      budgets = budgets.filter(b =>
        (b.number && b.number.toLowerCase().includes(q)) ||
        (b.clientName && b.clientName.toLowerCase().includes(q)) ||
        (b.componentType && b.componentType.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, count: budgets.length, data: budgets });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/budgets/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const budget = await getDocument('budgets', req.params.id);
    if (!budget) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado.' });
    }
    res.json({ success: true, data: budget });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/budgets
 * Crear presupuesto con cálculo backend
 */
router.post('/', validateBudget, async (req, res, next) => {
  try {
    const client = await getDocument('clients', req.body.clientId);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    const number = await getNextSequenceNumber('quotes');
    const now = new Date().toISOString();

    const budgetData = {
      number,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      clientEmail: client.email || '',
      repairId: req.body.repairId || '',
      componentType: req.body.componentType || 'Bomba / Cremallera Hidráulica',
      brand: req.body.brand || '',
      model: req.body.model || '',
      issueDate: req.body.issueDate || now,
      validDays: Number(req.body.validDays) || 15,
      items: req.body.items,
      subtotal: req.body.subtotal,
      discount: req.body.discount,
      taxPercent: req.body.taxPercent,
      taxAmount: req.body.taxAmount,
      total: req.body.total,
      currency: req.body.currency || 'ARS',
      notes: req.body.notes || '',
      status: req.body.status || 'Pendiente', // 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Vencido' | 'Anulado'
      createdBy: req.user.name,
      createdAt: now
    };

    const doc = await addDocument('budgets', budgetData);

    // Si tiene orden de trabajo asociada, enlazar presupuesto
    if (req.body.repairId) {
      await setDocument('repairs', req.body.repairId, {
        budgetId: doc.id,
        budgetNumber: number,
        budgetTotal: budgetData.total,
        budgetSummary: {
          number,
          total: budgetData.total,
          status: budgetData.status
        }
      }, true);
    }

    await createNotification(
      'Nuevo Presupuesto Creado',
      `Presupuesto ${number} emitido para ${client.name} por $${budgetData.total.toLocaleString('es-AR')}.`,
      'info',
      `/admin/presupuestos.html`
    );

    // Notificación automática vía WhatsApp Business API
    await sendAutoNotificationBudgetReady({
      clientName: client.name,
      clientPhone: client.phone,
      budgetNumber: number,
      componentType: budgetData.componentType,
      total: budgetData.total,
      validDays: budgetData.validDays
    });

    res.status(201).json({
      success: true,
      data: doc,
      message: `Presupuesto ${number} creado exitosamente.`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/budgets/:id
 */
router.put('/:id', validateBudget, async (req, res, next) => {
  try {
    const existing = await getDocument('budgets', req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    const updates = {
      items: req.body.items,
      subtotal: req.body.subtotal,
      discount: req.body.discount,
      taxPercent: req.body.taxPercent,
      taxAmount: req.body.taxAmount,
      total: req.body.total,
      validDays: Number(req.body.validDays) || existing.validDays,
      notes: req.body.notes || existing.notes,
      componentType: req.body.componentType || existing.componentType,
      brand: req.body.brand || existing.brand,
      model: req.body.model || existing.model
    };

    const updated = await setDocument('budgets', req.params.id, updates, true);
    res.json({ success: true, data: updated, message: 'Presupuesto actualizado.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/budgets/:id/status
 * Cambiar estado (Aprobar, Rechazar, Anular)
 */
router.post('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Debe especificar el nuevo estado.' });
    }

    const budget = await getDocument('budgets', req.params.id);
    if (!budget) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    const updated = await setDocument('budgets', req.params.id, {
      status,
      statusChangedAt: new Date().toISOString(),
      statusChangedBy: req.user.name
    }, true);

    // Si está vinculado a una orden de trabajo, reflejar estado
    if (budget.repairId) {
      const repairUpdates = {
        'budgetSummary.status': status
      };
      if (status === 'Aprobado') {
        repairUpdates.status = 'Aprobado';
      }
      await setDocument('repairs', budget.repairId, repairUpdates, true);
    }

    res.json({ success: true, data: updated, message: `Presupuesto marcado como ${status}.` });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/budgets/:id/duplicate
 * Duplicar presupuesto
 */
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const original = await getDocument('budgets', req.params.id);
    if (!original) {
      return res.status(404).json({ success: false, error: 'Presupuesto original no encontrado' });
    }

    const year = new Date().getFullYear();
    const allBudgets = await getCollection('budgets');
    const number = `PRE-${year}-${String(allBudgets.length + 1).padStart(4, '0')}`;

    const cloneData = {
      ...original,
      id: undefined,
      number,
      status: 'Pendiente',
      issueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      notes: `${original.notes || ''} (Copia de ${original.number})`
    };

    const created = await addDocument('budgets', cloneData);
    res.status(201).json({ success: true, data: created, message: `Presupuesto duplicado con número ${number}.` });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/budgets/:id/pdf
 * Descargar / Visualizar PDF oficial
 */
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const budget = await getDocument('budgets', req.params.id);
    if (!budget) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    const settings = await getDocument('site_settings', 'main') || {};
    const contact = await getDocument('site_contact', 'main') || {};

    const companyInfo = {
      name: process.env.APP_NAME || settings.businessName || 'HIDRAULICA DEL OESTE A.B',
      phone: contact.phone || '+54 9 11 0000-0000',
      email: contact.email || 'contacto@hidraulicabengoechea.com',
      address: contact.address || 'Taller Central de Precisión Hidráulica',
      currency: settings.currencySymbol || '$',
      warrantyConditions: settings.warrantyConditions
    };

    const pdfBuffer = await generateBudgetPDF(budget, companyInfo);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Presupuesto-${budget.number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/budgets/:id/whatsapp-link
 * Enlace directo para compartir presupuesto
 */
router.get('/:id/whatsapp-link', async (req, res, next) => {
  try {
    const budget = await getDocument('budgets', req.params.id);
    if (!budget) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    const settings = await getDocument('site_settings', 'main') || {};
    const appUrl = process.env.APP_URL || `http://${req.headers.host}`;
    const trackingLink = `${appUrl}/seguimiento.html?code=${budget.number}`;

    const message = buildWhatsAppMessage('budget_ready', {
      name: budget.clientName,
      budgetNumber: budget.number,
      component: `${budget.componentType} ${budget.brand || ''}`,
      total: budget.total,
      link: trackingLink,
      companyName: process.env.APP_NAME || settings.businessName || 'Hidraulica del oeste A.B'
    });

    const url = generateWhatsAppLink(budget.clientPhone, message);
    res.json({ success: true, url, message, phone: budget.clientPhone });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/budgets/:id
 */
router.delete('/:id', authorize(['SUPERADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    await deleteDocument('budgets', req.params.id);
    res.json({ success: true, message: 'Presupuesto eliminado.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/budgets/:id/convert-to-order
 * Convierte un presupuesto aprobado en una Orden de Trabajo oficial
 */
router.post('/:id/convert-to-order', async (req, res, next) => {
  try {
    const budget = await getDocument('budgets', req.params.id);
    if (!budget) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado.' });
    }

    if (budget.convertedToOrderId) {
      return res.status(400).json({
        success: false,
        error: `Este presupuesto ya fue convertido anteriormente en la orden ${budget.convertedToOrderNumber}.`
      });
    }

    const orderNumber = await getNextSequenceNumber('orders');
    const now = new Date().toISOString();

    const orderData = {
      orderNumber,
      trackingCode: orderNumber,
      verificationCode: (budget.clientPhone || '0000').replace(/\D/g, '').slice(-4),
      clientId: budget.clientId,
      clientName: budget.clientName,
      clientPhone: budget.clientPhone,
      clientEmail: budget.clientEmail || '',
      componentType: budget.componentType,
      brand: budget.brand || '',
      model: budget.model || '',
      budgetId: budget.id,
      budgetNumber: budget.number,
      budgetTotal: budget.total,
      budgetSummary: {
        number: budget.number,
        total: budget.total,
        status: 'Aprobado'
      },
      status: 'Aprobado',
      receivedDate: now,
      technicianName: req.body.technicianName || 'Sin asignar',
      technicianId: req.body.technicianId || '',
      partsUsed: (budget.items || []).filter(i => i.type === 'spare_part').map(p => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: p.description,
        quantity: p.quantity,
        cost: p.unitPrice,
        date: now
      })),
      notes: `Generado automáticamente desde presupuesto aprobado ${budget.number}.`,
      statusHistory: [
        {
          status: 'Aprobado',
          date: now,
          user: req.user.name,
          note: `Orden creada automáticamente a partir de presupuesto aprobado ${budget.number}.`,
          publicComment: 'Presupuesto aprobado y orden de trabajo generada. Se procede a la asignación en taller.'
        }
      ],
      createdAt: now
    };

    const newOrder = await addDocument('repairs', orderData);

    // Marcar presupuesto como convertido
    await setDocument('budgets', budget.id, {
      status: 'Aprobado',
      convertedToOrderId: newOrder.id,
      convertedToOrderNumber: orderNumber,
      convertedAt: now
    }, true);

    await createNotification(
      'Orden Generada desde Presupuesto',
      `Presupuesto ${budget.number} convertido en la orden de trabajo ${orderNumber} para ${budget.clientName}.`,
      'success',
      `/admin/reparaciones.html`
    );

    res.status(201).json({
      success: true,
      message: `Presupuesto ${budget.number} convertido exitosamente en orden ${orderNumber}.`,
      orderId: newOrder.id,
      orderNumber
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

