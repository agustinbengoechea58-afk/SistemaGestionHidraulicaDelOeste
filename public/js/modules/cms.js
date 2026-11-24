/**
 * Módulo CMS - Administración Total del Contenido de la Web Pública
 * Manejo de submódulos: Inicio, Servicios, Precios, Galería, Nosotros, FAQs, Banners, SEO y Publicación
 */

let currentCmsTab = 'home';
let cmsServices = [];
let cmsGallery = [];
let cmsFaqs = [];

async function initCMS() {
  setupCmsNavigation();
  await loadCmsHome();
  await loadCmsServices();
  await loadCmsGallery();
  await loadCmsFaqs();
  await loadCmsAbout();
  await loadCmsSeo();
}

/**
 * 1. Pestañas de Navegación del CMS
 */
function setupCmsNavigation() {
  document.querySelectorAll('.cms-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cms-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.cms-tab-content').forEach(c => c.classList.add('hidden'));

      btn.classList.add('active');
      const tab = btn.getAttribute('data-tab');
      currentCmsTab = tab;
      const target = document.getElementById(`cms-tab-${tab}`);
      if (target) target.classList.remove('hidden');
    });
  });

  // Botón Publicar Todo
  const publishBtn = document.getElementById('btn-publish-all');
  if (publishBtn) {
    publishBtn.addEventListener('click', async () => {
      if (!confirm('¿Desea publicar todos los cambios al sitio web público en vivo?')) return;
      try {
        publishBtn.disabled = true;
        publishBtn.innerHTML = `<span class="spinner"></span> Publicando...`;
        const res = await API.post('/api/cms/publish', {});
        if (res.success) {
          Toast.success(res.message);
        }
      } catch (err) {
        Toast.error(err.message);
      } finally {
        publishBtn.disabled = false;
        publishBtn.innerHTML = `<i class="fa-solid fa-upload" aria-hidden="true"></i> Publicar Cambios en Vivo`;
      }
    });
  }
}

/**
 * 2. CMS - Página de Inicio (Hero, Estadísticas)
 */
async function loadCmsHome() {
  try {
    const res = await API.get('/api/cms/home');
    if (res.success && res.data) {
      const h = res.data;
      setVal('cms-home-title', h.title || '');
      setVal('cms-home-subtitle', h.subtitle || '');
      setVal('cms-home-description', h.description || '');
      setVal('cms-home-heroImage', h.heroImage || '/assets/foto1.jpg');
      setVal('cms-home-btnText', h.primaryButtonText || 'Solicitar Presupuesto');
      setVal('cms-home-btnLink', h.primaryButtonLink || '#presupuesto');

      // Estadísticas
      if (Array.isArray(h.stats)) {
        h.stats.forEach((s, idx) => {
          if (idx < 4) {
            setVal(`cms-stat-val-${idx}`, s.value || '');
            setVal(`cms-stat-lbl-${idx}`, s.label || '');
          }
        });
      }
    }
  } catch (e) {
    console.error('Error cargando home CMS:', e);
  }
}

async function saveCmsHome(e) {
  e.preventDefault();
  const stats = [0, 1, 2, 3].map(idx => ({
    value: getVal(`cms-stat-val-${idx}`) || '',
    label: getVal(`cms-stat-lbl-${idx}`) || ''
  })).filter(s => s.value && s.label);

  const payload = {
    title: getVal('cms-home-title'),
    subtitle: getVal('cms-home-subtitle'),
    description: getVal('cms-home-description'),
    heroImage: getVal('cms-home-heroImage'),
    primaryButtonText: getVal('cms-home-btnText'),
    primaryButtonLink: getVal('cms-home-btnLink'),
    stats
  };

  try {
    const res = await API.post('/api/cms/home', payload);
    if (res.success) Toast.success(res.message);
  } catch (err) {
    Toast.error(err.message);
  }
}

/**
 * 3. CMS - Servicios (CRUD)
 */
async function loadCmsServices() {
  const tbody = document.getElementById('cms-services-table');
  if (!tbody) return;

  try {
    const res = await API.get('/api/cms/services');
    if (res.success) {
      cmsServices = res.data;
      tbody.innerHTML = cmsServices.map(s => `
        <tr>
          <td><img src="${s.image}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;"></td>
          <td><strong>${s.name}</strong></td>
          <td><span class="badge badge-gold">${s.category || 'General'}</span></td>
          <td>${s.price || 'A consultar'}</td>
          <td>
            <span class="badge ${s.active ? 'badge-success' : 'badge-danger'}">
              ${s.active ? 'PUBLICADO' : 'OCULTO'}
            </span>
          </td>
          <td class="text-right">
            <button class="btn btn-outline btn-sm" onclick="editCmsService('${s.id}')"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
            <button class="btn btn-secondary btn-sm" onclick="deleteCmsService('${s.id}', '${s.name}')" style="color: var(--color-danger);"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
          </td>
        </tr>
      `).join('');
    }
  } catch (e) {
    console.error('Error cargando servicios CMS:', e);
  }
}

function openCreateCmsServiceModal() {
  document.getElementById('cms-service-form').reset();
  document.getElementById('cms-service-id').value = '';
  document.getElementById('cms-service-modal-title').textContent = 'Nuevo Servicio';
  document.getElementById('cms-service-modal').classList.add('active');
}

function editCmsService(id) {
  const s = cmsServices.find(x => x.id === id);
  if (!s) return;

  document.getElementById('cms-service-id').value = s.id;
  document.getElementById('cms-service-name').value = s.name || '';
  document.getElementById('cms-service-category').value = s.category || 'Bombas';
  document.getElementById('cms-service-price').value = s.price || '';
  document.getElementById('cms-service-priceMode').value = s.priceMode || 'desde';
  document.getElementById('cms-service-image').value = s.image || '/assets/foto1.jpg';
  document.getElementById('cms-service-shortDesc').value = s.shortDescription || '';
  document.getElementById('cms-service-fullDesc').value = s.fullDescription || '';
  document.getElementById('cms-service-features').value = (s.features || []).join('\n');
  document.getElementById('cms-service-active').checked = s.active !== false;

  document.getElementById('cms-service-modal-title').textContent = `Editar Servicio: ${s.name}`;
  document.getElementById('cms-service-modal').classList.add('active');
}

async function saveCmsService(e) {
  e.preventDefault();
  const id = document.getElementById('cms-service-id').value;
  const featuresText = document.getElementById('cms-service-features').value.trim();
  const features = featuresText ? featuresText.split('\n').map(f => f.trim()).filter(Boolean) : [];

  const payload = {
    id: id || undefined,
    name: document.getElementById('cms-service-name').value.trim(),
    category: document.getElementById('cms-service-category').value,
    price: document.getElementById('cms-service-price').value.trim(),
    priceMode: document.getElementById('cms-service-priceMode').value,
    image: document.getElementById('cms-service-image').value.trim(),
    shortDescription: document.getElementById('cms-service-shortDesc').value.trim(),
    fullDescription: document.getElementById('cms-service-fullDesc').value.trim(),
    features,
    active: document.getElementById('cms-service-active').checked
  };

  try {
    const res = await API.post('/api/cms/services', payload);
    if (res.success) {
      Toast.success(res.message);
      document.getElementById('cms-service-modal').classList.remove('active');
      loadCmsServices();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

async function deleteCmsService(id, name) {
  if (!confirm(`¿Eliminar el servicio "${name}"?`)) return;
  try {
    const res = await API.delete(`/api/cms/services/${id}`);
    if (res.success) {
      Toast.success(res.message);
      loadCmsServices();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

/**
 * 4. CMS - Galería de Trabajos (CRUD)
 */
async function loadCmsGallery() {
  const container = document.getElementById('cms-gallery-grid');
  if (!container) return;

  try {
    const res = await API.get('/api/cms/gallery');
    if (res.success) {
      cmsGallery = res.data;
      container.innerHTML = cmsGallery.map(g => `
        <div class="card" style="padding: 0.75rem;">
          <img src="${g.image}" style="height: 140px; width: 100%; object-fit: cover; border-radius: var(--radius-md); margin-bottom: 0.5rem;">
          <h4 style="font-size: 0.95rem; margin-bottom: 0.2rem;">${g.title}</h4>
          <span class="badge badge-gold" style="font-size: 0.7rem;">${g.categoryName || g.category}</span>
          <div style="display: flex; justify-content: flex-end; gap: 0.3rem; margin-top: 0.75rem;">
            <button class="btn btn-secondary btn-sm" onclick="deleteCmsGallery('${g.id}', '${g.title}')" style="color: var(--color-danger); padding: 0.25rem 0.5rem;"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error(e);
  }
}

function openAddCmsGalleryModal() {
  document.getElementById('cms-gallery-form').reset();
  document.getElementById('cms-gallery-modal').classList.add('active');
}

async function saveCmsGallery(e) {
  e.preventDefault();
  const fileInput = document.getElementById('cms-gallery-file');
  let imageUrl = document.getElementById('cms-gallery-image-url').value.trim();

  // Si se seleccionó archivo local, subir primero
  if (fileInput.files && fileInput.files.length > 0) {
    const fd = new FormData();
    fd.append('image', fileInput.files[0]);
    fd.append('folder', 'gallery');
    const uploadRes = await API.upload('/api/cms/upload', fd);
    if (uploadRes.success) {
      imageUrl = uploadRes.url;
    }
  }

  if (!imageUrl) {
    Toast.warning('Debe seleccionar una imagen o ingresar su URL.');
    return;
  }

  const payload = {
    title: document.getElementById('cms-gallery-title').value.trim(),
    category: document.getElementById('cms-gallery-category').value,
    categoryName: document.getElementById('cms-gallery-category').options[document.getElementById('cms-gallery-category').selectedIndex].text,
    description: document.getElementById('cms-gallery-desc').value.trim(),
    image: imageUrl,
    active: true
  };

  try {
    const res = await API.post('/api/cms/gallery', payload);
    if (res.success) {
      Toast.success(res.message);
      document.getElementById('cms-gallery-modal').classList.remove('active');
      loadCmsGallery();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

async function deleteCmsGallery(id, title) {
  if (!confirm(`¿Eliminar fotografía "${title}"?`)) return;
  try {
    const res = await API.delete(`/api/cms/gallery/${id}`);
    if (res.success) {
      Toast.success(res.message);
      loadCmsGallery();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

/**
 * 5. CMS - Nosotros
 */
async function loadCmsAbout() {
  try {
    const res = await API.get('/api/cms/about');
    if (res.success && res.data) {
      const a = res.data;
      setVal('cms-about-title', a.title || '');
      setVal('cms-about-history', a.history || '');
      setVal('cms-about-mission', a.mission || '');
      setVal('cms-about-vision', a.vision || '');
    }
  } catch (e) {
    console.error(e);
  }
}

async function saveCmsAbout(e) {
  e.preventDefault();
  const payload = {
    title: getVal('cms-about-title'),
    history: getVal('cms-about-history'),
    mission: getVal('cms-about-mission'),
    vision: getVal('cms-about-vision')
  };

  try {
    const res = await API.post('/api/cms/about', payload);
    if (res.success) Toast.success(res.message);
  } catch (err) {
    Toast.error(err.message);
  }
}

/**
 * 6. CMS - Preguntas Frecuentes (FAQs)
 */
async function loadCmsFaqs() {
  const container = document.getElementById('cms-faqs-list');
  if (!container) return;

  try {
    const res = await API.get('/api/cms/faq');
    if (res.success) {
      cmsFaqs = res.data;
      container.innerHTML = cmsFaqs.map(f => `
        <div class="card" style="margin-bottom: 0.75rem; padding: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <strong class="text-white">${f.question}</strong>
              <p class="text-muted" style="font-size: 0.88rem; margin-top: 0.3rem;">${f.answer}</p>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="deleteCmsFaq('${f.id}')" style="color: var(--color-danger); margin-left: 1rem;"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error(e);
  }
}

function openAddCmsFaqModal() {
  document.getElementById('cms-faq-form').reset();
  document.getElementById('cms-faq-modal').classList.add('active');
}

async function saveCmsFaq(e) {
  e.preventDefault();
  const payload = {
    question: document.getElementById('cms-faq-question').value.trim(),
    answer: document.getElementById('cms-faq-answer').value.trim(),
    category: document.getElementById('cms-faq-category').value
  };

  try {
    const res = await API.post('/api/cms/faq', payload);
    if (res.success) {
      Toast.success(res.message);
      document.getElementById('cms-faq-modal').classList.remove('active');
      loadCmsFaqs();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

async function deleteCmsFaq(id) {
  if (!confirm('¿Eliminar pregunta frecuente?')) return;
  try {
    const res = await API.delete(`/api/cms/faq/${id}`);
    if (res.success) {
      Toast.success(res.message);
      loadCmsFaqs();
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

/**
 * 7. CMS - SEO
 */
async function loadCmsSeo() {
  try {
    const res = await API.get('/api/cms/seo');
    if (res.success && res.data) {
      const s = res.data;
      setVal('cms-seo-title', s.title || '');
      setVal('cms-seo-metaDescription', s.description || '');
      setVal('cms-seo-keywords', s.keywords || '');
    }
  } catch (e) {
    console.error(e);
  }
}

async function saveCmsSeo(e) {
  e.preventDefault();
  const payload = {
    title: getVal('cms-seo-title'),
    description: getVal('cms-seo-metaDescription'),
    keywords: getVal('cms-seo-keywords')
  };

  try {
    const res = await API.post('/api/cms/seo', payload);
    if (res.success) Toast.success(res.message);
  } catch (err) {
    Toast.error(err.message);
  }
}

// Helpers
function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('cms-tab-home')) {
    initCMS();

    const homeForm = document.getElementById('cms-home-form');
    if (homeForm) homeForm.addEventListener('submit', saveCmsHome);

    const serviceForm = document.getElementById('cms-service-form');
    if (serviceForm) serviceForm.addEventListener('submit', saveCmsService);

    const galleryForm = document.getElementById('cms-gallery-form');
    if (galleryForm) galleryForm.addEventListener('submit', saveCmsGallery);

    const aboutForm = document.getElementById('cms-about-form');
    if (aboutForm) aboutForm.addEventListener('submit', saveCmsAbout);

    const faqForm = document.getElementById('cms-faq-form');
    if (faqForm) faqForm.addEventListener('submit', saveCmsFaq);

    const seoForm = document.getElementById('cms-seo-form');
    if (seoForm) seoForm.addEventListener('submit', saveCmsSeo);
  }
});

