/**
 * Lógica Dinámica de la Web Pública
 * Carga contenidos del CMS, interactividad, galería, FAQs y solicitud de presupuestos
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Ocultar preloader de carga
  const preloader = document.getElementById('page-preloader');
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add('fade-out');
      setTimeout(() => preloader.remove(), 450);
    }, 350);
  }

  initPublicHeader();
  await loadPublicConfig();
  
  if (document.getElementById('hero-section')) {
    await loadHomePage();
  }

  // Inicializar carrousel de imágenes
  initCarousel();
  
  if (document.getElementById('services-container')) {
    await loadServices();
  }

  if (document.getElementById('gallery-container')) {
    await loadGallery();
  }

  if (document.getElementById('faq-container')) {
    await loadFaqs();
  }

  initQuoteForm();
  initTrackingPage();
});

let globalCompanyConfig = {};

/**
 * 1. Inicializar Header y Menú Responsive
 */
function initPublicHeader() {
  const header = document.querySelector('.public-header');
  const toggleBtn = document.querySelector('.mobile-menu-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });

    // Cerrar al hacer clic en un enlace
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
      });
    });
  }
}

/**
 * 2. Cargar Configuración General del Negocio
 */
async function loadPublicConfig() {
  try {
    const res = await API.get('/api/public/config');
    if (res.success && res.data) {
      globalCompanyConfig = res.data;
      const c = res.data;

      // Actualizar nombres y branding en toda la interfaz
      document.querySelectorAll('.company-name').forEach(el => el.textContent = c.name);
      document.querySelectorAll('.preloader-text').forEach(el => el.textContent = c.name);
      document.querySelectorAll('.company-copyright').forEach(el => {
        el.innerHTML = `&copy; ${new Date().getFullYear()} ${c.name}. Todos los derechos reservados.`;
      });
      document.querySelectorAll('.footer-bottom').forEach(el => {
        el.innerHTML = `&copy; ${new Date().getFullYear()} ${c.name}. Todos los derechos reservados.`;
      });

      // Actualizar título del documento dinámicamente con el nombre desde .env
      if (document.title.includes('Hidraulica del oeste A.B') || document.title.includes('Hidraulica del oeste') || document.title.includes('Bengoechea')) {
        document.title = document.title
          .replace('Hidraulica del oeste A.B & Cremalleras', c.name)
          .replace('Hidraulica del oeste A.B', c.name)
          .replace('Bengoechea', c.name);
      }

      // Si el carrousel ya está en pantalla, actualizar el título del slide institucional
      if (CAROUSEL_SLIDES && CAROUSEL_SLIDES[4]) {
        CAROUSEL_SLIDES[4].title = c.name;
      }

      document.querySelectorAll('.company-phone').forEach(el => el.textContent = c.phone);
      document.querySelectorAll('.company-email').forEach(el => el.textContent = c.email);
      document.querySelectorAll('.company-address').forEach(el => el.textContent = `${c.address}, ${c.city}`);
      document.querySelectorAll('.company-hours').forEach(el => el.textContent = c.hours);

      // Botones de WhatsApp
      document.querySelectorAll('.whatsapp-link').forEach(btn => {
        const cleanPhone = (c.whatsapp || '').replace(/\D/g, '');
        const text = encodeURIComponent(`Hola ${c.name}, quisiera consultar por la reparación de un componente hidráulico.`);
        btn.href = `https://wa.me/${cleanPhone}?text=${text}`;
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
      });

      // Teléfono directo
      document.querySelectorAll('.phone-link').forEach(btn => {
        btn.href = `tel:${(c.phone || '').replace(/\D/g, '')}`;
      });

      // Enlaces y Botones de Redes Sociales (Instagram, Facebook, YouTube)
      const socials = c.socials || {};
      
      // Instagram
      if (socials.instagram) {
        document.querySelectorAll('.instagram-link').forEach(btn => {
          btn.href = socials.instagram;
          btn.target = '_blank';
          btn.rel = 'noopener noreferrer';
          btn.title = 'Visitar nuestro Instagram';
        });
      }

      // Facebook
      if (socials.facebook) {
        document.querySelectorAll('.facebook-link').forEach(btn => {
          btn.href = socials.facebook;
          btn.target = '_blank';
          btn.rel = 'noopener noreferrer';
          btn.title = 'Visitar nuestra página de Facebook';
        });
      }

      // YouTube
      if (socials.youtube) {
        document.querySelectorAll('.youtube-link').forEach(btn => {
          btn.href = socials.youtube;
          btn.target = '_blank';
          btn.rel = 'noopener noreferrer';
          btn.title = 'Ver nuestro canal de YouTube';
        });
      }
    }
  } catch (err) {
    console.warn('Usando configuración predeterminada:', err.message);
  }
}

/**
 * 3. Cargar Portada y Estadísticas
 */
async function loadHomePage() {
  try {
    const res = await API.get('/api/public/home');
    if (res.success && res.data) {
      const h = res.data.hero;
      if (h) {
        const titleEl = document.getElementById('hero-title');
        const subtitleEl = document.getElementById('hero-subtitle');
        const descEl = document.getElementById('hero-description');
        const heroImg = document.getElementById('hero-image');

        if (titleEl && h.title) titleEl.innerHTML = h.title;
        if (subtitleEl && h.subtitle) subtitleEl.textContent = h.subtitle;
        if (descEl && h.description) descEl.textContent = h.description;
        if (heroImg && h.heroImage) heroImg.src = h.heroImage;

        // Renderizar estadísticas
        const statsContainer = document.getElementById('hero-stats-container');
        if (statsContainer && Array.isArray(h.stats)) {
          statsContainer.innerHTML = h.stats.map(s => `
            <div class="stat-item">
              <span class="stat-number">${s.value}</span>
              <span class="stat-label">${s.label}</span>
            </div>
          `).join('');
        }
      }
    }
  } catch (e) {
    console.error('Error cargando página de inicio:', e);
  }
}

/**
 * ==========================================================
 * CARROUSEL DE IMÁGENES PROFESIONAL & EXTENSIBLE
 * ==========================================================
 * Para agregar más imágenes al carrousel desde código o scripts,
 * simplemente agregue un nuevo objeto al array CAROUSEL_SLIDES
 * o llame en cualquier momento a: window.addCarouselSlide(imagen, titulo, descripcion, categoria)
 */
const CAROUSEL_SLIDES = [
  {
    image: '/assets/foto1.jpg',
    title: 'Laboratorio y Banco de Calibración Hidráulica',
    description: 'Diagnóstico bajo normas de estricta precisión con manómetros glicerinados de alta presión para bombas y cremalleras.',
    tag: 'Banco de Pruebas 350 BAR'
  },
  {
    image: '/assets/foto2.jpg',
    title: 'Despiece y Rectificado de Precisión',
    description: 'Mecanizado milimétrico, pulido de barra dentada y reemplazo integral de bujes y retenes de vitón de alta temperatura.',
    tag: 'Reparación Técnica'
  },
  {
    image: '/assets/imagen3.jpg',
    title: 'Ensayos de Presión y Cero Fugas',
    description: 'Cada componente es sometido a ciclado térmico y presión continua de trabajo antes de emitir la garantía escrita.',
    tag: 'Control de Calidad 100%'
  },
  {
    image: '/assets/imagen4.jpg',
    title: 'Taller Central Equipado con Maquinaria de Vanguardia',
    description: 'Instalaciones preparadas para dar respuesta inmediata a vehículos particulares, utilitarios y flotas pesadas.',
    tag: 'Infraestructura Especializada'
  },
  {
    image: '/assets/logo2.jpg',
    title: (typeof globalCompanyConfig !== 'undefined' && globalCompanyConfig.name) ? globalCompanyConfig.name : 'Especialistas en Hidráulica & Cremalleras',
    description: 'Más de dos décadas de trayectoria respaldadas por diagnóstico computarizado y atención directa de especialistas.',
    tag: 'Garantía Escrita 6 Meses'
  }
];

let currentCarouselIndex = 0;
let carouselAutoplayTimer = null;

function initCarousel() {
  const container = document.getElementById('neon-carousel-container');
  if (!container) return;

  // Renderizar la estructura del carrousel
  container.innerHTML = `
    <div class="neon-carousel">
      <div class="carousel-viewport" id="carousel-viewport">
        <div class="carousel-track" id="carousel-track">
          ${CAROUSEL_SLIDES.map((slide, idx) => `
            <div class="carousel-slide ${idx === 0 ? 'active' : ''}">
              <img src="${slide.image}" alt="${slide.title}" loading="${idx === 0 ? 'eager' : 'lazy'}">
              <div class="carousel-overlay">
                <div class="carousel-caption">
                  <span class="carousel-badge-tag"><i class="fa-solid fa-gauge-high" aria-hidden="true"></i> ${slide.tag}</span>
                  <h3 class="carousel-slide-title">${slide.title}</h3>
                  <p class="carousel-slide-desc">${slide.description}</p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Botones de Navegación Neón -->
      <button type="button" class="carousel-btn carousel-btn-prev" id="carousel-prev-btn" aria-label="Foto anterior">
        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
      </button>
      <button type="button" class="carousel-btn carousel-btn-next" id="carousel-btn-next" aria-label="Siguiente foto">
        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
      </button>

      <!-- Indicadores / Puntos -->
      <div class="carousel-indicators" id="carousel-indicators">
        ${CAROUSEL_SLIDES.map((_, idx) => `
          <button type="button" class="carousel-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}" aria-label="Ir a diapositiva ${idx + 1}"></button>
        `).join('')}
      </div>
    </div>
  `;

  const track = document.getElementById('carousel-track');
  const prevBtn = document.getElementById('carousel-prev-btn');
  const nextBtn = document.getElementById('carousel-btn-next');
  const dots = document.querySelectorAll('.carousel-dot');
  const viewport = document.getElementById('carousel-viewport');

  function updateSlide(index) {
    if (index < 0) index = CAROUSEL_SLIDES.length - 1;
    if (index >= CAROUSEL_SLIDES.length) index = 0;
    currentCarouselIndex = index;

    if (track) {
      track.style.transform = `translateX(-${currentCarouselIndex * 100}%)`;
    }

    document.querySelectorAll('.carousel-slide').forEach((slide, idx) => {
      slide.classList.toggle('active', idx === currentCarouselIndex);
    });

    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentCarouselIndex);
    });
  }

  function nextSlide() {
    updateSlide(currentCarouselIndex + 1);
  }

  function prevSlide() {
    updateSlide(currentCarouselIndex - 1);
  }

  if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); resetAutoplay(); });
  if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); resetAutoplay(); });

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.getAttribute('data-index'), 10);
      updateSlide(idx);
      resetAutoplay();
    });
  });

  // Autoplay cada 5 segundos
  function startAutoplay() {
    carouselAutoplayTimer = setInterval(nextSlide, 5000);
  }

  function resetAutoplay() {
    if (carouselAutoplayTimer) clearInterval(carouselAutoplayTimer);
    startAutoplay();
  }

  startAutoplay();

  // Pausar autoplay al pasar el ratón
  if (viewport) {
    viewport.addEventListener('mouseenter', () => clearInterval(carouselAutoplayTimer));
    viewport.addEventListener('mouseleave', () => resetAutoplay());

    // Soporte gestual Swipe táctil en móviles
    let touchStartX = 0;
    let touchEndX = 0;

    viewport.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      clearInterval(carouselAutoplayTimer);
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const swipeDistance = touchEndX - touchStartX;
      if (swipeDistance > 50) {
        prevSlide();
      } else if (swipeDistance < -50) {
        nextSlide();
      }
      resetAutoplay();
    }, { passive: true });
  }
}

/**
 * Función pública para que el usuario pueda agregar más diapositivas dinámicamente
 */
window.addCarouselSlide = function(image, title, description, tag = 'Trabajo Realizado') {
  CAROUSEL_SLIDES.push({ image, title, description, tag });
  initCarousel();
};

/**
 * 4. Cargar Catálogo de Servicios con Skeleton Loading
 */
async function loadServices() {
  const container = document.getElementById('services-container');
  if (!container) return;

  // Efecto de carga Skeleton previo a la respuesta del API
  container.innerHTML = `
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
  `;

  try {
    const res = await API.get('/api/public/services');
    if (res.success && Array.isArray(res.data)) {
      if (res.data.length === 0) {
        container.innerHTML = `<p class="text-muted text-center" style="grid-column: 1/-1;">No hay servicios publicados actualmente.</p>`;
        return;
      }

      container.innerHTML = res.data.map(srv => `
        <div class="service-card">
          <div class="service-img-wrap">
            <img src="${srv.image || '/assets/foto1.jpg'}" alt="${srv.name}" loading="lazy">
            <span class="service-category-tag"><i class="fa-solid fa-wrench" aria-hidden="true"></i> ${srv.category || 'Hidráulica'}</span>
          </div>
          <div class="service-body">
            <h3 class="service-title">${srv.name}</h3>
            <p class="service-desc">${srv.shortDescription || ''}</p>
            ${Array.isArray(srv.features) && srv.features.length > 0 ? `
              <ul class="service-features">
                ${srv.features.map(f => `<li><i class="fa-solid fa-circle-check text-gold" aria-hidden="true"></i> ${f}</li>`).join('')}
              </ul>
            ` : ''}
            <div class="service-footer">
              <div class="service-price">${srv.price || 'A consultar'}</div>
              <a href="#presupuesto" class="btn btn-outline btn-sm" onclick="selectServiceForQuote('${srv.name}')">
                <i class="fa-solid fa-file-invoice-dollar" aria-hidden="true"></i> Consultar
              </a>
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    container.innerHTML = `<p class="text-danger">Error cargando servicios.</p>`;
  }
}

window.selectServiceForQuote = function(serviceName) {
  const select = document.getElementById('repairType');
  if (select) {
    for (let opt of select.options) {
      if (opt.value.toLowerCase().includes(serviceName.toLowerCase()) || serviceName.toLowerCase().includes(opt.value.toLowerCase())) {
        select.value = opt.value;
        break;
      }
    }
  }
};

/**
 * 5. Cargar Galería de Trabajos y Filtros con Skeleton Loading
 */
let allGalleryItems = [];

async function loadGallery() {
  const container = document.getElementById('gallery-container');
  if (!container) return;

  // Efecto Skeleton para la galería
  container.innerHTML = `
    <div class="skeleton" style="height: 250px; border-radius: var(--radius-lg);"></div>
    <div class="skeleton" style="height: 250px; border-radius: var(--radius-lg);"></div>
    <div class="skeleton" style="height: 250px; border-radius: var(--radius-lg);"></div>
    <div class="skeleton" style="height: 250px; border-radius: var(--radius-lg);"></div>
  `;

  try {
    const res = await API.get('/api/public/gallery');
    if (res.success && Array.isArray(res.data)) {
      allGalleryItems = res.data;
      renderGalleryItems(allGalleryItems);
      setupGalleryFilters();
    }
  } catch (e) {
    container.innerHTML = `<p class="text-muted">Error cargando galería.</p>`;
  }
}

function renderGalleryItems(items) {
  const container = document.getElementById('gallery-container');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<p class="text-muted text-center" style="grid-column: 1/-1; padding: 2rem;">No se encontraron fotografías en esta categoría.</p>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="gallery-item" onclick="openLightbox('${item.image}', '${item.title}', '${item.description || ''}')">
      <img src="${item.image}" alt="${item.title}" loading="lazy">
      <div class="gallery-overlay">
        <span class="gallery-item-category">${item.categoryName || item.category || 'Trabajo'}</span>
        <h4 class="gallery-item-title">${item.title}</h4>
      </div>
    </div>
  `).join('');
}

function setupGalleryFilters() {
  const buttons = document.querySelectorAll('.gallery-filters .filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-filter');

      if (cat === 'all') {
        renderGalleryItems(allGalleryItems);
      } else {
        const filtered = allGalleryItems.filter(item => item.category === cat);
        renderGalleryItems(filtered);
      }
    });
  });
}

// Lightbox Modal para Visualización de Trabajos en Tamaño Completo
window.openLightbox = function(imageSrc, title, desc) {
  let modal = document.getElementById('lightbox-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'lightbox-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-content lightbox-modal-window" style="max-width: 900px; width: 95vw; background: rgba(14, 14, 18, 0.98); border: 1.5px solid var(--neon-gold); box-shadow: var(--neon-gold-glow), 0 25px 60px rgba(0, 0, 0, 0.95); border-radius: var(--radius-xl); overflow: hidden;">
        <div class="modal-header" style="border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding: 1.1rem 1.5rem; display: flex; justify-content: space-between; align-items: center;">
          <h4 id="lb-title" class="modal-title neon-text-gold" style="font-size: 1.25rem; font-family: var(--font-heading); margin: 0;"></h4>
          <button class="modal-close" onclick="closeLightbox()" aria-label="Cerrar ventana"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>
        <div class="modal-body" style="padding: 1.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="width: 100%; max-height: 68vh; display: flex; align-items: center; justify-content: center; background: #070709; border-radius: var(--radius-lg); overflow: hidden;">
            <img id="lb-img" src="" alt="" style="max-height: 68vh; width: 100%; object-fit: contain; border-radius: var(--radius-lg); display: block;">
          </div>
          <p id="lb-desc" class="text-muted" style="margin-top: 1.25rem; font-size: 0.95rem; text-align: center; max-width: 700px; line-height: 1.6;"></p>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeLightbox();
    });
    document.body.appendChild(modal);
  }

  document.getElementById('lb-img').src = imageSrc;
  document.getElementById('lb-title').textContent = title;
  document.getElementById('lb-desc').textContent = desc;

  modal.classList.add('active');
};

window.closeLightbox = function() {
  const modal = document.getElementById('lightbox-modal');
  if (modal) modal.classList.remove('active');
};

/**
 * 6. Cargar Preguntas Frecuentes
 */
async function loadFaqs() {
  const container = document.getElementById('faq-container');
  if (!container) return;

  try {
    const res = await API.get('/api/public/faq');
    if (res.success && Array.isArray(res.data)) {
      container.innerHTML = res.data.map((faq, index) => `
        <div class="faq-item ${index === 0 ? 'active' : ''}">
          <button class="faq-question" onclick="toggleFaq(this)">
            <span>${faq.question}</span>
            <span class="faq-icon">▼</span>
          </button>
          <div class="faq-answer">
            <p>${faq.answer}</p>
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error('Error cargando faqs:', e);
  }
}

window.toggleFaq = function(button) {
  const item = button.closest('.faq-item');
  const wasActive = item.classList.contains('active');
  
  // Cerrar otros
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

  if (!wasActive) {
    item.classList.add('active');
  }
};

/**
 * 7. Formulario de Solicitud de Presupuesto
 */
function initQuoteForm() {
  const form = document.getElementById('quote-form');
  const fileInput = document.getElementById('quote-photos');
  const dropzone = document.getElementById('quote-dropzone');
  const previewContainer = document.getElementById('photos-preview');

  if (!form) return;

  let selectedFiles = [];

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', () => {
      handleFiles(fileInput.files);
    });
  }

  function handleFiles(files) {
    for (const f of files) {
      if (selectedFiles.length >= 5) {
        Toast.warning('Máximo 5 fotografías permitidas.');
        break;
      }
      if (f.size > 8 * 1024 * 1024) {
        Toast.warning(`El archivo ${f.name} supera 8MB.`);
        continue;
      }
      selectedFiles.push(f);
    }
    renderPreviews();
  }

  function renderPreviews() {
    if (!previewContainer) return;
    previewContainer.innerHTML = '';
    selectedFiles.forEach((file, index) => {
      const url = URL.createObjectURL(file);
      const thumb = document.createElement('div');
      thumb.className = 'file-thumb';
      thumb.innerHTML = `
        <img src="${url}" alt="Preview">
        <button type="button" style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.7); color: #fff; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px; line-height: 1;">&times;</button>
      `;
      thumb.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFiles.splice(index, 1);
        renderPreviews();
      });
      previewContainer.appendChild(thumb);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    const name = form.querySelector('[name="name"]').value.trim();
    const phone = form.querySelector('[name="phone"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    const repairType = form.querySelector('[name="repairType"]').value;
    const brand = form.querySelector('[name="brand"]').value.trim();
    const model = form.querySelector('[name="model"]').value.trim();
    const description = form.querySelector('[name="description"]').value.trim();

    if (!name || !phone || !repairType || !description) {
      Toast.error('Por favor complete todos los campos obligatorios (*).');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span> Enviando Solicitud...`;

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone', phone);
      formData.append('email', email);
      formData.append('repairType', repairType);
      formData.append('brand', brand);
      formData.append('model', model);
      formData.append('description', description);

      selectedFiles.forEach(file => {
        formData.append('photos', file);
      });

      const res = await API.upload('/api/public/quote-request', formData);

      if (res.success) {
        form.reset();
        selectedFiles = [];
        renderPreviews();

        showQuoteSuccessModal(res.trackingCode, res.verificationCode, name);
      } else {
        throw new Error(res.error || 'Error al enviar la solicitud');
      }
    } catch (err) {
      Toast.error(err.message || 'Ocurrió un error al procesar el formulario.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

function showQuoteSuccessModal(trackingCode, verificationCode, clientName) {
  let modal = document.getElementById('quote-success-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'quote-success-modal';
    modal.className = 'modal-backdrop active';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 520px; text-align: center;">
      <div class="modal-body" style="padding: 2.5rem 2rem;">
        <div class="status-icon success"><i class="fa-solid fa-circle-check" aria-hidden="true"></i></div>
        <h3 class="text-gold-bright" style="margin-bottom: 0.5rem;">¡Solicitud Recibida con Éxito!</h3>
        <p class="text-muted" style="margin-bottom: 1.5rem;">Gracias ${clientName}, nuestros especialistas revisarán tu caso y te responderán a la brevedad.</p>
        
        <div style="background: var(--bg-primary); border: 1.5px dashed var(--gold-primary); border-radius: var(--radius-lg); padding: 1.25rem; margin-bottom: 1.5rem;">
          <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">Tu Código Único de Seguimiento</div>
          <div style="font-family: var(--font-heading); font-size: 2rem; font-weight: 700; color: var(--gold-bright); letter-spacing: 1px;">${trackingCode}</div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.4rem;">PIN de seguridad: <strong>${verificationCode}</strong></div>
        </div>

        <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
          <a href="/seguimiento.html?code=${trackingCode}" class="btn btn-primary btn-sm">
            Consultar Estado Ahora
          </a>
          <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('quote-success-modal').classList.remove('active')">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `;
  modal.classList.add('active');
}

/**
 * 8. Portal de Seguimiento para Clientes (seguimiento.html)
 */
function initTrackingPage() {
  const trackingForm = document.getElementById('tracking-search-form');
  const resultCard = document.getElementById('tracking-result-card');

  if (!trackingForm) return;

  // Auto-cargar si viene por URL ?code=BH-XXXXXX
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('code');
  if (codeParam) {
    document.getElementById('tracking-code-input').value = codeParam;
    executeTrackingSearch(codeParam);
  }

  trackingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = document.getElementById('tracking-code-input').value.trim();
    const verification = document.getElementById('tracking-verif-input') ? document.getElementById('tracking-verif-input').value.trim() : '';

    if (!code) {
      Toast.error('Ingrese un número de orden o código de seguimiento.');
      return;
    }
    executeTrackingSearch(code, verification);
  });
}

async function executeTrackingSearch(code, verification = '') {
  const resultCard = document.getElementById('tracking-result-card');
  const searchBtn = document.getElementById('tracking-search-btn');

  if (searchBtn) {
    searchBtn.disabled = true;
    searchBtn.innerHTML = `<span class="spinner"></span> Consultando...`;
  }

  try {
    const res = await API.get(`/api/public/tracking/${code}`, { verification });
    if (res.success && res.data) {
      renderTrackingResult(res.data);
    } else {
      throw new Error(res.error || 'No se encontró la orden solicitada.');
    }
  } catch (err) {
    if (resultCard) {
      resultCard.classList.remove('hidden');
      resultCard.innerHTML = `
        <div class="card" style="border-color: var(--color-danger); text-align: center; padding: 2.5rem;">
          <div class="status-icon warning"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></div>
          <h3 class="text-white">No encontramos la reparación</h3>
          <p class="text-muted" style="margin-bottom: 1.5rem;">${err.message}</p>
          <p class="text-muted" style="font-size: 0.85rem;">Verifique que el código esté bien escrito o comuníquese con el taller directamente.</p>
        </div>
      `;
    }
  } finally {
    if (searchBtn) {
      searchBtn.disabled = false;
      searchBtn.innerHTML = `Consultar Estado`;
    }
  }
}

function renderTrackingResult(data) {
  const resultCard = document.getElementById('tracking-result-card');
  if (!resultCard) return;

  resultCard.classList.remove('hidden');

  let statusBadgeClass = 'badge-gold';
  if (data.status === 'Reparado' || data.status === 'Listo para entregar' || data.status === 'Entregado') {
    statusBadgeClass = 'badge-success';
  } else if (data.status === 'Esperando repuestos' || data.status === 'Esperando aprobación') {
    statusBadgeClass = 'badge-warning';
  }

  resultCard.innerHTML = `
    <div class="card" style="border-color: var(--gold-primary); margin-top: 2rem;">
      <div class="card-header">
        <div>
          <span class="badge ${statusBadgeClass}" style="margin-bottom: 0.4rem;">${data.statusText || data.status}</span>
          <h2 class="text-gold-bright" style="font-size: 1.6rem;">${data.orderNumber}</h2>
          <div class="text-muted" style="font-size: 0.85rem;">Componente: <strong>${data.componentType} ${data.brand || ''} ${data.model || ''}</strong></div>
        </div>
        <div style="text-align: right;">
          <div class="text-muted" style="font-size: 0.78rem;">Fecha de Ingreso:</div>
          <div class="text-white" style="font-size: 0.95rem; font-weight: 600;">${new Date(data.receivedDate).toLocaleDateString('es-AR')}</div>
          <div class="text-muted" style="font-size: 0.78rem; margin-top: 0.3rem;">Entrega Estimada:</div>
          <div class="text-gold-bright" style="font-size: 0.95rem; font-weight: 600;">${data.estimatedDeliveryDate ? new Date(data.estimatedDeliveryDate).toLocaleDateString('es-AR') : 'A confirmar post-diagnóstico'}</div>
        </div>
      </div>

      <div style="margin-top: 1.5rem;">
        <h4 class="text-white" style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
          Historial y Avance Técnico
        </h4>
        <div style="display: flex; flex-direction: column; gap: 1rem; position: relative; padding-left: 1.5rem; border-left: 2px solid var(--gold-dark); margin-left: 0.5rem;">
          ${Array.isArray(data.timeline) ? data.timeline.map(t => `
            <div style="position: relative;">
              <div style="position: absolute; left: -1.95rem; top: 0.2rem; width: 12px; height: 12px; border-radius: 50%; background: var(--gold-bright); border: 2px solid var(--bg-secondary);"></div>
              <div style="font-size: 0.95rem; font-weight: 700; color: var(--gold-bright);">${t.status}</div>
              <div style="font-size: 0.78rem; color: var(--text-dim);">${new Date(t.date).toLocaleString('es-AR')}</div>
              ${t.publicComment ? `<p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.25rem;">${t.publicComment}</p>` : ''}
            </div>
          `).join('') : '<p class="text-muted">Sin avances registrados aún.</p>'}
        </div>
      </div>

      ${data.canApproveBudget ? `
        <div style="background: rgba(212, 175, 55, 0.1); border: 1.5px solid var(--gold-primary); border-radius: var(--radius-lg); padding: 1.5rem; margin-top: 2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: gap;">
          <div>
            <h4 class="text-gold-bright">Presupuesto pendiente de tu aprobación</h4>
            <p class="text-muted" style="font-size: 0.9rem; margin-top: 0.2rem;">Puedes dar tu conformidad ahora mismo para que el equipo inicie el trabajo.</p>
          </div>
          <button type="button" class="btn btn-primary" onclick="approveBudgetFromTracking('${data.trackingCode || data.orderNumber}')">
            <i class="fa-solid fa-check" aria-hidden="true"></i> Aprobar Presupuesto
          </button>
        </div>
      ` : ''}

      <div style="margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <span class="text-muted" style="font-size: 0.85rem;">¿Dudas sobre tu reparación?</span>
        <a href="#" class="btn btn-whatsapp btn-sm whatsapp-link">
          Consultar por WhatsApp
        </a>
      </div>
    </div>
  `;
}

window.approveBudgetFromTracking = async function(trackingCode) {
  if (!confirm('¿Confirma la aprobación del presupuesto para dar inicio a la reparación?')) return;
  try {
    const res = await API.post(`/api/public/tracking/${trackingCode}/approve`, {});
    if (res.success) {
      Toast.success(res.message);
      executeTrackingSearch(trackingCode);
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    Toast.error(err.message || 'Error al aprobar el presupuesto');
  }
};

