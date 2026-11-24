/**
 * Servidor Principal - Plataforma Web Empresarial y ERP Hidráulico
 * Hidraulica del oeste A.B & Cremalleras de Dirección
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Configuración y servicios
const { getStatus } = require('./config/firebase-admin');
const { verifyAssetsExist } = require('./config/images');
const errorHandler = require('./middleware/error-handler');

// Rutas modulares
const { router: publicRoutes } = require('./routes/public.routes');
const authRoutes = require('./routes/auth.routes');
const cmsRoutes = require('./routes/cms.routes');
const clientsRoutes = require('./routes/clients.routes');
const repairsRoutes = require('./routes/repairs.routes');
const budgetsRoutes = require('./routes/budgets.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const suppliersRoutes = require('./routes/suppliers.routes');
const paymentsRoutes = require('./routes/payments.routes');
const employeesRoutes = require('./routes/employees.routes');
const reportsRoutes = require('./routes/reports.routes');
const settingsRoutes = require('./routes/settings.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de Seguridad y Rendimiento
app.use(helmet({
  contentSecurityPolicy: false, // Permitir fuentes, Chart.js y Lucide desde CDN
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Limitador de tasa contra spam en endpoints públicos
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // 300 peticiones
  message: { success: false, error: 'Demasiadas solicitudes. Intente más tarde.' }
});

const quoteRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // Máximo 20 presupuestos por IP
  message: { success: false, error: 'Límite de solicitudes de cotización alcanzado temporalmente.' }
});

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
// Servir Font Awesome localmente desde node_modules
app.use('/vendor/fontawesome', express.static(path.join(__dirname, 'node_modules', '@fortawesome', 'fontawesome-free')));

// Rutas de SEO
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: ${process.env.APP_URL || 'http://localhost:3000'}/sitemap.xml`);
});

app.get('/sitemap.xml', (req, res) => {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/servicios.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/nosotros.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/contacto.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/seguimiento.html</loc>
    <changefreq>always</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;
  res.type('application/xml');
  res.send(xml);
});

// Registro de Rutas API
app.use('/api/public/quote-request', quoteRequestLimiter);
app.use('/api/public', publicLimiter, publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/repairs', repairsRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);

// Endpoint de diagnóstico y salud del sistema
app.get('/api/health', (req, res) => {
  const firebaseStatus = getStatus();
  const assetsStatus = verifyAssetsExist(__dirname);
  res.json({
    status: 'ONLINE',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    firebase: firebaseStatus,
    assets: assetsStatus
  });
});

// Manejo centralizado de errores
app.use(errorHandler);

// Iniciar servidor Express
const server = app.listen(PORT, () => {
  console.log('================================================================');
  console.log(`SERVIDOR ACTIVO: http://localhost:${PORT}`);
  console.log(`SISTEMA: ${process.env.APP_NAME || 'Hidraulica del oeste A.B'}`);
  console.log(`PORTAL PUBLICO: http://localhost:${PORT}`);
  console.log(`PANEL DE ADMINISTRACION: http://localhost:${PORT}/admin/login.html`);
  console.log(`SEGUIMIENTO DE CLIENTES: http://localhost:${PORT}/seguimiento.html`);

  const fb = getStatus();
  console.log(`MODO PERSISTENCIA FIREBASE: ${fb.initMode} (Iniciado: ${fb.isInitialized})`);

  const assetsCheck = verifyAssetsExist(__dirname);
  const totalAssets = Object.keys(assetsCheck).length;
  const verifiedAssets = Object.values(assetsCheck).filter(a => a.exists).length;
  console.log(`ASSETS VERIFICADOS: ${verifiedAssets}/${totalAssets} imágenes presentes.`);
  console.log('================================================================');
});

module.exports = { app, server };

