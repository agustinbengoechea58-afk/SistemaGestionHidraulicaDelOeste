/**
 * Configuración centralizada de imágenes del proyecto
 * Mapeo oficial y validado de assets existentes
 */
const path = require('path');
const fs = require('fs');

const IMAGES = {
  // Logotipos oficiales
  logo: {
    path: '/assets/logo.jpg',
    alt: 'Logo Taller Hidráulica Especializada',
    title: 'Logo Principal',
    category: 'branding'
  },
  logoBanner: {
    path: '/assets/logo2.jpg',
    alt: 'Logo Emblema Hidráulica y Cremalleras',
    title: 'Logo Secundario / Banner',
    category: 'branding'
  },

  // Imágenes de taller, servicios y trabajos
  heroWorkshop: {
    path: '/assets/foto1.jpg',
    alt: 'Taller de reparación y banco de pruebas hidráulico',
    title: 'Laboratorio de Diagnóstico Hidráulico',
    category: 'instalaciones'
  },
  steeringRacks: {
    path: '/assets/foto2.jpg',
    alt: 'Reparación de cremalleras de dirección hidráulica y cajas asistidas',
    title: 'Sector de Reparación de Cremalleras',
    category: 'cremalleras'
  },
  hydraulicPumps: {
    path: '/assets/imagen3.jpg',
    alt: 'Despiece y calibración de bombas hidráulicas de alta presión',
    title: 'Mesa de Calibración de Bombas Hidráulicas',
    category: 'bombas'
  },
  testingBench: {
    path: '/assets/imagen4.jpg',
    alt: 'Control y pruebas de estanqueidad y presión hidráulica',
    title: 'Banco de Pruebas y Control de Calidad',
    category: 'diagnostico'
  }
};

/**
 * Galería inicial basada en las imágenes reales existentes
 */
const INITIAL_GALLERY = [
  {
    id: 'gal-1',
    title: 'Calibración de Bomba Hidráulica en Banco',
    category: 'bombas',
    categoryName: 'Bombas Hidráulicas',
    description: 'Diagnóstico de caudal y presión en banco de pruebas industrial.',
    image: '/assets/imagen3.jpg',
    featured: true,
    active: true,
    order: 1
  },
  {
    id: 'gal-2',
    title: 'Reparación Integral de Cremallera Asistida',
    category: 'cremalleras',
    categoryName: 'Cremalleras de Dirección',
    description: 'Sustitución de retenes de alta presión, bujes de teflón y rectificado de barra.',
    image: '/assets/foto2.jpg',
    featured: true,
    active: true,
    order: 2
  },
  {
    id: 'gal-3',
    title: 'Laboratorio y Maquinaria Especializada',
    category: 'instalaciones',
    categoryName: 'Laboratorio Hidráulico',
    description: 'Instalaciones equipadas con instrumental de precisión micrométrica.',
    image: '/assets/foto1.jpg',
    featured: true,
    active: true,
    order: 3
  },
  {
    id: 'gal-4',
    title: 'Control de Presión y Estanqueidad',
    category: 'diagnostico',
    categoryName: 'Diagnóstico y Pruebas',
    description: 'Verificación de cero fugas y curva de presiones según especificaciones de fábrica.',
    image: '/assets/imagen4.jpg',
    featured: true,
    active: true,
    order: 4
  }
];

function verifyAssetsExist(baseDir = process.cwd()) {
  const results = {};
  for (const [key, item] of Object.entries(IMAGES)) {
    const localRel = item.path.replace(/^\//, '');
    const publicPath = path.join(baseDir, 'public', localRel);
    const rootPath = path.join(baseDir, localRel);
    const exists = fs.existsSync(publicPath) || fs.existsSync(rootPath);
    results[key] = {
      path: item.path,
      exists,
      title: item.title
    };
  }
  return results;
}

module.exports = {
  IMAGES,
  INITIAL_GALLERY,
  verifyAssetsExist
};

