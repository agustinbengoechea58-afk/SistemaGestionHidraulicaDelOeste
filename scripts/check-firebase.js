/**
 * Script de Verificación y Diagnóstico de Conexión con Firebase
 * Ejecutable mediante: npm run check-firebase
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { getStatus, getDb, getAuth, getBucket } = require('../config/firebase-admin');

async function checkFirebase() {
  console.log('================================================================');
  console.log('DIAGNOSTICO DE CONEXION CON SERVICIOS DE FIREBASE');
  console.log('================================================================\n');

  const status = getStatus();
  console.log(`Estado Inicialización: ${status.isInitialized ? 'CONECTADO' : 'MODO LOCAL (respaldo)'}`);
  console.log(`Modo de Autenticación: ${status.initMode}`);

  if (status.initError) {
    console.error(`Error reportado: ${status.initError}`);
  }

  // Comprobar archivo de credenciales
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
    ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : path.resolve(process.cwd(), 'config', 'serviceAccountKey.json');

  console.log(`Ruta archivo de claves: ${keyPath}`);
  console.log(`Existe archivo de credenciales: ${fs.existsSync(keyPath) ? 'SI' : 'NO (opcional para modo local)'}`);

  const db = getDb();
  if (db) {
    try {
      console.log('Probando escritura/lectura en Firestore Cloud...');
      const testRef = db.collection('_healthcheck').doc('ping');
      await testRef.set({ timestamp: new Date().toISOString(), ok: true });
      const snap = await testRef.get();
      console.log(`Firestore Cloud: OPERATIVO (Ping exitoso: ${snap.data().ok})`);
    } catch (e) {
      console.error(`Firestore Cloud Error: ${e.message}`);
    }
  } else {
    console.log('Firestore Cloud: Desconectado (El sistema utiliza el motor local transaccional).');
  }

  const auth = getAuth();
  if (auth) {
    console.log('Firebase Authentication: CONECTADO');
  } else {
    console.log('Firebase Authentication: Modo Local (Control de contraseñas y roles interno).');
  }

  const bucket = getBucket();
  if (bucket) {
    console.log(`Firebase Storage Bucket: CONECTADO (${bucket.name})`);
  } else {
    console.log('Firebase Storage: Modo Local (Archivos guardados en /public/uploads).');
  }

  console.log('\n================================================================');
  console.log('DIAGNÓSTICO FINALIZADO');
  console.log('================================================================');
}

checkFirebase().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

