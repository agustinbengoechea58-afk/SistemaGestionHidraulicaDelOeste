/**
 * Servicio de Notificaciones y Enlaces de Comunicación (WhatsApp)
 */
const { addDocument, getCollection, updateDocument } = require('./firestore.service');

async function createNotification(title, message, type = 'info', link = '') {
  try {
    return await addDocument('notifications', {
      title,
      message,
      type, // 'info' | 'success' | 'warning' | 'alert'
      link,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error al registrar notificación:', err.message);
    return null;
  }
}

async function getRecentNotifications(limit = 15) {
  try {
    return await getCollection('notifications', {
      orderBy: 'createdAt',
      orderDirection: 'desc',
      limit
    });
  } catch (err) {
    return [];
  }
}

async function markNotificationAsRead(id) {
  try {
    return await updateDocument('notifications', id, { read: true });
  } catch (err) {
    return null;
  }
}

/**
 * Generador de enlaces seguros de WhatsApp con mensaje preconfigurado
 */
function generateWhatsAppLink(phoneNumber, message) {
  if (!phoneNumber) return '';
  // Limpiar número: solo dígitos
  const cleanPhone = String(phoneNumber).replace(/\D/g, '');
  const encodedText = encodeURIComponent(message || '');
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

function buildWhatsAppMessage(type, data = {}) {
  const companyName = data.companyName || 'Bengoechea Hidráulica & Cremalleras';

  switch (type) {
    case 'quote_received':
      return `¡Hola ${data.name || ''}! Recibimos tu solicitud de presupuesto en ${companyName} para tu ${data.component || 'componente hidráulico'}. Un asesor técnico está evaluando tu consulta. Tu código de seguimiento es: ${data.trackingCode}.`;

    case 'budget_ready':
      return `Hola ${data.name || ''}. Tu presupuesto ${data.budgetNumber || ''} por la reparación de ${data.component || 'tu pieza'} ya está listo. Total: $${Number(data.total || 0).toLocaleString('es-AR')}. Puedes revisarlo aquí: ${data.link || ''}`;

    case 'repair_ready':
      return `¡Buenas noticias ${data.name || ''}! La reparación de tu ${data.component || 'componente'} (OT ${data.orderNumber || ''}) ha finalizado exitosamente y pasó todos los controles en banco de pruebas. Ya puedes pasar a retirarla por nuestro taller.`;

    case 'repair_delayed':
      return `Hola ${data.name || ''}, te informamos desde ${companyName} sobre el avance de tu orden ${data.orderNumber || ''}. Requerimos verificar repuestos de alta precisión y actualizaremos la fecha de entrega.`;

    default:
      return `Hola ${data.name || ''}, nos comunicamos desde ${companyName} con respecto a tu consulta.`;
  }
}

module.exports = {
  createNotification,
  getRecentNotifications,
  markNotificationAsRead,
  generateWhatsAppLink,
  buildWhatsAppMessage
};

