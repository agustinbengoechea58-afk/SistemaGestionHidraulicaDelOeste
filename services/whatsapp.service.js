/**
 * Servicio Oficial de WhatsApp Business Cloud API (Meta Graph API)
 * Gestión de envíos automáticos, recepción de webhooks, plantillas y trazabilidad.
 */
const { addDocument, getCollection, getDocument, setDocument } = require('./firestore.service');

const GRAPH_API_VERSION = 'v18.0';

/**
 * Comprobar si las credenciales de WhatsApp Cloud API están completas
 */
function isWhatsAppConfigured() {
  return !!(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_ACCESS_TOKEN.length > 20
  );
}

/**
 * Enviar mensaje de texto libre (dentro de ventana de atención de 24h de Meta)
 */
async function sendTextMessage(toPhone, textBody) {
  const cleanPhone = String(toPhone).replace(/\D/g, '');
  const timestamp = new Date().toISOString();

  // Registro previo en Firestore
  const logRecord = {
    recipientPhone: cleanPhone,
    type: 'text',
    direction: 'outbound',
    messageBody: textBody,
    status: 'enqueued',
    createdAt: timestamp
  };

  if (!isWhatsAppConfigured()) {
    logRecord.status = 'manual_fallback';
    logRecord.note = 'WhatsApp Cloud API no configurado en .env (se proporciona link wa.me para envío manual).';
    logRecord.manualLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textBody)}`;
    const saved = await addDocument('whatsapp_messages', logRecord);
    return {
      success: false,
      isConfigured: false,
      manualLink: logRecord.manualLink,
      messageId: saved.id,
      error: 'WhatsApp Cloud API no configurado. Utilice el enlace manual generado.'
    };
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { preview_url: true, body: textBody }
      })
    });

    const resData = await response.json();

    if (!response.ok) {
      logRecord.status = 'failed';
      logRecord.apiError = resData.error || resData;
      await addDocument('whatsapp_messages', logRecord);
      return { success: false, error: resData.error?.message || 'Error en Meta Graph API' };
    }

    logRecord.status = 'sent';
    logRecord.metaMessageId = resData.messages?.[0]?.id;
    const saved = await addDocument('whatsapp_messages', logRecord);

    return {
      success: true,
      metaMessageId: logRecord.metaMessageId,
      messageId: saved.id
    };
  } catch (err) {
    logRecord.status = 'failed';
    logRecord.apiError = err.message;
    await addDocument('whatsapp_messages', logRecord);
    return { success: false, error: err.message };
  }
}

/**
 * Enviar plantilla aprobada de Meta (Template Message)
 */
async function sendTemplateMessage(toPhone, templateName, components = [], languageCode = 'es_AR') {
  const cleanPhone = String(toPhone).replace(/\D/g, '');
  const timestamp = new Date().toISOString();

  const logRecord = {
    recipientPhone: cleanPhone,
    type: 'template',
    templateName,
    direction: 'outbound',
    components,
    status: 'enqueued',
    createdAt: timestamp
  };

  if (!isWhatsAppConfigured()) {
    logRecord.status = 'manual_fallback';
    logRecord.note = 'WhatsApp Cloud API no configurado en .env.';
    const saved = await addDocument('whatsapp_messages', logRecord);
    return {
      success: false,
      isConfigured: false,
      messageId: saved.id,
      error: 'WhatsApp Cloud API no configurado.'
    };
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: components
        }
      })
    });

    const resData = await response.json();
    if (!response.ok) {
      logRecord.status = 'failed';
      logRecord.apiError = resData.error || resData;
      await addDocument('whatsapp_messages', logRecord);
      return { success: false, error: resData.error?.message || 'Error al enviar plantilla en Meta' };
    }

    logRecord.status = 'sent';
    logRecord.metaMessageId = resData.messages?.[0]?.id;
    await addDocument('whatsapp_messages', logRecord);

    return { success: true, metaMessageId: logRecord.metaMessageId };
  } catch (err) {
    logRecord.status = 'failed';
    logRecord.apiError = err.message;
    await addDocument('whatsapp_messages', logRecord);
    return { success: false, error: err.message };
  }
}

/**
 * Automatización: Confirmación inmediata de consulta recibida
 */
async function sendAutoReplyQuoteReceived(data = {}) {
  const businessName = process.env.APP_NAME || 'Hidraulica del oeste A.B & Cremalleras';
  const text = 
`¡Hola, ${data.name || 'estimado/a'}! Gracias por comunicarte con ${businessName}.

Recibimos correctamente tu solicitud de presupuesto.

Numero de consulta: ${data.inquiryNumber || data.trackingCode}
Vehiculo: ${data.vehicleBrand || ''} ${data.vehicleModel || ''}
Servicio solicitado: ${data.repairType || 'Reparación hidráulica'}

Nuestro equipo técnico evaluará tu caso para brindarte la cotización más precisa.
Podés realizar el seguimiento de tu solicitud ingresando a:
${process.env.APP_URL || 'http://localhost:3000'}/seguimiento.html?code=${data.inquiryNumber || data.trackingCode}

¡Gracias por confiar en nosotros!`;

  return await sendTextMessage(data.phone, text);
}

/**
 * Automatización: Presupuesto emitido listo para revisión
 */
async function sendAutoNotificationBudgetReady(data = {}) {
  const businessName = process.env.APP_NAME || 'Hidraulica del oeste A.B';
  const trackingUrl = `${process.env.APP_URL || 'http://localhost:3000'}/seguimiento.html?code=${data.budgetNumber || data.orderNumber}`;

  const text =
`Hola, ${data.clientName || ''}. Ya tenemos preparado tu presupuesto técnico en ${businessName}.

Numero: ${data.budgetNumber}
Vehiculo / Pieza: ${data.componentType || ''}
Importe total: $ ${Number(data.total || 0).toLocaleString('es-AR')}
Vigencia: ${data.validDays || 15} días

Podés consultar los detalles del trabajo y confirmar la aprobación directamente desde el siguiente enlace seguro:
${trackingUrl}

Quedamos a tu entera disposición.`;

  return await sendTextMessage(data.clientPhone, text);
}

module.exports = {
  isWhatsAppConfigured,
  sendTextMessage,
  sendTemplateMessage,
  sendAutoReplyQuoteReceived,
  sendAutoNotificationBudgetReady
};

