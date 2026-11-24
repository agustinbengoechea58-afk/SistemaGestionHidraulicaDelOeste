/**
 * Servicio Central de Persistencia - Firebase Firestore
 * Con soporte dual: Conexión nativa a Google Cloud Firestore y motor local transaccional
 */
const path = require('path');
const fs = require('fs');
const { getDb, getStatus } = require('../config/firebase-admin');

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Caché en memoria para lecturas ultra-rápidas en modo local
const localMemoryStore = {};

function getLocalFilePath(collectionName) {
  return path.join(DATA_DIR, `${collectionName}.json`);
}

function loadLocalCollection(collectionName) {
  if (localMemoryStore[collectionName]) {
    return localMemoryStore[collectionName];
  }
  const filePath = getLocalFilePath(collectionName);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      localMemoryStore[collectionName] = JSON.parse(content || '{}');
    } catch (err) {
      console.error(`Error leyendo archivo local de colección ${collectionName}:`, err.message);
      localMemoryStore[collectionName] = {};
    }
  } else {
    localMemoryStore[collectionName] = {};
  }
  return localMemoryStore[collectionName];
}

function saveLocalCollection(collectionName) {
  const filePath = getLocalFilePath(collectionName);
  const tempPath = `${filePath}.tmp`;
  try {
    const data = localMemoryStore[collectionName] || {};
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`Error guardando archivo local de colección ${collectionName}:`, err.message);
  }
}

/**
 * Obtener todos los documentos de una colección
 */
async function getCollection(collectionName, options = {}) {
  const { isInitialized } = getStatus();
  const db = getDb();

  if (isInitialized && db) {
    try {
      let query = db.collection(collectionName);
      if (options.where && Array.isArray(options.where)) {
        for (const [field, op, val] of options.where) {
          query = query.where(field, op, val);
        }
      }
      if (options.orderBy) {
        query = query.orderBy(options.orderBy, options.orderDirection || 'asc');
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }
      const snapshot = await query.get();
      const docs = [];
      snapshot.forEach(doc => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      return docs;
    } catch (err) {
      console.warn(`Firestore getCollection falló para '${collectionName}', usando respaldo:`, err.message);
    }
  }

  // Fallback / Modo local
  const store = loadLocalCollection(collectionName);
  let list = Object.entries(store).map(([id, doc]) => ({ id, ...doc }));

  if (options.where && Array.isArray(options.where)) {
    for (const [field, op, val] of options.where) {
      list = list.filter(item => {
        if (op === '==') return item[field] === val;
        if (op === '!=') return item[field] !== val;
        if (op === '>') return item[field] > val;
        if (op === '>=') return item[field] >= val;
        if (op === '<') return item[field] < val;
        if (op === '<=') return item[field] <= val;
        if (op === 'in') return Array.isArray(val) && val.includes(item[field]);
        if (op === 'array-contains') return Array.isArray(item[field]) && item[field].includes(val);
        return true;
      });
    }
  }

  if (options.orderBy) {
    const dir = (options.orderDirection || 'asc').toLowerCase() === 'desc' ? -1 : 1;
    list.sort((a, b) => {
      const valA = a[options.orderBy];
      const valB = b[options.orderBy];
      if (valA === valB) return 0;
      if (valA === undefined) return 1;
      if (valB === undefined) return -1;
      return (valA > valB ? 1 : -1) * dir;
    });
  }

  if (options.limit && options.limit > 0) {
    list = list.slice(0, options.limit);
  }

  return list;
}

/**
 * Obtener un documento por ID
 */
async function getDocument(collectionName, docId) {
  if (!docId) return null;
  const { isInitialized } = getStatus();
  const db = getDb();

  if (isInitialized && db) {
    try {
      const doc = await db.collection(collectionName).doc(String(docId)).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (err) {
      console.warn(`Firestore getDocument falló para '${collectionName}/${docId}':`, err.message);
    }
  }

  const store = loadLocalCollection(collectionName);
  if (store[docId]) {
    return { id: docId, ...store[docId] };
  }
  return null;
}

/**
 * Guardar o sobreescribir un documento por ID
 */
async function setDocument(collectionName, docId, data, merge = true) {
  if (!docId) throw new Error('docId es obligatorio para setDocument');
  const now = new Date().toISOString();
  const docPayload = {
    ...data,
    updatedAt: now
  };
  if (!docPayload.createdAt) {
    docPayload.createdAt = now;
  }

  const { isInitialized } = getStatus();
  const db = getDb();

  if (isInitialized && db) {
    try {
      await db.collection(collectionName).doc(String(docId)).set(docPayload, { merge });
    } catch (err) {
      console.warn(`Firestore setDocument falló: ${err.message}`);
    }
  }

  // Persistir siempre en almacenamiento local para redundancia
  const store = loadLocalCollection(collectionName);
  if (merge && store[docId]) {
    store[docId] = { ...store[docId], ...docPayload, id: docId };
  } else {
    store[docId] = { ...docPayload, id: docId };
  }
  saveLocalCollection(collectionName);

  return { id: docId, ...store[docId] };
}

/**
 * Agregar un nuevo documento (genera ID si no se proporciona)
 */
async function addDocument(collectionName, data) {
  const docId = data.id || `${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
  return await setDocument(collectionName, docId, data, false);
}

/**
 * Actualizar campos específicos de un documento
 */
async function updateDocument(collectionName, docId, updates) {
  if (!docId) throw new Error('docId es obligatorio para updateDocument');
  return await setDocument(collectionName, docId, updates, true);
}

/**
 * Eliminar un documento
 */
async function deleteDocument(collectionName, docId) {
  if (!docId) return false;
  const { isInitialized } = getStatus();
  const db = getDb();

  if (isInitialized && db) {
    try {
      await db.collection(collectionName).doc(String(docId)).delete();
    } catch (err) {
      console.warn(`Firestore deleteDocument falló: ${err.message}`);
    }
  }

  const store = loadLocalCollection(collectionName);
  if (store[docId]) {
    delete store[docId];
    saveLocalCollection(collectionName);
    return true;
  }
  return false;
}

/**
 * Buscar documentos por pares clave-valor
 */
async function queryDocuments(collectionName, criteria = {}) {
  const whereClauses = Object.entries(criteria).map(([key, val]) => [key, '==', val]);
  return await getCollection(collectionName, { where: whereClauses });
}

module.exports = {
  getCollection,
  getDocument,
  setDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  loadLocalCollection
};

