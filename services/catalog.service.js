/**
 * Servicio Central de Catálogos de Vehículos, Componentes y Repuestos
 * Gestión de dependencias jerárquicas y utilidades de importación/exportación CSV
 */
const { getCollection, getDocument, setDocument, addDocument, deleteDocument } = require('./firestore.service');

// Categorías iniciales de vehículos
const INITIAL_VEHICLE_CATEGORIES = [
  { id: 'cat-auto', name: 'Automóviles', order: 1, active: true },
  { id: 'cat-camioneta', name: 'Camionetas / Pick-Ups', order: 2, active: true },
  { id: 'cat-suv', name: 'SUV y Crossovers', order: 3, active: true },
  { id: 'cat-utilitario', name: 'Utilitarios y Furgones', order: 4, active: true },
  { id: 'cat-camion', name: 'Camiones y Línea Pesada', order: 5, active: true },
  { id: 'cat-maquinaria', name: 'Maquinaria e Industrial', order: 6, active: true }
];

// Marcas y modelos base para inicialización
const INITIAL_VEHICLES = [
  { id: 'veh-vw-gol', category: 'Automóviles', brand: 'Volkswagen', model: 'Gol / Gol Trend', versions: ['1.6 MSI', '1.9 SD', '1.0 Power'], years: '1998-2023', fuel: 'Nafta/Diesel' },
  { id: 'veh-vw-amarok', category: 'Camionetas / Pick-Ups', brand: 'Volkswagen', model: 'Amarok', versions: ['2.0 TDI 140/180 CV', '3.0 V6 TDI'], years: '2010-2026', fuel: 'Diesel' },
  { id: 'veh-ford-ranger', category: 'Camionetas / Pick-Ups', brand: 'Ford', model: 'Ranger', versions: ['2.2 TDCi', '3.2 TDCi 5 Cil.', '2.0 Bi-Turbo', '3.0 V6'], years: '2012-2026', fuel: 'Diesel' },
  { id: 'veh-ford-focus', category: 'Automóviles', brand: 'Ford', model: 'Focus', versions: ['1.6 Sigma', '2.0 Duratec', '1.8 TDCi'], years: '2000-2020', fuel: 'Nafta/Diesel' },
  { id: 'veh-toyota-hilux', category: 'Camionetas / Pick-Ups', brand: 'Toyota', model: 'Hilux', versions: ['2.4 TDI', '2.8 TDI', '3.0 D-4D'], years: '2005-2026', fuel: 'Diesel' },
  { id: 'veh-toyota-corolla', category: 'Automóviles', brand: 'Toyota', model: 'Corolla', versions: ['1.8 XEI/SEG', '2.0 Dual VVT-i'], years: '2003-2026', fuel: 'Nafta/Híbrido' },
  { id: 'veh-renault-kangoo', category: 'Utilitarios y Furgones', brand: 'Renault', model: 'Kangoo', versions: ['1.6 16v K4M', '1.5 dCi', '1.6 SCe'], years: '1999-2026', fuel: 'Nafta/Diesel' },
  { id: 'veh-renault-clio', category: 'Automóviles', brand: 'Renault', model: 'Clio / Clio Mio', versions: ['1.2 16v', '1.6 8v/16v', '1.9 D'], years: '1996-2017', fuel: 'Nafta/Diesel' },
  { id: 'veh-chev-s10', category: 'Camionetas / Pick-Ups', brand: 'Chevrolet', model: 'S10', versions: ['2.8 CTDI MWM', '2.8 Duramax Turbo'], years: '2001-2026', fuel: 'Diesel' },
  { id: 'veh-chev-corsa', category: 'Automóviles', brand: 'Chevrolet', model: 'Corsa / Classic', versions: ['1.4 8v', '1.6 8v', '1.7 D'], years: '1995-2016', fuel: 'Nafta/Diesel' },
  { id: 'veh-peug-partner', category: 'Utilitarios y Furgones', brand: 'Peugeot', model: 'Partner', versions: ['1.6 HDi', '1.6 16v VTC', '1.9 D'], years: '1998-2026', fuel: 'Nafta/Diesel' },
  { id: 'veh-fiat-fiorino', category: 'Utilitarios y Furgones', brand: 'Fiat', model: 'Fiorino / Uno Fire', versions: ['1.3 Fire 8v', '1.4 Fire Evo'], years: '2000-2026', fuel: 'Nafta' }
];

// Reglas de Precios Base por Defecto
const INITIAL_PRICING_RULES = [
  {
    id: 'rule-crem-pickups',
    name: 'Cremallera Hidráulica Pick-Ups (Ranger, Hilux, Amarok)',
    vehicleCategory: 'Camionetas / Pick-Ups',
    componentType: 'Cremallera de Dirección',
    repairType: 'Reparación Integral de Cremallera',
    baseLabor: 125000,
    priceMode: 'desde',
    estimatedHours: 4,
    active: true
  },
  {
    id: 'rule-crem-autos',
    name: 'Cremallera Hidráulica Autos y Utilitarios',
    vehicleCategory: 'Automóviles',
    componentType: 'Cremallera de Dirección',
    repairType: 'Reparación Integral de Cremallera',
    baseLabor: 95000,
    priceMode: 'desde',
    estimatedHours: 3.5,
    active: true
  },
  {
    id: 'rule-bomba-autos',
    name: 'Bomba de Dirección Hidráulica Vehículos Livianos',
    vehicleCategory: 'Automóviles',
    componentType: 'Bomba Hidráulica',
    repairType: 'Reparación de Bomba Hidráulica',
    baseLabor: 75000,
    priceMode: 'desde',
    estimatedHours: 2.5,
    active: true
  },
  {
    id: 'rule-bomba-pesados',
    name: 'Bomba Hidráulica Utilitarios y Pick-Ups',
    vehicleCategory: 'Camionetas / Pick-Ups',
    componentType: 'Bomba Hidráulica',
    repairType: 'Reparación de Bomba Hidráulica',
    baseLabor: 98000,
    priceMode: 'desde',
    estimatedHours: 3,
    active: true
  }
];

/**
 * Inicializar catálogos si están vacíos
 */
async function initializeCatalogData() {
  const existingCats = await getCollection('vehicle_categories');
  if (existingCats.length === 0) {
    for (const cat of INITIAL_VEHICLE_CATEGORIES) {
      await setDocument('vehicle_categories', cat.id, cat);
    }
  }

  const existingVehicles = await getCollection('vehicle_models');
  if (existingVehicles.length === 0) {
    for (const v of INITIAL_VEHICLES) {
      await setDocument('vehicle_models', v.id, v);
    }
  }

  const existingRules = await getCollection('pricing_rules');
  if (existingRules.length === 0) {
    for (const r of INITIAL_PRICING_RULES) {
      await setDocument('pricing_rules', r.id, r);
    }
  }
}

/**
 * Consultas dependientes para selects jerárquicos
 */
async function getCategories() {
  return await getCollection('vehicle_categories', { orderBy: 'order', orderDirection: 'asc' });
}

async function getBrandsByCategory(categoryName) {
  const models = await getCollection('vehicle_models');
  const filtered = categoryName ? models.filter(m => m.category === categoryName) : models;
  const brands = [...new Set(filtered.map(m => m.brand))].sort();
  return brands;
}

async function getModelsByBrand(brandName, categoryName) {
  let models = await getCollection('vehicle_models');
  if (brandName) {
    models = models.filter(m => m.brand.toLowerCase() === brandName.toLowerCase());
  }
  if (categoryName) {
    models = models.filter(m => m.category.toLowerCase() === categoryName.toLowerCase());
  }
  return models;
}

/**
 * Importar Catálogo desde texto CSV
 */
async function importVehiclesFromCSV(csvString, user = {}) {
  const lines = csvString.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('El archivo CSV está vacío o no contiene filas de datos.');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const recordsAdded = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (rawCols.length < 3) continue;

    const row = {};
    headers.forEach((h, index) => {
      row[h] = rawCols[index] || '';
    });

    const category = row.categoria || row.category || 'Automóviles';
    const brand = row.marca || row.brand;
    const model = row.modelo || row.model;

    if (!brand || !model) {
      errors.push(`Línea ${i + 1}: Faltan campos obligatorios Marca o Modelo.`);
      continue;
    }

    const docId = `veh-${brand.toLowerCase()}-${model.toLowerCase()}`.replace(/[^a-z0-9]+/g, '-');
    const vehicleDoc = {
      category,
      brand,
      model,
      versions: row.versiones ? row.versiones.split(';').map(v => v.trim()) : [],
      years: row.anios || row.years || '2000-2026',
      fuel: row.combustible || row.fuel || 'Nafta/Diesel',
      importedAt: new Date().toISOString()
    };

    await setDocument('vehicle_models', docId, vehicleDoc, true);
    recordsAdded.push(docId);
  }

  return {
    totalProcessed: lines.length - 1,
    importedCount: recordsAdded.length,
    errors
  };
}

module.exports = {
  initializeCatalogData,
  getCategories,
  getBrandsByCategory,
  getModelsByBrand,
  importVehiclesFromCSV,
  INITIAL_VEHICLE_CATEGORIES,
  INITIAL_VEHICLES,
  INITIAL_PRICING_RULES
};

