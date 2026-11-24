/**
 * Servicio de Almacenamiento de Archivos e Imágenes (Firebase Storage + Fallback Local)
 */
const path = require('path');
const fs = require('fs');
const { getBucket, getStatus } = require('../config/firebase-admin');

const UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Guarda un archivo subido (Buffer o stream) y retorna la URL pública
 */
async function uploadFile(file, folder = 'general') {
  if (!file) throw new Error('No se proporcionó ningún archivo');

  const { isInitialized } = getStatus();
  const bucket = getBucket();
  const fileExt = path.extname(file.originalname || file.name || '.jpg').toLowerCase();
  const cleanName = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}${fileExt}`;
  const storagePath = `${folder}/${cleanName}`;

  // Intento de subida a Firebase Storage Cloud
  if (isInitialized && bucket) {
    try {
      const fileUpload = bucket.file(storagePath);
      const stream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype || 'image/jpeg'
        },
        resumable: false
      });

      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('finish', resolve);
        stream.end(file.buffer);
      });

      // Hacer archivo público o generar URL firmada
      await fileUpload.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
      return {
        url: publicUrl,
        path: storagePath,
        provider: 'firebase-storage',
        filename: cleanName,
        size: file.size
      };
    } catch (err) {
      console.warn('Firebase Storage upload error, guardando localmente:', err.message);
    }
  }

  // Guardado local en /public/uploads
  const targetSubdir = path.join(UPLOADS_DIR, folder);
  if (!fs.existsSync(targetSubdir)) {
    fs.mkdirSync(targetSubdir, { recursive: true });
  }

  const localFilePath = path.join(targetSubdir, cleanName);
  if (file.buffer) {
    fs.writeFileSync(localFilePath, file.buffer);
  } else if (file.path && fs.existsSync(file.path)) {
    fs.copyFileSync(file.path, localFilePath);
  }

  const relativeUrl = `/uploads/${folder}/${cleanName}`;
  return {
    url: relativeUrl,
    path: localFilePath,
    provider: 'local',
    filename: cleanName,
    size: file.size || (fs.existsSync(localFilePath) ? fs.statSync(localFilePath).size : 0)
  };
}

/**
 * Validar que un archivo sea una imagen permitida
 */
function validateImageFile(file, maxSizeMB = 10) {
  if (!file) return { valid: false, error: 'Archivo no recibido' };
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!allowedMime.includes(file.mimetype)) {
    return { valid: false, error: 'Formato no permitido. Solo JPG, PNG o WEBP' };
  }
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: `El archivo supera el tamaño máximo de ${maxSizeMB}MB` };
  }
  return { valid: true };
}

module.exports = {
  uploadFile,
  validateImageFile
};

