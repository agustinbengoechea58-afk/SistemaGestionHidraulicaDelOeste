/**
 * Módulo de Configuración General del Negocio
 */
async function loadSettings() {
  try {
    const res = await API.get('/api/settings');
    if (res.success && res.data) {
      const s = res.data.settings || {};
      const c = res.data.contact || {};

      document.getElementById('set-businessName').value = s.businessName || '';
      document.getElementById('set-tagline').value = s.tagline || '';
      document.getElementById('set-currency').value = s.currency || 'ARS';
      document.getElementById('set-currencySymbol').value = s.currencySymbol || '$';
      document.getElementById('set-taxPercent').value = s.taxPercent || 21;
      document.getElementById('set-warrantyConditions').value = s.warrantyConditions || '';
      document.getElementById('set-termsAndConditions').value = s.termsAndConditions || '';

      document.getElementById('set-phone').value = c.phone || '';
      document.getElementById('set-whatsapp').value = c.whatsapp || '';
      document.getElementById('set-email').value = c.email || '';
      document.getElementById('set-address').value = c.address || '';
      document.getElementById('set-city').value = c.city || '';
      document.getElementById('set-province').value = c.province || '';
      document.getElementById('set-hours').value = c.hours || '';
      document.getElementById('set-mapUrl').value = c.mapUrl || '';

      const soc = c.socials || {};
      document.getElementById('set-facebook').value = soc.facebook || '';
      document.getElementById('set-instagram').value = soc.instagram || '';
      document.getElementById('set-tiktok').value = soc.tiktok || '';
    }
  } catch (err) {
    Toast.error('Error cargando configuración: ' + err.message);
  }
}

async function saveSettings(e) {
  e.preventDefault();
  const settings = {
    businessName: document.getElementById('set-businessName').value.trim(),
    tagline: document.getElementById('set-tagline').value.trim(),
    currency: document.getElementById('set-currency').value,
    currencySymbol: document.getElementById('set-currencySymbol').value,
    taxPercent: Number(document.getElementById('set-taxPercent').value) || 21,
    warrantyConditions: document.getElementById('set-warrantyConditions').value.trim(),
    termsAndConditions: document.getElementById('set-termsAndConditions').value.trim()
  };

  const contact = {
    phone: document.getElementById('set-phone').value.trim(),
    whatsapp: document.getElementById('set-whatsapp').value.trim(),
    email: document.getElementById('set-email').value.trim(),
    address: document.getElementById('set-address').value.trim(),
    city: document.getElementById('set-city').value.trim(),
    province: document.getElementById('set-province').value.trim(),
    hours: document.getElementById('set-hours').value.trim(),
    mapUrl: document.getElementById('set-mapUrl').value.trim(),
    socials: {
      facebook: document.getElementById('set-facebook').value.trim(),
      instagram: document.getElementById('set-instagram').value.trim(),
      tiktok: document.getElementById('set-tiktok').value.trim()
    }
  };

  try {
    const res = await API.post('/api/settings', { settings, contact });
    if (res.success) {
      Toast.success(res.message);
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('set-businessName')) {
    loadSettings();
    const form = document.getElementById('business-settings-form');
    if (form) form.addEventListener('submit', saveSettings);
  }
});

