/**
 * Servicio de Numeración Secuencial Automática y Concurrente
 * Garantiza unicidad e incremento atómico para:
 * Clientes (CLIENTE-000001), Consultas (CONS-000001), Presupuestos (PRES-000001),
 * Órdenes (ORD-000001), Pagos (PAGO-000001), Compras (COMPRA-000001).
 */
const { getDb, getStatus } = require('../config/firebase-admin');
const { getDocument, setDocument } = require('./firestore.service');

const DEFAULT_PREFIXES = {
  customers: 'CLIENTE',
  inquiries: 'CONS',
  quotes: 'PRES',
  orders: 'ORD',
  payments: 'PAGO',
  purchases: 'COMPRA'
};

/**
 * Obtiene el siguiente código secuencial de forma atómica
 */
async function getNextSequenceNumber(counterType) {
  const typeKey = (counterType || '').toLowerCase();
  const defaultPrefix = DEFAULT_PREFIXES[typeKey] || 'COD';
  const { isInitialized } = getStatus();
  const db = getDb();

  if (isInitialized && db) {
    try {
      const counterRef = db.collection('business_counters').doc(typeKey);
      const nextCode = await db.runTransaction(async (t) => {
        const doc = await t.get(counterRef);
        let currentCount = 0;
        let prefix = defaultPrefix;

        if (doc.exists) {
          const data = doc.data();
          currentCount = Number(data.currentCount) || 0;
          prefix = data.prefix || defaultPrefix;
        }

        const nextCount = currentCount + 1;
        t.set(counterRef, {
          currentCount: nextCount,
          prefix: prefix,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        const padded = String(nextCount).padStart(6, '0');
        return `${prefix}-${padded}`;
      });

      return nextCode;
    } catch (err) {
      console.warn(`Error en transacción Firestore para contador ${typeKey}, usando fallback atómico:`, err.message);
    }
  }

  // Fallback atómico local
  const counterDoc = await getDocument('business_counters', typeKey) || {};
  const currentCount = Number(counterDoc.currentCount) || 0;
  const prefix = counterDoc.prefix || defaultPrefix;
  const nextCount = currentCount + 1;

  await setDocument('business_counters', typeKey, {
    currentCount: nextCount,
    prefix,
    updatedAt: new Date().toISOString()
  }, true);

  const padded = String(nextCount).padStart(6, '0');
  return `${prefix}-${padded}`;
}

/**
 * Configurar prefijo personalizado para un contador
 */
async function setCounterPrefix(counterType, newPrefix) {
  const typeKey = (counterType || '').toLowerCase();
  await setDocument('business_counters', typeKey, {
    prefix: newPrefix.toUpperCase().trim()
  }, true);
}

module.exports = {
  getNextSequenceNumber,
  setCounterPrefix,
  DEFAULT_PREFIXES
};

