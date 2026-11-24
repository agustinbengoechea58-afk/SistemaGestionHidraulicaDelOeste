/**
 * Módulo de Autenticación de Usuario y Control de Acceso
 */
const Auth = {
  getUser() {
    const raw = localStorage.getItem('bh_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('bh_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('bh_user');
    }
  },

  isAuthenticated() {
    return !!API.getToken() && !!this.getUser();
  },

  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/admin/login.html';
      return false;
    }
    return true;
  },

  hasRole(allowedRoles = []) {
    const user = this.getUser();
    if (!user) return false;
    if (user.role === 'SUPERADMIN') return true;
    return allowedRoles.includes(user.role);
  },

  async login(email, password) {
    try {
      const res = await API.post('/api/auth/login', { email, password });
      if (res.success && res.token) {
        API.setToken(res.token);
        this.setUser(res.user);
        return res;
      }
      throw new Error(res.error || 'Credenciales no válidas');
    } catch (err) {
      throw err;
    }
  },

  async logout() {
    try {
      await API.post('/api/auth/logout', {});
    } catch (e) {
      // Ignorar error al cerrar
    }
    API.setToken(null);
    this.setUser(null);
    window.location.href = '/admin/login.html';
  }
};

window.Auth = Auth;

