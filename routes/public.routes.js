/**
 * Rutas Públicas de la Aplicación y Portal Web
 * Conecta los endpoints del CMS y la información visible para el cliente
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getCollection, getDocument, setDocument, addDocument, queryDocuments } = require('../services/firestore.service');
const { uploadFile, validateImageFile } = require('../services/storage.service');
const { createNotification, generateWhatsAppLink } = require('../services/notification.service');
const { validateQuoteRequest } = require('../middleware/validation');
const { getNextSequenceNumber } = require('../services/counter.service');
const { calculateQuoteBreakdown } = require('../services/pricing.service');
const { sendAutoReplyQuoteReceived } = require('../services/whatsapp.service');

// Configuración de Multer para fotos de solicitudes de presupuesto
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Cache en memoria para respuestas públicas con tiempo de expiración
let publicCache = {
  data: {},
  lastInvalidated: Date.now()
};

function invalidatePublicCache() {
  publicCache.data = {};
  publicCache.lastInvalidated = Date.now();
}

/**
 * GET /api/public/config
 * Información global del negocio
 */
router.get('/config', async (req, res, next) => {
  try {
    if (publicCache.data.config) {
      return res.json({ success: true, data: publicCache.data.config });
    }
    const settings = await getDocument('site_settings', 'main') || {};
    const contact = await getDocument('site_contact', 'main') || {};

    const configData = {
      name: process.env.APP_NAME || settings.businessName || 'Hidraulica del oeste A.B',
      tagline: settings.tagline || 'Especialistas en Bombas Hidráulicas y Cremalleras de Dirección',
      logo: settings.logo || '/assets/logo.jpg',
      logoBanner: settings.logoBanner || '/assets/logo2.jpg',
      currency: settings.currency || 'ARS',
      currencySymbol: settings.currencySymbol || '$',
      phone: contact.phone || '+54 9 11 0000-0000',
      whatsapp: contact.whatsapp || '+54 9 11 0000-0000',
      email: contact.email || 'contacto@hidraulicabengoechea.com',
      address: contact.address || 'Av. Industrial 1234',
      city: contact.city || 'Buenos Aires',
      hours: contact.hours || 'Lunes a Viernes de 8:00 a 18:00 hs',
      mapUrl: contact.mapUrl || '',
      socials: {
        facebook: process.env.FACEBOOK_URL || (contact.socials && contact.socials.facebook) || '',
        instagram: process.env.INSTAGRAM_URL || (contact.socials && contact.socials.instagram) || '',
        youtube: process.env.YOUTUBE_URL || (contact.socials && contact.socials.youtube) || '',
        tiktok: (contact.socials && contact.socials.tiktok) || ''
      },
      warrantyConditions: settings.warrantyConditions || 'Garantía técnica de 6 meses en todas las reparaciones hidráulicas calibradas en banco.'
    };

    publicCache.data.config = configData;
    res.json({ success: true, data: configData });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/home
 * Hero, estadísticas y secciones activas
 */
router.get('/home', async (req, res, next) => {
  try {
    if (publicCache.data.home) {
      return res.json({ success: true, data: publicCache.data.home });
    }
    const home = await getDocument('site_home', 'main') || {};
    const sections = await getDocument('site_sections', 'main') || {};

    const homeData = {
      hero: {
        title: home.title || 'Expertos en Bombas Hidráulicas y Cremalleras de Dirección',
        subtitle: home.subtitle || 'Diagnóstico computarizado, banco de pruebas de alta presión y garantía escrita.',
        description: home.description || 'Brindamos soluciones integrales de precisión industrial y automotor para sistemas hidráulicos exigentes.',
        primaryButtonText: home.primaryButtonText || 'Solicitar Presupuesto',
        primaryButtonLink: home.primaryButtonLink || '#presupuesto',
        secondaryButtonText: home.secondaryButtonText || 'Consultar por WhatsApp',
        secondaryButtonLink: home.secondaryButtonLink || 'whatsapp',
        heroImage: home.heroImage || '/assets/foto1.jpg',
        stats: home.stats || [
          { label: 'Años de Trayectoria', value: '+20' },
          { label: 'Bombas y Cremalleras Reparadas', value: '+8.500' },
          { label: 'Calibración en Banco de Pruebas', value: '100%' },
          { label: 'Garantía Escrita', value: '6 Meses' }
        ]
      },
      sections: sections.order || [
        { id: 'hero', name: 'Inicio', active: true },
        { id: 'nosotros', name: 'Nosotros', active: true },
        { id: 'servicios', name: 'Servicios', active: true },
        { id: 'proceso', name: 'Proceso de Trabajo', active: true },
        { id: 'galeria', name: 'Galería de Trabajos', active: true },
        { id: 'faq', name: 'Preguntas Frecuentes', active: true },
        { id: 'contacto', name: 'Contacto', active: true }
      ]
    };

    publicCache.data.home = homeData;
    res.json({ success: true, data: homeData });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/services
 * Servicios publicados
 */
router.get('/services', async (req, res, next) => {
  try {
    if (publicCache.data.services) {
      return res.json({ success: true, data: publicCache.data.services });
    }
    const services = await getCollection('site_services', {
      where: [['active', '==', true]],
      orderBy: 'order',
      orderDirection: 'asc'
    });
    publicCache.data.services = services;
    res.json({ success: true, data: services });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/services/:slug
 */
router.get('/services/:slug', async (req, res, next) => {
  try {
    const list = await queryDocuments('site_services', { slug: req.params.slug, active: true });
    if (list.length === 0) {
      return res.status(404).json({ success: false, error: 'Servicio no encontrado' });
    }
    res.json({ success: true, data: list[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/prices
 */
router.get('/prices', async (req, res, next) => {
  try {
    const prices = await getCollection('site_prices', {
      where: [['active', '==', true]],
      orderBy: 'order',
      orderDirection: 'asc'
    });
    res.json({ success: true, data: prices });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/promotions
 */
router.get('/promotions', async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    const promotions = await getCollection('site_promotions', {
      where: [['active', '==', true]]
    });
    // Filtrar promociones no vencidas
    const validPromos = promotions.filter(p => !p.expiryDate || p.expiryDate >= now);
    res.json({ success: true, data: validPromos });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/gallery
 */
router.get('/gallery', async (req, res, next) => {
  try {
    if (publicCache.data.gallery) {
      return res.json({ success: true, data: publicCache.data.gallery });
    }
    const gallery = await getCollection('site_gallery', {
      where: [['active', '==', true]],
      orderBy: 'order',
      orderDirection: 'asc'
    });
    publicCache.data.gallery = gallery;
    res.json({ success: true, data: gallery });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/about
 */
router.get('/about', async (req, res, next) => {
  try {
    const about = await getDocument('site_about', 'main') || {};
    res.json({ success: true, data: about });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/faq
 */
router.get('/faq', async (req, res, next) => {
  try {
    const faq = await getCollection('site_faq', {
      where: [['active', '==', true]],
      orderBy: 'order',
      orderDirection: 'asc'
    });
    res.json({ success: true, data: faq });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/testimonials
 */
router.get('/testimonials', async (req, res, next) => {
  try {
    const testimonials = await getCollection('site_testimonials', {
      where: [['approved', '==', true]]
    });
    res.json({ success: true, data: testimonials });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/public/smart-quote
 * Formulario Inteligente de Presupuesto en Pasos (Cliente Registrado o Invitado)
 */
router.post('/smart-quote', upload.array('photos', 5), async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      vehicleCategory,
      vehicleBrand,
      vehicleModel,
      vehicleVersion,
      vehicleYear,
      vehicleEngine,
      vehicleFuel,
      repairType,
      componentType,
      componentBrand,
      componentRef,
      description,
      notes,
      customerId
    } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'El nombre es obligatorio.' });
    }
    if (!phone || phone.trim().length < 6) {
      return res.status(400).json({ success: false, error: 'Un teléfono de contacto válido es obligatorio.' });
    }
    if (!repairType) {
      return res.status(400).json({ success: false, error: 'Seleccione el tipo de reparación.' });
    }
    if (!description || description.trim().length < 4) {
      return res.status(400).json({ success: false, error: 'Detalle la falla o problema del componente.' });
    }

    const files = req.files || [];
    const photoUrls = [];
    for (const file of files) {
      const valid = validateImageFile(file, 8);
      if (valid.valid) {
        const uploaded = await uploadFile(file, 'quotes');
        photoUrls.push(uploaded.url);
      }
    }

    // Numeración secuencial atómica (ej: CONS-000001)
    const inquiryNumber = await getNextSequenceNumber('inquiries');
    const trackingCode = inquiryNumber;
    const verificationCode = phone.replace(/\D/g, '').slice(-4) || '1234';

    // Cálculo centralizado en el backend
    const pricingEstimate = await calculateQuoteBreakdown({
      vehicleCategory: vehicleCategory || 'Automóviles',
      vehicleBrand: vehicleBrand || '',
      vehicleModel: vehicleModel || '',
      vehicleYear: vehicleYear || '',
      repairType: repairType || 'Bomba Hidráulica',
      componentType: componentType || repairType || 'Bomba Hidráulica'
    });

    const isGuest = !customerId;
    const now = new Date().toISOString();

    const quoteData = {
      inquiryNumber,
      trackingCode,
      verificationCode,
      customerId: customerId || null,
      isGuest,
      name: name.trim(),
      phone: phone.trim(),
      email: (email || '').trim().toLowerCase(),
      vehicle: {
        category: vehicleCategory || '',
        brand: vehicleBrand || '',
        model: vehicleModel || '',
        version: vehicleVersion || '',
        year: vehicleYear || '',
        engine: vehicleEngine || '',
        fuel: vehicleFuel || ''
      },
      repairType: repairType.trim(),
      componentType: (componentType || repairType).trim(),
      componentBrand: (componentBrand || '').trim(),
      componentRef: (componentRef || '').trim(),
      description: description.trim(),
      notes: (notes || '').trim(),
      photos: photoUrls,
      pricingEstimate,
      status: 'Nueva consulta', // 'Nueva consulta' | 'En revisión' | 'Presupuesto enviado' | 'Aprobada'
      createdAt: now
    };

    const doc = await addDocument('quotes', quoteData);

    // Si es cliente no registrado, registrar en guest_customers para seguimiento CRM
    if (isGuest) {
      await addDocument('guest_customers', {
        name: quoteData.name,
        phone: quoteData.phone,
        email: quoteData.email,
        inquiryId: doc.id,
        inquiryNumber,
        createdAt: now
      });
    }

    // Respuesta automática por WhatsApp Business API (o fallback seguro)
    await sendAutoReplyQuoteReceived({
      name: quoteData.name,
      phone: quoteData.phone,
      inquiryNumber,
      vehicleBrand: quoteData.vehicle.brand,
      vehicleModel: quoteData.vehicle.model,
      repairType: quoteData.repairType
    });

    // Notificación en Dashboard administrativo
    await createNotification(
      'Nueva Consulta de Presupuesto',
      `Consulta ${inquiryNumber} de ${quoteData.name} para ${quoteData.repairType} (${quoteData.vehicle.brand} ${quoteData.vehicle.model}). Estimado: $ ${pricingEstimate.total.toLocaleString('es-AR')}.`,
      'info',
      `/admin/presupuestos.html`
    );

    res.status(201).json({
      success: true,
      message: 'Consulta de presupuesto registrada exitosamente.',
      inquiryNumber,
      trackingCode,
      verificationCode,
      estimate: {
        total: pricingEstimate.total,
        priceMode: pricingEstimate.priceMode,
        baseLabor: pricingEstimate.baseLabor
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/public/quote-request (Compatibilidad con formulario anterior)
 */
router.post('/quote-request', upload.array('photos', 5), validateQuoteRequest, async (req, res, next) => {
  try {
    const files = req.files || [];
    const photoUrls = [];

    for (const file of files) {
      const validCheck = validateImageFile(file, 8);
      if (validCheck.valid) {
        const uploaded = await uploadFile(file, 'quotes');
        photoUrls.push(uploaded.url);
      }
    }

    const inquiryNumber = await getNextSequenceNumber('inquiries');
    const trackingCode = inquiryNumber;
    const verificationCode = (req.body.phone || '0000').replace(/\D/g, '').slice(-4) || '1234';

    const quoteData = {
      inquiryNumber,
      trackingCode,
      verificationCode,
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email || '',
      repairType: req.body.repairType,
      brand: req.body.brand || '',
      model: req.body.model || '',
      description: req.body.description,
      notes: req.body.notes || '',
      photos: photoUrls,
      status: 'Nueva consulta',
      createdAt: new Date().toISOString()
    };

    const doc = await addDocument('quotes', quoteData);

    await sendAutoReplyQuoteReceived({
      name: quoteData.name,
      phone: quoteData.phone,
      inquiryNumber,
      vehicleBrand: quoteData.brand,
      vehicleModel: quoteData.model,
      repairType: quoteData.repairType
    });

    await createNotification(
      'Nueva Solicitud de Presupuesto',
      `Solicitud ${trackingCode} recibida de ${quoteData.name} para ${quoteData.repairType}.`,
      'info',
      `/admin/presupuestos.html`
    );

    res.status(201).json({
      success: true,
      message: 'Solicitud de presupuesto registrada con éxito.',
      trackingCode,
      verificationCode
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/tracking/:code
 * Consulta de estado pública para clientes
 */
router.get('/tracking/:code', async (req, res, next) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const verification = (req.query.verification || '').trim();

    // Buscar en ordenes de trabajo de reparaciones
    let repairs = await queryDocuments('repairs', { trackingCode: code });
    if (repairs.length === 0) {
      // Intentar buscar por orderNumber
      repairs = await queryDocuments('repairs', { orderNumber: code });
    }

    if (repairs.length > 0) {
      const repair = repairs[0];

      // Verificación de seguridad adicional (teléfono o pin)
      if (verification) {
        const clientPhone = (repair.clientPhone || '').replace(/\D/g, '');
        const cleanVerif = verification.replace(/\D/g, '');
        if (cleanVerif && !clientPhone.endsWith(cleanVerif) && repair.verificationCode !== verification) {
          return res.status(401).json({
            success: false,
            error: 'El código de verificación o últimos números de teléfono no coinciden con los registros.'
          });
        }
      }

      // Devolver solo información pública segura (sin notas de costos internos ni sueldos de técnicos)
      const publicTimeline = (repair.statusHistory || []).map(h => ({
        status: h.status,
        date: h.date,
        publicComment: h.publicComment || h.note || ''
      }));

      return res.json({
        success: true,
        data: {
          orderNumber: repair.orderNumber,
          trackingCode: repair.trackingCode,
          componentType: repair.componentType,
          brand: repair.brand,
          model: repair.model,
          receivedDate: repair.receivedDate || repair.createdAt,
          estimatedDeliveryDate: repair.estimatedDeliveryDate || 'A confirmar luego de pruebas',
          status: repair.status,
          statusText: repair.status,
          timeline: publicTimeline,
          budgetSummary: repair.budgetSummary || null,
          canApproveBudget: repair.status === 'Esperando aprobación'
        }
      });
    }

    // Si no está en reparaciones, buscar en solicitudes de presupuesto
    const quotes = await queryDocuments('quotes', { trackingCode: code });
    if (quotes.length > 0) {
      const quote = quotes[0];
      return res.json({
        success: true,
        data: {
          orderNumber: quote.trackingCode,
          trackingCode: quote.trackingCode,
          componentType: quote.repairType,
          brand: quote.brand,
          model: quote.model,
          receivedDate: quote.createdAt,
          status: quote.status,
          statusText: quote.status,
          timeline: [
            { status: 'Solicitud recibida', date: quote.createdAt, publicComment: 'Su solicitud fue ingresada y está siendo analizada por nuestros técnicos.' }
          ]
        }
      });
    }

    return res.status(404).json({
      success: false,
      error: 'No se encontró ninguna orden o solicitud con el código proporcionado.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/public/tracking/:code/approve
 * El cliente aprueba el presupuesto desde la vista de seguimiento pública
 */
router.post('/tracking/:code/approve', async (req, res, next) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const repairs = await queryDocuments('repairs', { trackingCode: code });
    if (repairs.length === 0) {
      return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    }

    const repair = repairs[0];
    const now = new Date().toISOString();
    const history = repair.statusHistory || [];
    history.push({
      status: 'Aprobado',
      date: now,
      user: 'Cliente (Portal Público)',
      publicComment: 'Presupuesto aprobado por el cliente desde el portal de seguimiento.'
    });

    await setDocument('repairs', repair.id, {
      status: 'Aprobado',
      statusHistory: history,
      approvedAt: now
    }, true);

    await createNotification(
      '¡Presupuesto Aprobado por Cliente!',
      `El cliente aprobó la orden ${repair.orderNumber} (${repair.componentType} ${repair.brand || ''}). Pasar a reparación.`,
      'success',
      `/admin/reparaciones.html`
    );

    res.json({
      success: true,
      message: 'Presupuesto aprobado con éxito. El equipo técnico comenzará las tareas de reparación.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = {
  router,
  invalidatePublicCache
};

