/**
 * Inicialización y Gestión de Firebase Admin SDK
 */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let isInitialized = false;
let db = null;
let auth = null;
let bucket = null;
let initMode = 'none'; // 'service-account' | 'env-vars' | 'offline-fallback'
let initError = null;

function initFirebaseAdmin() {
  if (isInitialized) {
    return { isInitialized, db, auth, bucket, initMode, initError };
  }

  try {
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
      ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : path.resolve(process.cwd(), 'config', 'serviceAccountKey.json');

    if (fs.existsSync(keyPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
      });
      initMode = 'service-account';
      isInitialized = true;
      console.log('✅ Firebase Admin inicializado con serviceAccountKey.json:', serviceAccount.project_id);
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
      });
      initMode = 'env-vars';
      isInitialized = true;
      console.log('✅ Firebase Admin inicializado mediante variables de entorno para:', process.env.FIREBASE_PROJECT_ID);
    } else {
      initMode = 'offline-fallback';
      console.warn('⚠️ No se detectó credencial de Firebase Admin (serviceAccountKey.json).');
      console.warn('ℹ️ El sistema iniciará en Modo Híbrido/Fallback local con persistencia completa.');
      console.warn('ℹ️ Para conectar con tu proyecto Firebase Cloud, coloca tu serviceAccountKey.json en /config/ o configura las variables de entorno.');
    }

    if (isInitialized) {
      db = admin.firestore();
      auth = admin.auth();
      try {
        bucket = admin.storage().bucket();
      } catch (storageErr) {
        console.warn('⚠️ Bucket de Firebase Storage no configurado aún, se usará almacenamiento local.');
      }
    }
  } catch (err) {
    initError = err.message;
    initMode = 'offline-fallback';
    console.error('❌ Error al inicializar Firebase Admin SDK:', err.message);
  }

  return { isInitialized, db, auth, bucket, initMode, initError };
}

// Inicialización automática
initFirebaseAdmin();

module.exports = {
  admin,
  getDb: () => db,
  getAuth: () => auth,
  getBucket: () => bucket,
  getStatus: () => ({ isInitialized, initMode, initError }),
  initFirebaseAdmin
};

