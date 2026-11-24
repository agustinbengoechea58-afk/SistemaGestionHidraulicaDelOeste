/**
 * Script de Inicialización y Setup Automático del Sistema
 * Ejecutable mediante: npm run setup
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { getStatus, initFirebaseAdmin } = require('../config/firebase-admin');
const { setDocument, getDocument, addDocument } = require('../services/firestore.service');
const { INITIAL_GALLERY } = require('../config/images');

async function runSetup() {
  console.log('================================================================');
  console.log('INICIANDO SETUP DEL SISTEMA HIDRAULICO Y CREMALLERAS');
  console.log('================================================================\n');

  // 1. Comprobar Node.js
  const nodeVersion = process.version;
  console.log(`1. Comprobación de Node.js: ${nodeVersion} ... OK`);

  // 2. Verificar variables de entorno
  console.log('2. Verificando variables de entorno...');
  const requiredEnv = ['PORT'];
  const missingEnv = requiredEnv.filter(k => !process.env[k]);
  if (missingEnv.length > 0) {
    console.warn(`   [AVISO] Variables no especificadas: ${missingEnv.join(', ')}. Se usarán valores predeterminados.`);
  } else {
    console.log('   Variables de entorno verificadas ... OK');
  }

  // 3. Inicializar Firebase Admin
  console.log('3. Inicializando Firebase Admin...');
  initFirebaseAdmin();
  const fbStatus = getStatus();
  console.log(`   Modo de persistencia: ${fbStatus.initMode} (Conectado: ${fbStatus.isInitialized}) ... OK`);

  // 4. Crear documentos iniciales de configuración CMS
  console.log('4. Creando documentos de configuración del negocio (CMS)...');

  // 4.1 Configuración General
  await setDocument('site_settings', 'main', {
    businessName: 'Bengoechea Hidráulica & Cremalleras',
    tagline: 'Laboratorio de Alta Precisión en Bombas Hidráulicas y Cremalleras de Dirección',
    currency: 'ARS',
    currencySymbol: '$',
    taxPercent: 21,
    logo: '/assets/logo.jpg',
    logoBanner: '/assets/logo2.jpg',
    warrantyConditions: 'Garantía oficial escrita de 6 meses en todas las reparaciones hidráulicas calibradas en banco de pruebas con fluidos homologados.',
    termsAndConditions: 'Todas las piezas reparadas son sometidas a control de caudal, presión y estanqueidad a temperatura de régimen de trabajo.'
  });

  // 4.2 Contacto y Redes
  await setDocument('site_contact', 'main', {
    phone: '+54 9 11 4567-8900',
    whatsapp: '+54 9 11 2345-6789',
    email: 'contacto@hidraulicabengoechea.com',
    address: 'Av. Industrial 4550, Zona Taller y Laboratorio',
    city: 'Buenos Aires',
    province: 'Buenos Aires, Argentina',
    hours: 'Lunes a Viernes de 8:00 a 18:00 hs | Sábados de 8:30 a 12:30 hs',
    mapUrl: 'https://maps.google.com/?q=Buenos+Aires',
    socials: {
      facebook: 'https://facebook.com',
      instagram: 'https://instagram.com',
      tiktok: 'https://tiktok.com'
    }
  });

  // 4.3 Página de Inicio
  await setDocument('site_home', 'main', {
    title: 'Especialistas en Bombas Hidráulicas y Cremalleras de Dirección',
    subtitle: 'Diagnóstico computarizado de alta presión, banco de calibración industrial y garantía escrita de 6 meses.',
    description: 'Más de 20 años de experiencia solucionando fallas de dirección dura, zumbidos en bombas, pérdidas de fluido y juegos en cremalleras mecánicas, hidráulicas y electrohidráulicas.',
    heroImage: '/assets/foto1.jpg',
    primaryButtonText: 'Solicitar Presupuesto',
    primaryButtonLink: '#presupuesto',
    secondaryButtonText: 'Consultar por WhatsApp',
    secondaryButtonLink: 'whatsapp',
    stats: [
      { label: 'Años de Trayectoria', value: '+20' },
      { label: 'Bombas y Cremalleras Reparadas', value: '+8.500' },
      { label: 'Calibración en Banco de Pruebas', value: '100%' },
      { label: 'Garantía Escrita', value: '6 Meses' }
    ]
  });

  // 4.4 Nosotros
  await setDocument('site_about', 'main', {
    title: 'Nuestra Trayectoria y Precisión Industrial',
    history: 'Fundada hace más de dos décadas, nuestra empresa nació con la misión de brindar un estándar de diagnóstico y reconstrucción hidráulica superior, utilizando banco de pruebas de tecnología de punta y repuestos legítimos.',
    mission: 'Garantizar el óptimo rendimiento y seguridad de los sistemas de dirección y circuitos hidráulicos de nuestros clientes con máxima precisión técnica y honestidad.',
    vision: 'Ser el laboratorio de referencia nacional en reparación y diagnóstico de componentes hidráulicos y cremalleras de dirección de vehículos livianos, utilitarios y maquinaria.',
    values: [
      'Precisión técnica milimétrica en cada ajuste y mecanizado.',
      'Transparencia y presupuestos claros sin sorpresas.',
      'Control de calidad riguroso en banco de pruebas antes de cada entrega.',
      'Compromiso y respuesta ágil a talleres mecánicos y clientes particulares.'
    ],
    image: '/assets/foto1.jpg'
  });

  // 4.5 Orden y visibilidad de secciones
  await setDocument('site_sections', 'main', {
    order: [
      { id: 'hero', name: 'Inicio', active: true },
      { id: 'nosotros', name: 'Nosotros', active: true },
      { id: 'servicios', name: 'Servicios Especializados', active: true },
      { id: 'proceso', name: 'Proceso de Trabajo', active: true },
      { id: 'precios', name: 'Tarifas y Presupuestos', active: true },
      { id: 'galeria', name: 'Galería de Trabajos', active: true },
      { id: 'faq', name: 'Preguntas Frecuentes', active: true },
      { id: 'contacto', name: 'Contacto y Ubicación', active: true }
    ]
  });

  // 4.6 Servicios Iniciales Reales (6 servicios base del requerimiento)
  console.log('5. Creando catálogo inicial de servicios...');
  const initialServices = [
    {
      id: 'srv-bombas-hidraulicas',
      name: 'Reparación de Bombas Hidráulicas',
      slug: 'reparacion-de-bombas-hidraulicas',
      shortDescription: 'Desarme completo, rectificado de rotor, cambio de paletas, retenes vitón y prueba de presión en banco.',
      fullDescription: 'Reparamos bombas de dirección asistida de todas las marcas automotrices e industriales. Reemplazamos kits de retenes de alta presión, rodamientos, válvulas reguladoras y pistones.',
      price: 'Desde $85.000',
      priceMode: 'desde',
      image: '/assets/imagen3.jpg',
      category: 'Bombas',
      features: ['Prueba de caudal en banco hidráulico', 'Sustitución de retenes vitón de alta temperatura', 'Control de válvula reguladora de presión', 'Garantía 6 meses'],
      order: 1,
      active: true,
      featured: true
    },
    {
      id: 'srv-cremalleras-direccion',
      name: 'Reparación de Cremalleras de Dirección',
      slug: 'reparacion-de-cremalleras-de-direccion',
      shortDescription: 'Rectificado de barra dentada, cambio de bujes en teflón maquinado, retenes axiales y eliminación de juegos.',
      fullDescription: 'Servicio integral para cremalleras hidráulicas, mecánicas y electroasistidas. Solucionamos pérdidas de fluido por los fuelles, dirección dura y golpes o ruidos metálicos en empedrado.',
      price: 'Desde $110.000',
      priceMode: 'desde',
      image: '/assets/foto2.jpg',
      category: 'Cremalleras',
      features: ['Mecanizado de bujes de teflón antivibración', 'Pulido y rectificado de barra con precisión centesimal', 'Retenes de alta presión originales', 'Prueba de estanqueidad'],
      order: 2,
      active: true,
      featured: true
    },
    {
      id: 'srv-diagnostico-hidraulico',
      name: 'Diagnóstico Hidráulico en Banco',
      slug: 'diagnostico-hidraulico',
      shortDescription: 'Verificación computarizada y manométrica de presión de trabajo, caudal y fugas internas en circuito cerrado.',
      fullDescription: 'Contamos con banco de pruebas de motor trifásico con variación de RPM y temperatura controlada, simulando las condiciones reales de funcionamiento del vehículo.',
      price: 'Presupuesto según diagnóstico',
      priceMode: 'diagnostico',
      image: '/assets/imagen4.jpg',
      category: 'Diagnóstico',
      features: ['Medición de presión hasta 180 BAR', 'Curva de caudal a distintas RPM', 'Detección de cavitación y turbulencia', 'Informe técnico detallado'],
      order: 3,
      active: true,
      featured: true
    },
    {
      id: 'srv-mantenimiento-preventivo',
      name: 'Mantenimiento Preventivo y Flushing',
      slug: 'mantenimiento-preventivo',
      shortDescription: 'Vaciado, limpieza del circuito con fluido limpiador técnico, purgado y recambio de fluido hidráulico sintético homologado.',
      fullDescription: 'El 80% de las fallas en bombas y cremalleras son producidas por fluido contaminado con virutas metálicas. Nuestro servicio de flushing prolonga la vida útil del sistema.',
      price: 'Precio fijo: $45.000',
      priceMode: 'fijo',
      image: '/assets/foto1.jpg',
      category: 'Mantenimiento',
      features: ['Flushing integral del circuito', 'Eliminación de depósitos y virutas', 'Fluido hidráulico sintético premium', 'Reemplazo de abrazaderas y fuelles'],
      order: 4,
      active: true,
      featured: false
    },
    {
      id: 'srv-reparacion-componentes',
      name: 'Reparación de Componentes y Válvulas',
      slug: 'reparacion-de-componentes',
      shortDescription: 'Acondicionamiento de cajas de dirección asistidas, válvulas rotativas, cilindros y cañerías de alta presión.',
      fullDescription: 'Reparamos distribuidores rotativos, cilindros de dirección y mangueras armadas para alta presión para líneas pesadas y utilitarios.',
      price: 'A consultar',
      priceMode: 'consultar',
      image: '/assets/foto2.jpg',
      category: 'Componentes',
      features: ['Tornería y rectificado propio', 'Prensado de mangueras de alta presión', 'Sustitución de sellos tóricos vitón', 'Inspección de tolerancias'],
      order: 5,
      active: true,
      featured: false
    },
    {
      id: 'srv-control-pruebas',
      name: 'Control y Pruebas de Funcionamiento',
      slug: 'control-y-pruebas',
      shortDescription: 'Verificación final de 100% de los trabajos en banco antes de la entrega al cliente.',
      fullDescription: 'Ningún componente sale de nuestras instalaciones sin haber superado el protocolo de ensayo de fugas externas y presión sostenida.',
      price: 'Incluido en reparación',
      priceMode: 'fijo',
      image: '/assets/imagen4.jpg',
      category: 'Diagnóstico',
      features: ['Certificado de prueba en banco', 'Control de temperatura de operación', 'Cero fugas garantizado', 'Sello de garantía Bengoechea'],
      order: 6,
      active: true,
      featured: false
    }
  ];

  for (const srv of initialServices) {
    await setDocument('site_services', srv.id, srv);
  }

  // 4.7 Galería Inicial
  console.log('6. Cargando galería fotográfica oficial...');
  for (const item of INITIAL_GALLERY) {
    await setDocument('site_gallery', item.id, item);
  }

  // 4.8 Preguntas Frecuentes Iniciales
  console.log('7. Creando preguntas frecuentes iniciales...');
  const initialFaqs = [
    {
      id: 'faq-1',
      question: '¿Qué síntomas indican que la bomba hidráulica está fallando?',
      answer: 'Los síntomas más habituales son zumbido o chillido agudo al girar el volante (especialmente en maniobras de estacionamiento), endurecimiento intermitente de la dirección y presencia de espuma en el depósito de fluido.',
      category: 'Bombas',
      order: 1,
      active: true
    },
    {
      id: 'faq-2',
      question: '¿Por qué pierde líquido hidráulico la cremallera de dirección?',
      answer: 'Generalmente se debe al desgaste o rotura de los fuelles de protección, lo que permite el ingreso de agua y tierra que oxida la barra dentada y destruye los retenes de alta presión. En nuestro taller rectificamos la barra a medida y colocamos retenes nuevos.',
      category: 'Cremalleras',
      order: 2,
      active: true
    },
    {
      id: 'faq-3',
      question: '¿Cuánto tiempo demora la reparación de un componente?',
      answer: 'El diagnóstico en banco se realiza en el día. Una reparación integral de bomba o cremallera suele demorar habitualmente entre 24 y 48 horas hábiles, según la disponibilidad de repuestos específicos.',
      category: 'Tiempos y Plazos',
      order: 3,
      active: true
    },
    {
      id: 'faq-4',
      question: '¿Qué garantía tienen las reparaciones?',
      answer: 'Brindamos una garantía escrita de 6 meses en todas las reparaciones, respaldada por la prueba previa en banco hidráulico y la utilización de componentes de sellado de primera calidad.',
      category: 'Garantía',
      order: 4,
      active: true
    }
  ];

  for (const faq of initialFaqs) {
    await setDocument('site_faq', faq.id, faq);
  }

  // 5. Repuestos iniciales de inventario
  console.log('8. Preparando inventario inicial de repuestos...');
  const initialInventory = [
    {
      id: 'inv-ret-01',
      code: 'RET-VIT-2840',
      name: 'Kit Retenes Vitón Alta Presión para Cremallera 28x40x7',
      category: 'Retenes',
      supplierName: 'Sellos Hidráulicos Industriales S.A.',
      cost: 4500,
      salePrice: 12500,
      stock: 14,
      minStock: 4,
      location: 'Estante A-2',
      description: 'Retén reforzado con doble labio y resorte inoxidable para cremalleras livianas.'
    },
    {
      id: 'inv-buj-02',
      code: 'BUJ-TEF-30',
      name: 'Buje de Cremallera en Teflón Virgen Mecanizado 30mm',
      category: 'Bujes',
      supplierName: 'Mecanizados Bengoechea',
      cost: 3200,
      salePrice: 8900,
      stock: 18,
      minStock: 5,
      location: 'Estante B-1',
      description: 'Buje de guía autolubricado para anular holgura axial y golpeteo.'
    },
    {
      id: 'inv-flu-03',
      code: 'FLU-ATF-SYN',
      name: 'Fluido Hidráulico Sintético Dirección Asistida 1 Litro',
      category: 'Fluidos',
      supplierName: 'Distribuidora Lubricantes Centro',
      cost: 8500,
      salePrice: 19500,
      stock: 22,
      minStock: 6,
      location: 'Depósito Líquidos L-1',
      description: 'Fluido de alta viscosidad y resistencia a la cavitación para bombas hidráulicas.'
    },
    {
      id: 'inv-fue-04',
      code: 'FUE-CREM-UNIV',
      name: 'Fuelle Guardapolvo Cremallera Termoplástico Reforzado',
      category: 'Fuelles',
      supplierName: 'Gomas y Partes Automotrices',
      cost: 2100,
      salePrice: 5800,
      stock: 3,
      minStock: 5, // Notificación de stock bajo intencional para verificar alertas
      location: 'Estante C-3',
      description: 'Fuelle resistente a hidrocarburos y temperatura con abrazaderas metálicas.'
    }
  ];

  for (const item of initialInventory) {
    await setDocument('inventory', item.id, item);
  }

  // 6. Proveedores iniciales
  console.log('9. Registrando proveedores iniciales...');
  const initialSuppliers = [
    {
      id: 'sup-1',
      name: 'Sellos Hidráulicos Industriales S.A.',
      contactPerson: 'Roberto Martínez',
      phone: '+54 11 4789-1122',
      email: 'ventas@selloshidraulicos.com',
      category: 'Retenes y O-Rings',
      address: 'Zona Industrial San Martín'
    },
    {
      id: 'sup-2',
      name: 'Distribuidora Lubricantes Centro',
      contactPerson: 'Carlos Rossi',
      phone: '+54 11 4333-8899',
      email: 'pedidos@lubricantescentro.com',
      category: 'Fluidos y Químicos',
      address: 'Av. Juan B. Justo 3200'
    }
  ];

  for (const sup of initialSuppliers) {
    await setDocument('suppliers', sup.id, sup);
  }

  // 7. Crear el primer administrador
  console.log('10. Creando primer usuario administrador...');
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@hidraulicabengoechea.com').trim().toLowerCase();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'AdminHidraulica2026!';
  const adminName = process.env.INITIAL_ADMIN_NAME || 'Agustín Bengoechea (Administrador)';

  await setDocument('employees', 'admin-root', {
    id: 'admin-root',
    email: adminEmail,
    password: adminPassword,
    name: adminName,
    role: 'SUPERADMIN',
    phone: '+54 9 11 2345-6789',
    specialty: 'Dirección Técnica y Diagnóstico',
    active: true,
    createdAt: new Date().toISOString()
  });

  // Crear también técnicos de ejemplo para asignaciones de órdenes
  await setDocument('employees', 'tech-martin', {
    id: 'tech-martin',
    email: 'martin.tecnico@hidraulicabengoechea.com',
    password: 'Tecnico2026!',
    name: 'Martín Gómez (Técnico)',
    role: 'TECNICO',
    phone: '+54 9 11 5555-1234',
    specialty: 'Cremalleras y Cajas Asistidas',
    active: true,
    createdAt: new Date().toISOString()
  });

  console.log('\n================================================================');
  console.log('SETUP COMPLETADO EXITOSAMENTE');
  console.log('================================================================');
  console.log(`Usuario Administrador: ${adminEmail}`);
  console.log(`Contrasena temporal:   ${adminPassword}`);
  console.log(`Portal web publico:    http://localhost:${process.env.PORT || 3000}/`);
  console.log(`Acceso administracion: http://localhost:${process.env.PORT || 3000}/admin/login.html`);
  console.log('================================================================\n');
}

runSetup().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('[ERROR] Durante el setup:', err);
  process.exit(1);
});

