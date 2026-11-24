/**
 * Rutas del Módulo de Caja y Finanzas
 * Registro de ingresos, egresos, pagos parciales, cobros y balances
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

router.use(authenticate, authorize(['SUPERADMIN', 'ADMIN', 'CONTADOR']));

/**
 * GET /api/payments
 * Listar movimientos con filtros
 */
router.get('/', async (req, res, next) => {
  try {
    const { type, category, method, startDate, endDate, clientId, repairId, limit } = req.query;
    let movements = await getCollection('payments', {
      orderBy: 'date',
      orderDirection: 'desc',
      limit: limit ? Number(limit) : 300
    });

    if (type) {
      movements = movements.filter(m => m.type === type);
    }

    if (category) {
      movements = movements.filter(m => m.category === category);
    }

    if (method) {
      movements = movements.filter(m => m.method === method);
    }

    if (clientId) {
      movements = movements.filter(m => m.clientId === clientId);
    }

    if (repairId) {
      movements = movements.filter(m => m.repairId === repairId);
    }

    if (startDate) {
      movements = movements.filter(m => m.date >= startDate);
    }

    if (endDate) {
      movements = movements.filter(m => m.date <= endDate);
    }

    // Calcular balances en el conjunto filtrado
    let totalIncome = 0;
    let totalExpense = 0;

    movements.forEach(m => {
      const amt = Number(m.amount) || 0;
      if (m.type === 'ingreso') {
        totalIncome += amt;
      } else if (m.type === 'egreso') {
        totalExpense += amt;
      }
    });

    res.json({
      success: true,
      count: movements.length,
      summary: {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense
      },
      data: movements
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments
 * Registrar nuevo ingreso o egreso
 */
router.post('/', async (req, res, next) => {
  try {
    const { 
      type, // 'ingreso' | 'egreso'
      category, // 'Reparaciones' | 'Venta de repuestos' | 'Compras' | 'Sueldos' | 'Servicios' | 'Gastos operativos' | 'Otros'
      amount,
      method, // 'Efectivo' | 'Transferencia' | 'Mercado Pago' | 'Tarjeta' | 'Otros'
      concept,
      clientId,
      clientName,
      repairId,
      receiptNumber,
      notes,
      date 
    } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'El monto debe ser mayor a 0.' });
    }

    if (!['ingreso', 'egreso'].includes(type)) {
      return res.status(400).json({ success: false, error: 'El tipo debe ser ingreso o egreso.' });
    }

    const now = new Date().toISOString();
    const movementNumber = `MOV-${Date.now().toString().slice(-6)}`;

    const movementData = {
      movementNumber,
      type,
      category: category || (type === 'ingreso' ? 'Reparaciones' : 'Gastos operativos'),
      amount: numAmount,
      method: method || 'Efectivo',
      concept: concept || 'Movimiento de caja',
      clientId: clientId || '',
      clientName: clientName || '',
      repairId: repairId || '',
      receiptNumber: receiptNumber || '',
      notes: notes || '',
      date: date || now,
      recordedBy: req.user.name,
      createdAt: now
    };

    const doc = await addDocument('payments', movementData);

    // Si está asociado a una reparación, registrar el pago en la orden
    if (repairId) {
      const repair = await getDocument('repairs', repairId);
      if (repair) {
        const currentPaid = Number(repair.totalPaid || 0) + (type === 'ingreso' ? numAmount : -numAmount);
        await setDocument('repairs', repairId, {
          totalPaid: currentPaid,
          paymentStatus: currentPaid >= (repair.budgetTotal || 0) ? 'Totalmente Pagado' : 'Pago Parcial'
        }, true);
      }
    }

    if (type === 'ingreso') {
      await createNotification(
        'Pago Registrado',
        `Ingreso de $${numAmount.toLocaleString('es-AR')} por "${movementData.concept}" (${movementData.method}).`,
        'success',
        `/admin/caja.html`
      );
    }

    res.status(201).json({
      success: true,
      data: doc,
      message: `Movimiento ${movementNumber} registrado con éxito.`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/payments/:id
 */
router.delete('/:id', authorize(['SUPERADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    await deleteDocument('payments', req.params.id);
    res.json({ success: true, message: 'Movimiento anulado correctamente.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

