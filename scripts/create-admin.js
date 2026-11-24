/**
 * Script interactivo/por parámetros para crear o resetear un administrador
 * Ejecutable mediante: npm run create-admin -- email password name
 */
require('dotenv').config();
const { setDocument, queryDocuments } = require('../services/firestore.service');
const { getAuth, getStatus } = require('../config/firebase-admin');

async function createAdmin() {
  const args = process.argv.slice(2);
  const email = (args[0] || process.env.INITIAL_ADMIN_EMAIL || 'admin@hidraulicabengoechea.com').trim().toLowerCase();
  const password = args[1] || process.env.INITIAL_ADMIN_PASSWORD || 'AdminHidraulica2026!';
  const name = args[2] || process.env.INITIAL_ADMIN_NAME || 'Agustín Bengoechea (Administrador)';
  const role = (args[3] || 'SUPERADMIN').toUpperCase();

  console.log(`Creando o actualizando usuario administrador: ${email} (Rol: ${role})...`);

  // Si Firebase Admin Auth está activo, intentar crear usuario en Firebase Authentication Cloud
  const { isInitialized } = getStatus();
  const auth = getAuth();
  let uid = 'admin-' + Math.random().toString(36).substr(2, 8);

  if (isInitialized && auth) {
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
        await auth.updateUser(userRecord.uid, { password, displayName: name });
        uid = userRecord.uid;
        console.log(`Usuario actualizado en Firebase Auth: ${uid}`);
      } catch (notFound) {
        userRecord = await auth.createUser({
          email,
          password,
          displayName: name,
          emailVerified: true
        });
        uid = userRecord.uid;
        console.log(`Usuario creado en Firebase Auth: ${uid}`);
      }

      // Asignar Custom Claim de rol
      await auth.setCustomUserClaims(uid, { role });
    } catch (fbErr) {
      console.warn('Advertencia en Firebase Auth:', fbErr.message);
    }
  }

  // Guardar en Firestore
  const existing = await queryDocuments('employees', { email });
  const docId = existing.length > 0 ? existing[0].id : uid;

  await setDocument('employees', docId, {
    uid,
    email,
    password,
    name,
    role,
    active: true,
    specialty: 'Dirección General y Administración',
    updatedAt: new Date().toISOString()
  });

  console.log('Administrador configurado con exito:');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Rol: ${role}`);
}

createAdmin().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

