
/**
 * Inicialización y Gestión de Firebase Admin SDK
 *
 * PRIORIDAD:
 * 1. Variables de entorno de Render.
 * 2. Archivo config/serviceAccountKey.json como respaldo.
 * 3. Modo local si no existen credenciales.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let isInitialized = false;
let db = null;
let auth = null;
let bucket = null;

let initMode = 'none';
let initError = null;
let projectId = null;

/**
 * Obtiene las credenciales desde variables de entorno.
 */
function getServiceAccountFromEnvironment() {
  const project = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!project || !clientEmail || !rawPrivateKey) {
    return null;
  }

  const privateKey = rawPrivateKey
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .trim();

  if (
    !privateKey.includes('-----BEGIN PRIVATE KEY-----') ||
    !privateKey.includes('-----END PRIVATE KEY-----')
  ) {
    throw new Error(
      'FIREBASE_PRIVATE_KEY no contiene una clave privada PEM válida.'
    );
  }

  return {
    project_id: project.trim(),
    client_email: clientEmail.trim(),
    private_key: privateKey
  };
}

/**
 * Obtiene las credenciales desde un archivo JSON.
 */
function getServiceAccountFromFile() {
  const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  const keyPath = configuredPath
    ? path.resolve(process.cwd(), configuredPath)
    : path.resolve(
      process.cwd(),
      'config',
      'serviceAccountKey.json'
    );

  if (!fs.existsSync(keyPath)) {
    return null;
  }

  const content = fs.readFileSync(keyPath, 'utf8');
  const serviceAccount = JSON.parse(content);

  if (
    !serviceAccount.project_id ||
    !serviceAccount.client_email ||
    !serviceAccount.private_key
  ) {
    throw new Error(
      'El archivo serviceAccountKey.json no contiene los campos necesarios.'
    );
  }

  return serviceAccount;
}

/**
 * Inicialización principal de Firebase Admin.
 */
function initFirebaseAdmin() {
  if (isInitialized) {
    return {
      isInitialized,
      db,
      auth,
      bucket,
      initMode,
      initError,
      projectId
    };
  }

  try {
    let serviceAccount = null;
    let selectedMode = 'none';

    // ==========================================
    // 1. PRIORIDAD: VARIABLES DE ENTORNO
    // ==========================================

    const envAccount = getServiceAccountFromEnvironment();

    if (envAccount) {
      serviceAccount = envAccount;
      selectedMode = 'env-vars';

      console.log(
        'Firebase Admin: utilizando credenciales de variables de entorno.'
      );

    } else {

      // ==========================================
      // 2. RESPALDO: ARCHIVO JSON
      // ==========================================

      const fileAccount = getServiceAccountFromFile();

      if (fileAccount) {
        serviceAccount = fileAccount;
        selectedMode = 'service-account';

        console.log(
          'Firebase Admin: utilizando archivo serviceAccountKey.json.'
        );

      } else {

        // ==========================================
        // 3. MODO LOCAL / FALLBACK
        // ==========================================

        initMode = 'offline-fallback';

        console.warn(
          'Firebase Admin: no se encontraron credenciales completas.'
        );

        console.warn(
          'El sistema continuará utilizando el respaldo local.'
        );

        return {
          isInitialized,
          db,
          auth,
          bucket,
          initMode,
          initError,
          projectId
        };
      }
    }

    // ==========================================
    // 3. VALIDAR PROYECTO Y CREDENCIALES
    // ==========================================

    projectId = serviceAccount.project_id;

    if (
      !projectId ||
      !serviceAccount.client_email ||
      !serviceAccount.private_key
    ) {
      throw new Error(
        'Las credenciales de Firebase están incompletas.'
      );
    }

    // ==========================================
    // 4. INICIALIZAR APLICACIÓN FIREBASE
    // ==========================================

    let firebaseApp;

    if (admin.apps.length > 0) {
      firebaseApp = admin.app();

      console.log(
        'Firebase Admin: reutilizando aplicación existente.'
      );

    } else {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key
        }),

        storageBucket:
          process.env.FIREBASE_STORAGE_BUCKET ||
          `${serviceAccount.project_id}.appspot.com`
      });
    }

    // ==========================================
    // 5. INICIALIZAR FIRESTORE
    // ==========================================

    db = admin.firestore(firebaseApp);

    // ==========================================
    // 6. INICIALIZAR FIREBASE AUTH
    // ==========================================

    auth = admin.auth(firebaseApp);

    // ==========================================
    // 7. INICIALIZAR FIREBASE STORAGE
    // ==========================================

    try {
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET;

      if (!bucketName) {
        throw new Error('Falta FIREBASE_STORAGE_BUCKET');
      }

      bucket = admin.storage(firebaseApp).bucket(bucketName);

      console.log('Firebase Storage bucket:', bucket.name);
      console.log('========== STORAGE DIAGNOSTIC ==========');
      console.log('Proyecto:', projectId);
      console.log('Bucket configurado:', process.env.FIREBASE_STORAGE_BUCKET);
      console.log('Bucket utilizado:', bucket ? bucket.name : 'NULL');
      console.log('========================================');

    } catch (storageErr) {
      bucket = null;

      console.warn(
        'Firebase Storage no está disponible:',
        storageErr.message
      );
    }

    // ==========================================
    // 8. CONFIRMAR INICIALIZACIÓN
    // ==========================================

    initMode = selectedMode;
    isInitialized = true;
    initError = null;

    console.log('==============================================');
    console.log('FIREBASE ADMIN INICIALIZADO');
    console.log('Proyecto:', projectId);
    console.log('Método:', initMode);
    console.log('Firestore: SDK inicializado');
    console.log('Firebase Auth: SDK inicializado');
    console.log('Firebase Storage:', bucket ? 'SDK inicializado' : 'No disponible');
    console.log('==============================================');

  } catch (err) {

    // ==========================================
    // ERROR DE INICIALIZACIÓN
    // ==========================================

    isInitialized = false;
    db = null;
    auth = null;
    bucket = null;

    initError = err.message;
    initMode = 'offline-fallback';

    console.error(
      'Error al inicializar Firebase Admin:',
      err.message
    );

    console.warn(
      'El sistema continuará utilizando el respaldo local.'
    );
  }

  return {
    isInitialized,
    db,
    auth,
    bucket,
    initMode,
    initError,
    projectId
  };
}

// ==========================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================

initFirebaseAdmin();

// ==========================================
// EXPORTAR FUNCIONES Y SERVICIOS
// ==========================================

module.exports = {
  admin,

  getDb: () => db,

  getAuth: () => auth,

  getBucket: () => bucket,

  getStatus: () => ({
    isInitialized,
    initMode,
    initError,
    projectId
  }),

  initFirebaseAdmin
};
