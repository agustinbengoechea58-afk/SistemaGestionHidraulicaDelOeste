/**
 * Middleware de Validación y Sanitización de Entradas
 */

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

function validateQuoteRequest(req, res, next) {
  const { name, phone, email, repairType, description } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, error: 'El nombre es obligatorio (mínimo 2 caracteres).' });
  }

  if (!phone || phone.trim().length < 6) {
    return res.status(400).json({ success: false, error: 'Un teléfono de contacto válido es obligatorio.' });
  }

  if (!repairType) {
    return res.status(400).json({ success: false, error: 'Debe seleccionar un tipo de reparación.' });
  }

  if (!description || description.trim().length < 5) {
    return res.status(400).json({ success: false, error: 'Debe detallar la falla o problema del componente.' });
  }

  // Sanitizar
  req.body.name = sanitizeString(name);
  req.body.phone = sanitizeString(phone);
  req.body.email = sanitizeString(email || '');
  req.body.repairType = sanitizeString(repairType);
  req.body.brand = sanitizeString(req.body.brand || '');
  req.body.model = sanitizeString(req.body.model || '');
  req.body.description = sanitizeString(description);
  req.body.notes = sanitizeString(req.body.notes || '');

  next();
}

function validateClient(req, res, next) {
  const { name, phone } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, error: 'El nombre o razón social es obligatorio.' });
  }

  if (!phone || phone.trim().length < 6) {
    return res.status(400).json({ success: false, error: 'El teléfono es obligatorio.' });
  }

  req.body.name = sanitizeString(name);
  req.body.phone = sanitizeString(phone);
  req.body.email = sanitizeString(req.body.email || '');
  req.body.dni = sanitizeString(req.body.dni || '');
  req.body.address = sanitizeString(req.body.address || '');
  req.body.city = sanitizeString(req.body.city || '');
  req.body.notes = sanitizeString(req.body.notes || '');

  next();
}

function validateRepair(req, res, next) {
  const { clientId, componentType } = req.body;

  if (!clientId) {
    return res.status(400).json({ success: false, error: 'Debe seleccionar un cliente para la orden de trabajo.' });
  }

  if (!componentType) {
    return res.status(400).json({ success: false, error: 'El tipo de componente es obligatorio.' });
  }

  req.body.componentType = sanitizeString(componentType);
  req.body.brand = sanitizeString(req.body.brand || '');
  req.body.model = sanitizeString(req.body.model || '');
  req.body.serialNumber = sanitizeString(req.body.serialNumber || '');
  req.body.description = sanitizeString(req.body.description || '');
  req.body.diagnosis = sanitizeString(req.body.diagnosis || '');

  next();
}

function validateBudget(req, res, next) {
  const { clientId, items } = req.body;

  if (!clientId) {
    return res.status(400).json({ success: false, error: 'Debe asociar un cliente al presupuesto.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'El presupuesto debe contener al menos un ítem o concepto de trabajo.' });
  }

  // Recalcular en backend para seguridad
  let subtotal = 0;
  const sanitizedItems = items.map(item => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const itemSubtotal = qty * unitPrice;
    subtotal += itemSubtotal;
    return {
      description: sanitizeString(item.description || 'Servicio técnico'),
      quantity: qty,
      unitPrice,
      subtotal: itemSubtotal
    };
  });

  const discount = Math.max(0, Number(req.body.discount) || 0);
  const taxPercent = Math.max(0, Number(req.body.taxPercent) || 0);
  const taxableBase = Math.max(0, subtotal - discount);
  const taxAmount = (taxableBase * taxPercent) / 100;
  const total = taxableBase + taxAmount;

  req.body.items = sanitizedItems;
  req.body.subtotal = subtotal;
  req.body.discount = discount;
  req.body.taxPercent = taxPercent;
  req.body.taxAmount = taxAmount;
  req.body.total = total;

  next();
}

module.exports = {
  sanitizeString,
  validateQuoteRequest,
  validateClient,
  validateRepair,
  validateBudget
};

