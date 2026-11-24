/**
 * Motor de Cálculo Centralizado de Presupuestos y Reglas de Precio
 * Valida y calcula mano de obra, repuestos, recargos por complejidad,
 * descuentos e impuestos en el backend sin depender de manipulaciones frontend.
 */
const { getCollection, getDocument } = require('./firestore.service');

/**
 * Calcula el presupuesto técnico detallado
 */
async function calculateQuoteBreakdown(input = {}) {
  const {
    vehicleCategory = 'Automóviles',
    vehicleBrand = '',
    vehicleModel = '',
    vehicleYear = '',
    repairType = 'Bomba Hidráulica',
    componentType = 'Bomba Hidráulica',
    selectedSparePartIds = [],
    discountAmount = 0,
    taxPercent = 21,
    customLaborAmount = null
  } = input;

  const pricingRules = await getCollection('pricing_rules', { where: [['active', '==', true]] });
  const allSpares = await getCollection('inventory');

  // 1. Determinar Regla de Precio aplicable por Vehículo + Componente
  let matchedRule = null;
  for (const rule of pricingRules) {
    const matchCategory = !rule.vehicleCategory || rule.vehicleCategory.toLowerCase() === vehicleCategory.toLowerCase();
    const matchBrand = !rule.vehicleBrand || rule.vehicleBrand.toLowerCase() === vehicleBrand.toLowerCase();
    const matchModel = !rule.vehicleModel || rule.vehicleModel.toLowerCase() === vehicleModel.toLowerCase();
    const matchComponent = !rule.componentType || rule.componentType.toLowerCase() === componentType.toLowerCase();

    if (matchCategory && matchBrand && matchModel && matchComponent) {
      matchedRule = rule;
      break;
    }
  }

  // Si no hay regla hiper-específica, buscar regla genérica por componente
  if (!matchedRule) {
    matchedRule = pricingRules.find(r => 
      r.componentType && r.componentType.toLowerCase() === componentType.toLowerCase() && !r.vehicleBrand
    );
  }

  // 2. Determinar Mano de Obra Base
  let baseLabor = 45000; // Valor de base predeterminado
  let priceMode = 'desde';
  let requiresInspection = false;

  if (matchedRule) {
    baseLabor = Number(matchedRule.baseLabor) || baseLabor;
    priceMode = matchedRule.priceMode || 'desde';
    requiresInspection = matchedRule.requiresInspection === true;
  } else {
    // Estimación por tipo de componente
    if (componentType.toLowerCase().includes('cremallera')) {
      baseLabor = 65000;
    } else if (componentType.toLowerCase().includes('electro')) {
      baseLabor = 85000;
    }
  }

  // Si el administrador especificó una mano de obra manual
  if (customLaborAmount !== null && !isNaN(Number(customLaborAmount))) {
    baseLabor = Number(customLaborAmount);
  }

  // 3. Evaluar Repuestos Seleccionados
  const calculatedItems = [
    {
      type: 'labor',
      description: `Mano de obra especializada: ${repairType} (${vehicleBrand} ${vehicleModel})`,
      quantity: 1,
      unitPrice: baseLabor,
      subtotal: baseLabor
    }
  ];

  let sparesTotal = 0;
  if (Array.isArray(selectedSparePartIds) && selectedSparePartIds.length > 0) {
    for (const partItem of selectedSparePartIds) {
      const partId = typeof partItem === 'string' ? partItem : partItem.id;
      const qty = typeof partItem === 'object' ? Math.max(1, Number(partItem.quantity) || 1) : 1;
      const spare = allSpares.find(s => s.id === partId);

      if (spare) {
        const unitPrice = Number(spare.salePrice) || Number(spare.cost) * 1.5 || 0;
        const sub = unitPrice * qty;
        sparesTotal += sub;
        calculatedItems.push({
          type: 'spare_part',
          partId: spare.id,
          code: spare.code,
          description: spare.name,
          quantity: qty,
          unitPrice: unitPrice,
          subtotal: sub
        });
      }
    }
  }

  // 4. Totales Financieros
  const subtotal = baseLabor + sparesTotal;
  const discount = Math.max(0, Math.min(subtotal, Number(discountAmount) || 0));
  const taxableBase = Math.max(0, subtotal - discount);
  const tax = Number(taxPercent) || 0;
  const taxAmount = (taxableBase * tax) / 100;
  const total = taxableBase + taxAmount;

  return {
    priceMode, // 'fijo' | 'desde' | 'hasta' | 'diagnostico' | 'personalizado' | 'inspeccion'
    requiresInspection,
    items: calculatedItems,
    baseLabor,
    sparesTotal,
    subtotal,
    discount,
    taxPercent: tax,
    taxAmount,
    total,
    matchedRuleId: matchedRule ? matchedRule.id : null,
    calculatedAt: new Date().toISOString()
  };
}

module.exports = {
  calculateQuoteBreakdown
};

