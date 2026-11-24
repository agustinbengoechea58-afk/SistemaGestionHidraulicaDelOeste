/**
 * Sistema de Notificaciones Toast, Modales y Control Global de Loading V2
 */
const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 4000) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fade-in`;

    let icon = '<i class="fa-solid fa-circle-info text-gold"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check" style="color: var(--color-success);"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-triangle-exclamation" style="color: var(--color-danger);"></i>';
    if (type === 'warning') icon = '<i class="fa-solid fa-circle-exclamation" style="color: var(--color-warning);"></i>';

    toast.innerHTML = `
      <div style="font-size: 1.2rem; line-height: 1;">${icon}</div>
      <div style="flex-grow: 1; font-size: 0.9rem; line-height: 1.4;">${message}</div>
    `;

    this.container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg, duration) { this.show(msg, 'success', duration); },
  error(msg, duration) { this.show(msg, 'error', duration); },
  warning(msg, duration) { this.show(msg, 'warning', duration); },
  info(msg, duration) { this.show(msg, 'info', duration); }
};

/**
 * Controlador de Carga Global y de Sección
 */
const Loading = {
  loaderEl: null,
  activeRequests: 0,
  timeoutRef: null,

  init() {
    if (!this.loaderEl) {
      let el = document.getElementById('global-loader');
      if (!el) {
        el = document.createElement('div');
        el.id = 'global-loader';
        el.innerHTML = `
          <div class="global-loader-content scale-in">
            <div class="spinner spinner-lg"></div>
            <div>
              <div class="global-loader-text" id="global-loader-text">Procesando Operación...</div>
              <div class="global-loader-sub" id="global-loader-sub">Por favor aguarde un momento</div>
            </div>
          </div>
        `;
        document.body.appendChild(el);
      }
      this.loaderEl = el;
    }
  },

  show(title = 'Procesando Operación...', subtitle = 'Por favor aguarde un momento') {
    this.init();
    this.activeRequests++;
    const tEl = document.getElementById('global-loader-text');
    const sEl = document.getElementById('global-loader-sub');
    if (tEl) tEl.textContent = title;
    if (sEl) sEl.textContent = subtitle;

    this.loaderEl.classList.add('active');

    // Salvaguarda: timeout de seguridad de 20s para nunca bloquear indefinidamente
    clearTimeout(this.timeoutRef);
    this.timeoutRef = setTimeout(() => {
      this.hideAll();
    }, 20000);
  },

  hide() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    if (this.activeRequests === 0 && this.loaderEl) {
      this.loaderEl.classList.remove('active');
      clearTimeout(this.timeoutRef);
    }
  },

  hideAll() {
    this.activeRequests = 0;
    if (this.loaderEl) {
      this.loaderEl.classList.remove('active');
    }
    clearTimeout(this.timeoutRef);
  },

  // Decorador para botones: añade spinner y previene doble click
  async wrapButton(button, asyncFn) {
    if (!button || button.disabled) return;
    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.dataset.originalHtml = originalHtml;
    button.innerHTML = `<span class="spinner" style="margin-right: 6px;"></span> Procesando...`;

    try {
      return await asyncFn();
    } finally {
      button.disabled = false;
      button.innerHTML = originalHtml;
    }
  },

  // Loading dentro de un contenedor HTML
  setSectionLoading(containerEl, isLoading, message = 'Cargando datos...') {
    if (!containerEl) return;
    if (isLoading) {
      containerEl.classList.add('section-loading');
      let overlay = containerEl.querySelector('.section-loading-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'section-loading-overlay fade-in';
        overlay.innerHTML = `
          <div class="spinner"></div>
          <div style="font-size: 0.85rem; color: var(--gold-bright);">${message}</div>
        `;
        containerEl.appendChild(overlay);
      }
    } else {
      containerEl.classList.remove('section-loading');
      const overlay = containerEl.querySelector('.section-loading-overlay');
      if (overlay) overlay.remove();
    }
  }
};

window.Toast = Toast;
window.Loading = Loading;
