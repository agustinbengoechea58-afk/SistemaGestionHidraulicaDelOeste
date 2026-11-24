/**
 * Capa de Comunicación con la API Backend (Fetch Wrapper)
 */
const API = {
  baseUrl: '',

  getToken() {
    return localStorage.getItem('bh_auth_token') || '';
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('bh_auth_token', token);
    } else {
      localStorage.removeItem('bh_auth_token');
    }
  },

  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = options.isFormData 
      ? { ...(this.getToken() ? { 'Authorization': `Bearer ${this.getToken()}` } : {}) }
      : this.getHeaders(options.headers);

    const config = {
      ...options,
      headers
    };

    if (config.body && !options.isFormData && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && !url.includes('/api/auth/login')) {
          localStorage.removeItem('bh_auth_token');
          localStorage.removeItem('bh_user');
          if (window.location.pathname.startsWith('/admin') && !window.location.pathname.includes('login.html')) {
            window.location.href = '/admin/login.html';
          }
        }
        throw new Error(data.error || `Error en la solicitud: ${response.statusText}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  },

  get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: 'GET' });
  },

  post(endpoint, body = {}) {
    return this.request(endpoint, { method: 'POST', body });
  },

  put(endpoint, body = {}) {
    return this.request(endpoint, { method: 'PUT', body });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  upload(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      body: formData,
      isFormData: true
    });
  }
};

