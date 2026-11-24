/**
 * Rutas de Integración con Meta WhatsApp Business Cloud API
 * Webhook oficial, verificación, envíos de prueba y panel administrativo
 */
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/permissions');
const { 
  isWhatsAppConfigured, 
  sendTextMessage, 
  sendTemplateMessage 
} = require('../services/whatsapp.service');
const { getCollection, getDocument, setDocument, addDocument } = require('../services/firestore.service');

/**
 * 1. Webhook Verification de Meta (GET)
 * Usado por Meta Developers para validar el Webhook URL
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'bengoechea_hidraulica_token_2026';

  if (mode && token) {
    if (mode === 'subscribe' && token === expectedToken) {
      console.log('Webhook de Meta WhatsApp verificado exitosamente');
      return res.status(200).send(challenge);
    } else {
      console.warn('Token de verificacion de Webhook invalido');
      return res.sendStatus(403);
    }
  }
  res.sendStatus(400);
});

/**
 * 2. Recepción de Eventos de Meta WhatsApp (POST)
 */
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (value && value.messages) {
            for (const msg of value.messages) {
              await addDocument('whatsapp_messages', {
                metaMessageId: msg.id,
                fromPhone: msg.from,
                direction: 'inbound',
                type: msg.type,
                textBody: msg.text?.body || '',
                rawPayload: msg,
                receivedAt: new Date().toISOString()
              });
            }
          }
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    }
    res.sendStatus(404);
  } catch (err) {
    console.error('Error procesando webhook de WhatsApp:', err.message);
    res.status(500).send('SERVER_ERROR');
  }
});

/**
 * 3. Endpoints Administrativos (Requieren Autenticación)
 */
router.get('/config', authenticate, authorize(['SUPERADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    const isConfigured = isWhatsAppConfigured();
    const templates = await getDocument('site_settings', 'whatsapp_templates') || {
      quoteReceivedTemplate: 'Confirmación inmediata de consulta recibida',
      budgetReadyTemplate: 'Notificación de presupuesto listo para aprobación',
      repairDoneTemplate: 'Aviso de reparación concluida y probada en banco'
    };

    res.json({
      success: true,
      configured: isConfigured,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? '***' + process.env.WHATSAPP_PHONE_NUMBER_ID.slice(-4) : '',
      webhookUrl: `${process.env.APP_URL || 'http://localhost:3000'}/api/whatsapp/webhook`,
      templates
    });
  } catch (err) {
    next(err);
  }
});

router.get('/messages', authenticate, authorize(['SUPERADMIN', 'ADMIN', 'RECEPCIONISTA']), async (req, res, next) => {
  try {
    const messages = await getCollection('whatsapp_messages', {
      orderBy: 'createdAt',
      orderDirection: 'desc',
      limit: 50
    });
    res.json({ success: true, count: messages.length, data: messages });
  } catch (err) {
    next(err);
  }
});

router.post('/test-send', authenticate, authorize(['SUPERADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    const { toPhone, message } = req.body;
    if (!toPhone || !message) {
      return res.status(400).json({ success: false, error: 'Debe ingresar teléfono y mensaje.' });
    }

    const result = await sendTextMessage(toPhone, message);
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

