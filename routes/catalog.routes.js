/**
 * Rutas de Catálogo de Vehículos, Componentes y Motor de Precios
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/permissions');
const { 
  getCategories, 
  getBrandsByCategory, 
  getModelsByBrand, 
  importVehiclesFromCSV 
} = require('../services/catalog.service');
const { calculateQuoteBreakdown } = require('../services/pricing.service');
const { getCollection, getDocument, setDocument, addDocument, deleteDocument } = require('../services/firestore.service');

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * Endpoints Públicos para Selects Dinámicos en Cotizador
 */
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await getCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

router.get('/brands', async (req, res, next) => {
  try {
    const { category } = req.query;
    const brands = await getBrandsByCategory(category);
    res.json({ success: true, data: brands });
  } catch (err) {
    next(err);
  }
});

router.get('/models', async (req, res, next) => {
  try {
    const { brand, category } = req.query;
    const models = await getModelsByBrand(brand, category);
    res.json({ success: true, data: models });
  } catch (err) {
    next(err);
  }
});

router.get('/components', async (req, res, next) => {
  try {
    const components = [
      { id: 'bomba-hidraulica', name: 'Bomba de Dirección Hidráulica', category: 'Bombas' },
      { id: 'cremallera-hidraulica', name: 'Cremallera de Dirección Hidráulica', category: 'Cremalleras' },
      { id: 'caja-direccion', name: 'Caja de Dirección Asistida', category: 'Cajas' },
      { id: 'bomba-electrohidraulica', name: 'Bomba Electrohidráulica', category: 'Bombas' },
      { id: 'valvula-rotativa', name: 'Válvula Rotativa / Distribuidor', category: 'Válvulas' },
      { id: 'cilindro-asistido', name: 'Cilindro de Asistencia Hidráulica', category: 'Cilindros' }
    ];
    res.json({ success: true, data: components });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/catalog/calculate
 * Motor de Cálculo Backend
 */
router.post('/calculate', async (req, res, next) => {
  try {
    const breakdown = await calculateQuoteBreakdown(req.body);
    res.json({ success: true, data: breakdown });
  } catch (err) {
    next(err);
  }
});

/**
 * Endpoints Administrativos para Reglas de Precios y Catálogo
 */
router.get('/pricing-rules', authenticate, authorize(['SUPERADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    const rules = await getCollection('pricing_rules');
    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
});

router.post('/pricing-rules', authenticate, authorize(['SUPERADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    const ruleData = {
      name: req.body.name,
      vehicleCategory: req.body.vehicleCategory || '',
      vehicleBrand: req.body.vehicleBrand || '',
      vehicleModel: req.body.vehicleModel || '',
      componentType: req.body.componentType,
      repairType: req.body.repairType || 'Reparación Completa',
      baseLabor: Number(req.body.baseLabor) || 0,
      priceMode: req.body.priceMode || 'desde',
      requiresInspection: req.body.requiresInspection === true,
      active: req.body.active !== false
    };

    let doc;
    if (req.body.id) {
      doc = await setDocument('pricing_rules', req.body.id, ruleData, true);
    } else {
      doc = await addDocument('pricing_rules', ruleData);
    }
    res.json({ success: true, data: doc, message: 'Regla de precio guardada con éxito.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/pricing-rules/:id', authenticate, authorize(['SUPERADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    await deleteDocument('pricing_rules', req.params.id);
    res.json({ success: true, message: 'Regla de precio eliminada.' });
  } catch (err) {
    next(err);
  }
});

/**
 * Importación y Exportación CSV de Vehículos
 */
router.post('/import-vehicles-csv', authenticate, authorize(['SUPERADMIN', 'ADMIN']), upload.single('file'), async (req, res, next) => {
  try {
    let csvContent = '';
    if (req.file) {
      csvContent = req.file.buffer.toString('utf8');
    } else if (req.body.csvText) {
      csvContent = req.body.csvText;
    } else {
      return res.status(400).json({ success: false, error: 'Debe subir un archivo CSV o proporcionar texto CSV.' });
    }

    const result = await importVehiclesFromCSV(csvContent, req.user);
    res.json({ success: true, data: result, message: `Se importaron ${result.importedCount} vehículos al catálogo.` });
  } catch (err) {
    next(err);
  }
});

router.get('/export-vehicles-csv', authenticate, authorize(['SUPERADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    const models = await getCollection('vehicle_models');
    let csv = 'Categoria,Marca,Modelo,Versiones,Anios,Combustible\n';
    models.forEach(m => {
      const vers = (m.versions || []).join(';');
      csv += `"${m.category || ''}","${m.brand || ''}","${m.model || ''}","${vers}","${m.years || ''}","${m.fuel || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="catalogo-vehiculos.csv"');
    res.send('\uFEFF' + csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

