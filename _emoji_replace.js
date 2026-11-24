const fs = require('fs');
const path = require('path');

const roots = ['public', 'scripts', 'services', 'routes', 'middleware', 'config'];
const extra = ['server.js'];

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === 'uploads') continue;
      walk(full, out);
    } else if (/\.(html|js|css)$/.test(name)) {
      out.push(full);
    }
  }
}

const files = [];
roots.forEach((r) => walk(path.join(__dirname, r), files));
extra.forEach((f) => files.push(path.join(__dirname, f)));

const pairs = [
  ['<i data-lucide="shield-check"></i>', '<i class="fa-solid fa-shield-halved" aria-hidden="true"></i>'],
  ['⚙️ Laboratorio Hidráulico de Alta Presión', '<i class="fa-solid fa-gauge-high" aria-hidden="true"></i> Laboratorio Hidráulico de Alta Presión'],
  ['🔍 Seguimiento', '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Seguimiento'],
  ['<button class="mobile-menu-toggle" aria-label="Abrir Menú">☰</button>', '<button class="mobile-menu-toggle" type="button" aria-label="Abrir menú" aria-expanded="false"><i class="fa-solid fa-bars" aria-hidden="true"></i></button>'],
  ['<i>📊</i>', '<i class="fa-solid fa-chart-line" aria-hidden="true"></i>'],
  ['<i>⚙️</i>', '<i class="fa-solid fa-gears" aria-hidden="true"></i>'],
  ['<i>👥</i>', '<i class="fa-solid fa-users" aria-hidden="true"></i>'],
  ['<i>📋</i>', '<i class="fa-solid fa-file-lines" aria-hidden="true"></i>'],
  ['<i>📦</i>', '<i class="fa-solid fa-boxes-stacked" aria-hidden="true"></i>'],
  ['<i>🏭</i>', '<i class="fa-solid fa-industry" aria-hidden="true"></i>'],
  ['<i>💵</i>', '<i class="fa-solid fa-money-bill-wave" aria-hidden="true"></i>'],
  ['<i>🌐</i>', '<i class="fa-solid fa-globe" aria-hidden="true"></i>'],
  ['<i>📈</i>', '<i class="fa-solid fa-chart-column" aria-hidden="true"></i>'],
  ['<i>👷</i>', '<i class="fa-solid fa-user-gear" aria-hidden="true"></i>'],
  ['<span class="kpi-icon">⚙️</span>', '<span class="kpi-icon"><i class="fa-solid fa-gears" aria-hidden="true"></i></span>'],
  ['<span class="kpi-icon">✅</span>', '<span class="kpi-icon"><i class="fa-solid fa-circle-check" aria-hidden="true"></i></span>'],
  ['<span class="kpi-icon">📋</span>', '<span class="kpi-icon"><i class="fa-solid fa-file-lines" aria-hidden="true"></i></span>'],
  ['<span class="kpi-icon">💵</span>', '<span class="kpi-icon"><i class="fa-solid fa-money-bill-wave" aria-hidden="true"></i></span>'],
  ['<span class="kpi-icon">📦</span>', '<span class="kpi-icon"><i class="fa-solid fa-boxes-stacked" aria-hidden="true"></i></span>'],
  ['<span class="kpi-icon">⚠️</span>', '<span class="kpi-icon"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></span>'],
  ['<span class="kpi-icon">📈</span>', '<span class="kpi-icon"><i class="fa-solid fa-chart-column" aria-hidden="true"></i></span>'],
  ['<span class="kpi-icon">👥</span>', '<span class="kpi-icon"><i class="fa-solid fa-users" aria-hidden="true"></i></span>'],
  ['⚠️ Alertas de Stock Crítico', '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Alertas de Stock Crítico'],
  ['⚠️ Solo Stock Bajo', '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Solo Stock Bajo'],
  ['🎯 Misión', '<i class="fa-solid fa-bullseye" aria-hidden="true"></i> Misión'],
  ['🔭 Visión', '<i class="fa-solid fa-binoculars" aria-hidden="true"></i> Visión'],
  ['⭐ Valores', '<i class="fa-solid fa-star" aria-hidden="true"></i> Valores'],
  ['📍 Taller y Laboratorio Central', '<i class="fa-solid fa-location-dot" aria-hidden="true"></i> Taller y Laboratorio Central'],
  ['📞 Teléfonos de Contacto', '<i class="fa-solid fa-phone" aria-hidden="true"></i> Teléfonos de Contacto'],
  ['⏰ Horarios de Atención', '<i class="fa-solid fa-clock" aria-hidden="true"></i> Horarios de Atención'],
  ['🔐 Acceso Sistema ERP', '<i class="fa-solid fa-lock" aria-hidden="true"></i> Acceso Sistema ERP'],
  ['↗ Ver Sitio Público', '<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Ver Sitio Público'],
  ['<span>🔍</span>', '<span><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></span>'],
  ['🔔<span class="notification-badge hidden" id="notif-badge">0</span>', '<i class="fa-solid fa-bell" aria-hidden="true"></i><span class="notification-badge hidden" id="notif-badge">0</span>'],
  ['            🔔\n', '            <i class="fa-solid fa-bell" aria-hidden="true"></i>\n'],
  ['class="hidden">✕</button>', 'class="hidden" aria-label="Cerrar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>'],
  ['<div style="font-size: 2rem; margin-bottom: 0.5rem;">📷</div>', '<div class="dropzone-icon"><i class="fa-solid fa-camera" aria-hidden="true"></i></div>'],
  ['🔒 Sus datos serán utilizados exclusivamente para elaborar su presupuesto técnico.', '<i class="fa-solid fa-lock" aria-hidden="true"></i> Sus datos serán utilizados exclusivamente para elaborar su presupuesto técnico.'],
  ['📥 Exportar Reparaciones (CSV)', '<i class="fa-solid fa-file-export" aria-hidden="true"></i> Exportar Reparaciones (CSV)'],
  ['📥 Exportar Movimientos de Caja (CSV)', '<i class="fa-solid fa-file-export" aria-hidden="true"></i> Exportar Movimientos de Caja (CSV)'],
  ['📥 Exportar Inventario Actual (CSV)', '<i class="fa-solid fa-file-export" aria-hidden="true"></i> Exportar Inventario Actual (CSV)'],
  ['<option value="entrada">📥 Entrada (Compra / Reposición)</option>', '<option value="entrada">Entrada (Compra / Reposición)</option>'],
  ['<option value="ajuste">⚙️ Ajuste de Inventario (Conteo físico)</option>', '<option value="ajuste">Ajuste de Inventario (Conteo físico)</option>'],
  ['>✏️</button>', '><i class="fa-solid fa-pen" aria-hidden="true"></i></button>'],
  ['>🗑️</button>', '><i class="fa-solid fa-trash" aria-hidden="true"></i></button>'],
  ['>🔄 Estado</button>', '><i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i> Estado</button>'],
  ['>⚙️ Repuestos</button>', '><i class="fa-solid fa-screwdriver-wrench" aria-hidden="true"></i> Repuestos</button>'],
  ['>📷 Fotos</button>', '><i class="fa-solid fa-camera" aria-hidden="true"></i> Fotos</button>'],
  ['>📦 Movimiento</button>', '><i class="fa-solid fa-boxes-stacked" aria-hidden="true"></i> Movimiento</button>'],
  ['>📋 Historial</button>', '><i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i> Historial</button>'],
  ['>📄 PDF</a>', '><i class="fa-solid fa-file-pdf" aria-hidden="true"></i> PDF</a>'],
  ['>📱 WhatsApp</button>', '><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> WhatsApp</button>'],
  ['>🔄</button>', '><i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i></button>'],
  ['>📋</button>', '><i class="fa-solid fa-copy" aria-hidden="true"></i></button>'],
  ['>✕</button>', '><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>'],
  ['publishBtn.innerHTML = `🚀 Publicar Cambios en Vivo`;', 'publishBtn.innerHTML = `<i class="fa-solid fa-upload" aria-hidden="true"></i> Publicar Cambios en Vivo`;'],
  ['${r.trackingCode} ↗', '${r.trackingCode} <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>'],
  ['<div style="font-size: 3.5rem; margin-bottom: 1rem;">✅</div>', '<div class="status-icon success"><i class="fa-solid fa-circle-check" aria-hidden="true"></i></div>'],
  ['<div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚠️</div>', '<div class="status-icon warning"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></div>'],
  ['✓ Aprobar Presupuesto', '<i class="fa-solid fa-check" aria-hidden="true"></i> Aprobar Presupuesto'],
  ['📌 Número de consulta:', 'Numero de consulta:'],
  ['🚗 Vehículo:', 'Vehiculo:'],
  ['⚙️ Servicio solicitado:', 'Servicio solicitado:'],
  ['📋 Número:', 'Numero:'],
  ['🚗 Vehículo / Pieza:', 'Vehiculo / Pieza:'],
  ['💵 Importe Total:', 'Importe total:'],
  ['⏳ Vigencia:', 'Vigencia:'],
  ["console.log('🛠️  INICIANDO SETUP DEL SISTEMA HIDRÁULICO & CREMALLERAS');", "console.log('INICIANDO SETUP DEL SISTEMA HIDRAULICO Y CREMALLERAS');"],
  [' ... ✅', ' ... OK'],
  ['⚠️ Variables no especificadas:', '[AVISO] Variables no especificadas:'],
  ['🎉 SETUP COMPLETADO EXITOSAMENTE', 'SETUP COMPLETADO EXITOSAMENTE'],
  ['👤 Usuario Administrador:', 'Usuario Administrador:'],
  ['🔑 Contraseña Temporal:', 'Contrasena temporal:'],
  ['🌐 Portal Web Público:', 'Portal web publico:'],
  ['🔐 Acceso Administración:', 'Acceso administracion:'],
  ["console.error('❌ Error durante el setup:', err);", "console.error('[ERROR] Durante el setup:', err);"],
  ["console.log(`✅ Administrador configurado con éxito:`);", "console.log('Administrador configurado con exito:');"],
  ["console.log('🔍 DIAGNÓSTICO DE CONEXIÓN CON SERVICIOS DE FIREBASE');", "console.log('DIAGNOSTICO DE CONEXION CON SERVICIOS DE FIREBASE');"],
  ["status.isInitialized ? 'CONECTADO ✅' : 'MODO LOCAL FALLBACK ⚠️'", "status.isInitialized ? 'CONECTADO' : 'MODO LOCAL (respaldo)'"],
  ["fs.existsSync(keyPath) ? 'SÍ ✅' : 'NO (Opcional para modo local) ℹ️'", "fs.existsSync(keyPath) ? 'SI' : 'NO (opcional para modo local)'"],
  ['OPERATIVO ✅', 'OPERATIVO'],
  ['CONECTADO ✅', 'CONECTADO'],
  ["console.log('✅ Webhook de Meta WhatsApp verificado exitosamente');", "console.log('Webhook de Meta WhatsApp verificado exitosamente');"],
  ["console.warn('❌ Token de verificación de Webhook inválido');", "console.warn('Token de verificacion de Webhook invalido');"],
  ['🚀 SERVIDOR ACTIVO:', 'SERVIDOR ACTIVO:'],
  ['🏢 SISTEMA:', 'SISTEMA:'],
  ['🌐 PORTAL PÚBLICO:', 'PORTAL PUBLICO:'],
  ['🔐 PANEL DE ADMINISTRACIÓN:', 'PANEL DE ADMINISTRACION:'],
  ['📊 SEGUIMIENTO DE CLIENTES:', 'SEGUIMIENTO DE CLIENTES:'],
  ['🔥 MODO PERSISTENCIA FIREBASE:', 'MODO PERSISTENCIA FIREBASE:'],
  ['📁 ASSETS VERIFICADOS:', 'ASSETS VERIFICADOS:']
];

const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2139}]/gu;

let changed = 0;
const leftovers = [];

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  const original = text;
  for (const [from, to] of pairs) {
    if (text.includes(from)) text = text.split(from).join(to);
  }
  if (file.endsWith('.html') && !text.includes('fontawesome') && text.includes('/css/variables.css')) {
    text = text.replace(
      '<link rel="stylesheet" href="/css/variables.css">',
      '<link rel="stylesheet" href="/css/variables.css">\n  <link rel="stylesheet" href="/vendor/fontawesome/css/all.min.css">'
    );
  }
  text = text.replace(/\s*<script src="https:\/\/unpkg\.com\/lucide@latest"><\/script>/g, '');
  text = text.replace(/\s*<script>\s*lucide\.createIcons\(\);\s*<\/script>/g, '');
  if (text !== original) {
    fs.writeFileSync(file, text);
    changed++;
  }
  const hits = text.match(emojiRe);
  if (hits) leftovers.push(`${file}: ${[...new Set(hits)].join(' ')}`);
}

console.log('files changed', changed);
console.log('leftovers', leftovers.length);
leftovers.forEach((l) => console.log(l));
