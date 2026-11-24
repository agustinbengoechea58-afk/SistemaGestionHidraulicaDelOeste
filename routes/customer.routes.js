/**
 * Rutas del Portal Privado para Clientes
 * Acceso seguro a presupuestos, consultas, órdenes activas y perfil
 */
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getCollection, getDocument, setDocument, queryDocuments } = require('../services/firestore.service');

/**
 * GET /api/customer/dashboard
 * Resumen general del cliente autenticado
 */
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const userEmail = (req.user.email || '').toLowerCase();
    
    // Buscar en colección customers
    let customers = await queryDocuments('customers', { email: userEmail });
    let customer = customers[0];

    if (!customer) {
      // Buscar en clients
      const clients = await queryDocuments('clients', { email: userEmail });
      customer = clients[0];
    }

    const clientId = customer ? customer.id : null;

    // Buscar consultas, presupuestos y reparaciones del cliente
    let inquiries = [];
    let quotes = [];
    let repairs = [];

    if (userEmail) {
      inquiries = await queryDocuments('quotes', { email: userEmail });
      if (inquiries.length === 0 && customer && customer.phone) {
        inquiries = await queryDocuments('quotes', { phone: customer.phone });
      }
    }

    if (clientId) {
      quotes = await queryDocuments('budgets', { clientId });
      repairs = await queryDocuments('repairs', { clientId });
    }

    // Filtrar información sensible de empleados/costos internos
    const safeRepairs = repairs.map(r => ({
      id: r.id,
      orderNumber: r.orderNumber,
      trackingCode: r.trackingCode,
      componentType: r.componentType,
      brand: r.brand,
      model: r.model,
      status: r.status,
      receivedDate: r.receivedDate || r.createdAt,
      estimatedDeliveryDate: r.estimatedDeliveryDate,
      totalPaid: r.totalPaid || 0,
      budgetTotal: r.budgetTotal || 0,
      timeline: (r.statusHistory || []).map(h => ({
        status: h.status,
        date: h.date,
        comment: h.publicComment || h.note
      }))
    }));

    res.json({
      success: true,
      customer: customer || { email: userEmail, name: req.user.name },
      stats: {
        totalInquiries: inquiries.length,
        totalQuotes: quotes.length,
        pendingQuotes: quotes.filter(q => q.status === 'Pendiente').length,
        approvedQuotes: quotes.filter(q => q.status === 'Aprobado').length,
        activeRepairs: safeRepairs.filter(r => !['Entregado', 'Cancelado'].includes(r.status)).length,
        finishedRepairs: safeRepairs.filter(r => ['Reparado', 'Listo para entregar', 'Entregado'].includes(r.status)).length
      },
      inquiries,
      quotes,
      repairs: safeRepairs
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/customer/profile
 * Editar datos del cliente
 */
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const userEmail = (req.user.email || '').toLowerCase();
    const customers = await queryDocuments('customers', { email: userEmail });
    const customer = customers[0];

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Perfil de cliente no encontrado' });
    }

    const updates = {
      name: req.body.name || customer.name,
      phone: req.body.phone || customer.phone,
      address: req.body.address || customer.address,
      city: req.body.city || customer.city,
      dni: req.body.dni || customer.dni
    };

    const updated = await setDocument('customers', customer.id, updates, true);
    res.json({ success: true, data: updated, message: 'Perfil actualizado exitosamente.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

