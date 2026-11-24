/**
 * Rutas del Sistema CMS - Administración Total del Contenido Web
 * Controla colecciones site_settings, site_home, site_services, site_prices, etc.
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/permissions');
const { 
  getCollection, 
  getDocument, 
  setDocument, 
  addDocument, 
  deleteDocument 
} = require('../services/firestore.service');
const { uploadFile, validateImageFile } = require('../services/storage.service');
const { invalidatePublicCache } = require('./public.routes');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Todas las rutas del CMS requieren rol SUPERADMIN o ADMIN
router.use(authenticate, authorize(['SUPERADMIN', 'ADMIN']));

/**
 * POST /api/cms/upload
 * Subida de imágenes para el CMS (banners, servicios, galería)
 */
router.post('/upload', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se subió ninguna imagen' });
    }
    const check = validateImageFile(req.file);
    if (!check.valid) {
      return res.status(400).json({ success: false, error: check.error });
    }
    const folder = req.body.folder || 'cms';
    const result = await uploadFile(req.file, folder);
    res.json({
      success: true,
      url: result.url,
      filename: result.filename
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET y POST para Módulos Individuales del CMS
 */

// 1. Información General y Contacto
router.get('/settings', async (req, res, next) => {
  try {
    const doc = await getDocument('site_settings', 'main') || {};
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

router.post('/settings', async (req, res, next) => {
  try {
    const updated = await setDocument('site_settings', 'main', req.body);
    await logRevision('site_settings', 'main', 'Actualización de configuración general', req.user);
    invalidatePublicCache();
    res.json({ success: true, data: updated, message: 'Configuración guardada exitosamente.' });
  } catch (err) {
    next(err);
  }
});

router.get('/contact', async (req, res, next) => {
  try {
    const doc = await getDocument('site_contact', 'main') || {};
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

router.post('/contact', async (req, res, next) => {
  try {
    const updated = await setDocument('site_contact', 'main', req.body);
    await logRevision('site_contact', 'main', 'Actualización de datos de contacto', req.user);
    invalidatePublicCache();
    res.json({ success: true, data: updated, message: 'Datos de contacto guardados exitosamente.' });
  } catch (err) {
    next(err);
  }
});

// 2. Página de Inicio (Hero, Estadísticas, CTA)
router.get('/home', async (req, res, next) => {
  try {
    const doc = await getDocument('site_home', 'main') || {};
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

router.post('/home', async (req, res, next) => {
  try {
    const updated = await setDocument('site_home', 'main', req.body);
    await logRevision('site_home', 'main', 'Modificación de Inicio / Hero', req.user);
    invalidatePublicCache();
    res.json({ success: true, data: updated, message: 'Página de inicio actualizada.' });
  } catch (err) {
    next(err);
  }
});

// 3. Secciones y Orden de Visualización
router.get('/sections', async (req, res, next) => {
  try {
    const doc = await getDocument('site_sections', 'main') || {};
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

router.post('/sections', async (req, res, next) => {
  try {
    const updated = await setDocument('site_sections', 'main', req.body);
    await logRevision('site_sections', 'main', 'Reordenamiento de secciones públicas', req.user);
    invalidatePublicCache();
    res.json({ success: true, data: updated, message: 'Orden y visibilidad de secciones guardado.' });
  } catch (err) {
    next(err);
  }
});

// 4. Nosotros (Historia, Misión, Visión, Valores)
router.get('/about', async (req, res, next) => {
  try {
    const doc = await getDocument('site_about', 'main') || {};
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

router.post('/about', async (req, res, next) => {
  try {
    const updated = await setDocument('site_about', 'main', req.body);
    await logRevision('site_about', 'main', 'Actualización de Nosotros', req.user);
    invalidatePublicCache();
    res.json({ success: true, data: updated, message: 'Información institucional guardada.' });
  } catch (err) {
    next(err);
  }
});

// 5. SEO
router.get('/seo', async (req, res, next) => {
  try {
    const doc = await getDocument('site_seo', 'main') || {};
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

router.post('/seo', async (req, res, next) => {
  try {
    const updated = await setDocument('site_seo', 'main', req.body);
    await logRevision('site_seo', 'main', 'Actualización de Metadatos SEO', req.user);
    invalidatePublicCache();
    res.json({ success: true, data: updated, message: 'Parámetros SEO guardados.' });
  } catch (err) {
    next(err);
  }
});

// 6. Servicios (CRUD)
router.get('/services', async (req, res, next) => {
  try {
    const list = await getCollection('site_services', { orderBy: 'order', orderDirection: 'asc' });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/services', async (req, res, next) => {
  try {
    const { name, shortDescription, fullDescription, price, priceMode, image, category, active, featured, order, features } = req.body;
    const slug = req.body.slug || (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const serviceData = {
      name,
      slug,
      shortDescription,
      fullDescription,
      price: price || '',
      priceMode: priceMode || 'consultar', // 'fijo' | 'desde' | 'hasta' | 'consultar' | 'diagnostico'
      image: image || '/assets/foto1.jpg',
      category: category || 'Bombas',
      features: features || [],
      active: active !== false,
      featured: featured === true,
      order: Number(order) || 0
    };

    let doc;
    if (req.body.id) {
      doc = await setDocument('site_services', req.body.id, serviceData);
      await logRevision('site_services', req.body.id, `Edición servicio: ${name}`, req.user);
    } else {
      doc = await addDocument('site_services', serviceData);
      await logRevision('site_services', doc.id, `Creación servicio: ${name}`, req.user);
    }
    invalidatePublicCache();
    res.json({ success: true, data: doc, message: 'Servicio guardado con éxito.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/services/:id', async (req, res, next) => {
  try {
    await deleteDocument('site_services', req.params.id);
    await logRevision('site_services', req.params.id, 'Eliminación de servicio', req.user);
    invalidatePublicCache();
    res.json({ success: true, message: 'Servicio eliminado.' });
  } catch (err) {
    next(err);
  }
});

// 7. Precios (CRUD)
router.get('/prices', async (req, res, next) => {
  try {
    const list = await getCollection('site_prices', { orderBy: 'order', orderDirection: 'asc' });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/prices', async (req, res, next) => {
  try {
    const priceData = {
      title: req.body.title,
      category: req.body.category,
      priceType: req.body.priceType || 'fijo', // 'fijo' | 'desde' | 'hasta' | 'consultar' | 'diagnostico'
      amount: Number(req.body.amount) || 0,
      currency: req.body.currency || 'ARS',
      description: req.body.description || '',
      includes: req.body.includes || [],
      active: req.body.active !== false,
      order: Number(req.body.order) || 0
    };

    let doc;
    if (req.body.id) {
      doc = await setDocument('site_prices', req.body.id, priceData);
    } else {
      doc = await addDocument('site_prices', priceData);
    }
    await logRevision('site_prices', doc.id, `Precio guardado: ${priceData.title}`, req.user);
    invalidatePublicCache();
    res.json({ success: true, data: doc, message: 'Precio registrado.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/prices/:id', async (req, res, next) => {
  try {
    await deleteDocument('site_prices', req.params.id);
    invalidatePublicCache();
    res.json({ success: true, message: 'Precio eliminado.' });
  } catch (err) {
    next(err);
  }
});

// 8. Galería de Trabajos (CRUD)
router.get('/gallery', async (req, res, next) => {
  try {
    const list = await getCollection('site_gallery', { orderBy: 'order', orderDirection: 'asc' });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/gallery', async (req, res, next) => {
  try {
    const itemData = {
      title: req.body.title,
      category: req.body.category || 'bombas',
      categoryName: req.body.categoryName || 'Bombas Hidráulicas',
      description: req.body.description || '',
      image: req.body.image || '/assets/foto1.jpg',
      featured: req.body.featured === true,
      active: req.body.active !== false,
      order: Number(req.body.order) || 0
    };

    let doc;
    if (req.body.id) {
      doc = await setDocument('site_gallery', req.body.id, itemData);
    } else {
      doc = await addDocument('site_gallery', itemData);
    }
    await logRevision('site_gallery', doc.id, `Elemento de galería: ${itemData.title}`, req.user);
    invalidatePublicCache();
    res.json({ success: true, data: doc, message: 'Elemento de galería guardado.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/gallery/:id', async (req, res, next) => {
  try {
    await deleteDocument('site_gallery', req.params.id);
    invalidatePublicCache();
    res.json({ success: true, message: 'Fotografía eliminada de la galería.' });
  } catch (err) {
    next(err);
  }
});

// 9. Preguntas Frecuentes (CRUD)
router.get('/faq', async (req, res, next) => {
  try {
    const list = await getCollection('site_faq', { orderBy: 'order', orderDirection: 'asc' });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/faq', async (req, res, next) => {
  try {
    const faqData = {
      question: req.body.question,
      answer: req.body.answer,
      category: req.body.category || 'General',
      active: req.body.active !== false,
      order: Number(req.body.order) || 0
    };

    let doc;
    if (req.body.id) {
      doc = await setDocument('site_faq', req.body.id, faqData);
    } else {
      doc = await addDocument('site_faq', faqData);
    }
    invalidatePublicCache();
    res.json({ success: true, data: doc, message: 'Pregunta frecuente guardada.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/faq/:id', async (req, res, next) => {
  try {
    await deleteDocument('site_faq', req.params.id);
    invalidatePublicCache();
    res.json({ success: true, message: 'Pregunta eliminada.' });
  } catch (err) {
    next(err);
  }
});

// 10. Testimonios (CRUD y Aprobación)
router.get('/testimonials', async (req, res, next) => {
  try {
    const list = await getCollection('site_testimonials');
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/testimonials', async (req, res, next) => {
  try {
    const testData = {
      author: req.body.author,
      company: req.body.company || '',
      content: req.body.content,
      rating: Math.min(5, Math.max(1, Number(req.body.rating) || 5)),
      approved: req.body.approved === true,
      date: req.body.date || new Date().toISOString()
    };

    let doc;
    if (req.body.id) {
      doc = await setDocument('site_testimonials', req.body.id, testData);
    } else {
      doc = await addDocument('site_testimonials', testData);
    }
    invalidatePublicCache();
    res.json({ success: true, data: doc, message: 'Testimonio registrado.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/testimonials/:id', async (req, res, next) => {
  try {
    await deleteDocument('site_testimonials', req.params.id);
    invalidatePublicCache();
    res.json({ success: true, message: 'Testimonio eliminado.' });
  } catch (err) {
    next(err);
  }
});

// 11. Promociones (CRUD)
router.get('/promotions', async (req, res, next) => {
  try {
    const list = await getCollection('site_promotions');
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/promotions', async (req, res, next) => {
  try {
    const promoData = {
      title: req.body.title,
      description: req.body.description,
      discountType: req.body.discountType || 'percent', // 'percent' | 'fixed'
      discountValue: Number(req.body.discountValue) || 0,
      expiryDate: req.body.expiryDate || '',
      serviceId: req.body.serviceId || '',
      bannerImage: req.body.bannerImage || '',
      active: req.body.active !== false
    };

    let doc;
    if (req.body.id) {
      doc = await setDocument('site_promotions', req.body.id, promoData);
    } else {
      doc = await addDocument('site_promotions', promoData);
    }
    invalidatePublicCache();
    res.json({ success: true, data: doc, message: 'Promoción guardada.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/promotions/:id', async (req, res, next) => {
  try {
    await deleteDocument('site_promotions', req.params.id);
    invalidatePublicCache();
    res.json({ success: true, message: 'Promoción eliminada.' });
  } catch (err) {
    next(err);
  }
});

// 12. Banners y Anuncios (CRUD)
router.get('/banners', async (req, res, next) => {
  try {
    const list = await getCollection('site_banners', { orderBy: 'order', orderDirection: 'asc' });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/banners', async (req, res, next) => {
  try {
    const bannerData = {
      title: req.body.title,
      subtitle: req.body.subtitle || '',
      imageUrl: req.body.imageUrl,
      buttonText: req.body.buttonText || '',
      buttonLink: req.body.buttonLink || '',
      active: req.body.active !== false,
      order: Number(req.body.order) || 0
    };

    let doc;
    if (req.body.id) {
      doc = await setDocument('site_banners', req.body.id, bannerData);
    } else {
      doc = await addDocument('site_banners', bannerData);
    }
    invalidatePublicCache();
    res.json({ success: true, data: doc, message: 'Banner publicitario guardado.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/banners/:id', async (req, res, next) => {
  try {
    await deleteDocument('site_banners', req.params.id);
    invalidatePublicCache();
    res.json({ success: true, message: 'Banner eliminado.' });
  } catch (err) {
    next(err);
  }
});

// 13. Publicación Global e Invalidación
router.post('/publish', async (req, res, next) => {
  try {
    invalidatePublicCache();
    const revision = await logRevision('global', 'all', 'Publicación integral de cambios en sitio web público', req.user);
    res.json({
      success: true,
      message: '¡Sitio web publicado y actualizado exitosamente! Los cambios ya están en vivo.',
      revisionId: revision.id
    });
  } catch (err) {
    next(err);
  }
});

// 14. Auditoría de Revisiones (Historial de cambios)
router.get('/revisions', async (req, res, next) => {
  try {
    const list = await getCollection('site_revisions', { orderBy: 'createdAt', orderDirection: 'desc', limit: 25 });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

async function logRevision(moduleName, documentId, description, user = {}) {
  try {
    return await addDocument('site_revisions', {
      moduleName,
      documentId,
      description,
      userEmail: user.email || 'admin@sistema.local',
      userName: user.name || 'Administrador',
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.error('Error al guardar auditoría de revisión:', e.message);
    return {};
  }
}

module.exports = router;

