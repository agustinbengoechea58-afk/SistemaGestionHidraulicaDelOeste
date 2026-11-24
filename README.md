# Plataforma Web Empresarial & ERP Hidráulico
## Hidraulica del oeste A.B & Cremalleras de Dirección

Sistema web empresarial completo, moderno y operativo para taller y laboratorio de reparación, diagnóstico y calibración de **bombas hidráulicas**, **cremalleras de dirección**, cajas asistidas y componentes hidráulicos.

---

## 1. Características Principales

### 🌐 Portal Web Público Dinámico
- **Header Inteligente**: Sticky con efecto de desenfoque al desplazarse, navegación responsive para celulares y botón de acción directa.
- **Hero Principal**: Título comercial de impacto, contadores animados de experiencia y estadísticas reales.
- **Catálogo de Servicios**: Tarjetas individuales para reparación de bombas, cremalleras, diagnóstico en banco trifásico, mantenimiento preventivo y rectificado de componentes.
- **Metodología en 7 Pasos**: Flujo transparente desde la recepción del componente hasta la entrega con garantía escrita.
- **Galería de Trabajos Reales**: Filtros dinámicos por categoría y visor modal (lightbox) con las fotografías originales de las instalaciones.
- **Cotizador Online con Fotos**: Formulario con subida de imágenes, validación de formatos, protección anti-spam y generación de código de seguimiento al instante.
- **Portal de Seguimiento del Cliente (`/seguimiento.html`)**: Permite a los clientes consultar en tiempo real el avance técnico de su reparación, historial de estados y aprobar presupuestos con un solo clic.

### 🔐 Panel Administrativo & ERP
- **Dashboard en Tiempo Real**: Métricas clave (OTs activas, terminadas, presupuestos pendientes, caja del mes, cuentas por cobrar, alertas de stock mínimo y órdenes atrasadas) con gráficos interactivos desarrollados en Chart.js.
- **Módulo de Reparaciones (Órdenes de Trabajo - OT)**:
  - Trazabilidad con **11 estados operativos**: *Recibido, En diagnóstico, Esperando aprobación, Aprobado, Esperando repuestos, En reparación, En pruebas, Reparado, Listo para entregar, Entregado, Cancelado*.
  - Auditoría de cambios de estado con usuario, fecha, nota técnica interna y comentario público para el cliente.
  - Subida de fotografías en 3 fases: Recepción, Proceso y Final.
  - Asignación de repuestos con **descuento automático del stock de inventario**.
- **Módulo de Clientes**: Cartera completa con historial integrado de reparaciones anteriores, presupuestos y cobros.
- **Módulo de Presupuestos**:
  - Detalle dinámico de ítems, mano de obra, repuestos y pruebas.
  - Recálculo en tiempo real de subtotales, descuentos e IVA (21%).
  - **Generación y descarga de presupuestos en PDF oficial** (`/api/budgets/:id/pdf`).
  - **Botón de compartir por WhatsApp** con enlace de seguimiento y mensaje formateado.
  - Función de duplicación de presupuestos.
- **Módulo de Inventario**: Control de existencias, costos, precios de venta, alertas automáticas de stock crítico y registro de movimientos (entradas, salidas y ajustes).
- **Módulo de Proveedores**: Directorio de proveedores de retenes vitón, barras, fuelles y fluidos.
- **Módulo de Caja y Finanzas**: Control de ingresos y egresos, categorización por servicios/compras/sueldos, medios de pago (Efectivo, Transferencia, Mercado Pago, Tarjeta) y cálculo de balance neto.
- **Módulo de Empleados y Equipo Técnico**: Control de roles y permisos (**SUPERADMIN**, **ADMIN**, **RECEPCIONISTA**, **TECNICO**, **CONTADOR**).
- **Módulo de Reportes**: Resumen de rendimiento y **exportación oficial a CSV / Excel**.
- **Sistema CMS Integrado (`/admin/cms.html`)**:
  - El administrador puede modificar títulos, estadísticas, servicios, fotos, testimonios, FAQs y SEO sin tocar código.
  - **Botón "Publicar Cambios en Vivo"**: Actualiza Firestore e invalida la memoria caché pública de forma instantánea.

---

## 2. Tecnologías Empleadas

- **Frontend**: HTML5 Semántico, CSS3 Puro con variables, JavaScript Vanilla (ES6+), Chart.js, Lucide Icons.
- **Backend**: Node.js v20+, Express.js.
- **Seguridad y Rendimiento**: Helmet, CORS, Express Rate Limit, Multer, Compresión Gzip, Cookie Parser.
- **Generación de Documentos**: PDFKit (PDFs vectoriales nativos para presupuestos).
- **Persistencia y Nube**: Firebase Admin SDK, Firebase Firestore, Firebase Storage y Firebase Authentication.
  - *Motor Híbrido Resiliente*: El sistema incluye persistencia atómica local transaccional para arrancar de inmediato sin configuración previa, y se enlaza de forma transparente con Firebase Cloud al colocar las credenciales.

---

## 3. Uso de los Assets Existentes

El proyecto inspecciona y utiliza prioritariamente las fotografías oficiales ubicadas en `/assets/` y `/public/assets/`:
- `foto1.jpg`: Laboratorio de diagnóstico y hero principal.
- `foto2.jpg`: Sector de reparación y rectificado de cremalleras asistidas.
- `imagen3.jpg`: Mesa de calibración y despiece de bombas hidráulicas.
- `imagen4.jpg`: Banco de pruebas de presión y control de estanqueidad.
- `logo.jpg`: Isologotipo corporativo principal.
- `logo2.jpg`: Emblema institucional secundario / banner.

Centralizado en `config/images.js`.

---

## 4. Instalación y Puesta en Marcha

### Requisitos Previos
- Node.js instalado (v18 o superior).

### Paso 1: Instalar Dependencias
```bash
npm install
```

### Paso 2: Ejecutar el Setup Automático
```bash
npm run setup
```
El script de inicialización comprobará el entorno, inicializará las colecciones en Firestore, cargará los 6 servicios base, la galería fotográfica, las preguntas frecuentes, el inventario inicial y configurará al primer usuario administrador:
- **Usuario Administrador**: `admin@hidraulicabengoechea.com`
- **Contraseña Temporal**: `AdminHidraulica2026!`

### Paso 3: Iniciar la Plataforma
```bash
npm start
```

### URLs de Acceso:
- **Página Web Pública**: [http://localhost:3000/](http://localhost:3000/)
- **Panel Administrativo (Login)**: [http://localhost:3000/admin/login.html](http://localhost:3000/admin/login.html)
- **Portal de Seguimiento de Clientes**: [http://localhost:3000/seguimiento.html](http://localhost:3000/seguimiento.html)

---

## 5. Conexión con Firebase Cloud (Opcional para Producción)

Para conectar el sistema con un proyecto de Google Firebase Cloud:
1. Cree un proyecto en la [Consola de Firebase](https://console.firebase.google.com/).
2. Vaya a **Configuración del Proyecto > Cuentas de Servicio**.
3. Haga clic en **Generar nueva clave privada** y descargue el archivo JSON.
4. Guarde el archivo descargado como `serviceAccountKey.json` dentro de la carpeta `config/`.
5. Ejecute el verificador de conexión:
   ```bash
   npm run check-firebase
   ```
6. El sistema detectará automáticamente la clave y sincronizará todas las colecciones con Firebase Cloud.

### Reglas de Seguridad de Firestore Recomendadas:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Contenido público de lectura
    match /site_settings/{doc} { allow read: if true; allow write: if request.auth != null; }
    match /site_services/{doc} { allow read: if true; allow write: if request.auth != null; }
    match /site_gallery/{doc} { allow read: if true; allow write: if request.auth != null; }
    match /site_faq/{doc} { allow read: if true; allow write: if request.auth != null; }
    match /site_home/{doc} { allow read: if true; allow write: if request.auth != null; }
    match /site_about/{doc} { allow read: if true; allow write: if request.auth != null; }
    
    // Solicitudes públicas de clientes
    match /quotes/{doc} { allow create: if true; allow read, write: if request.auth != null; }
    
    // Módulos ERP restringidos a usuarios autenticados
    match /repairs/{doc} { allow read, write: if request.auth != null; }
    match /clients/{doc} { allow read, write: if request.auth != null; }
    match /budgets/{doc} { allow read, write: if request.auth != null; }
    match /inventory/{doc} { allow read, write: if request.auth != null; }
    match /payments/{doc} { allow read, write: if request.auth != null; }
    match /employees/{doc} { allow read, write: if request.auth != null; }
  }
}
```

---

## 6. Estructura de Directorios

```text
empresa-hidraulica/
├── config/
│   ├── firebase-admin.js       # Inicialización y diagnóstico Firebase Admin SDK
│   └── images.js               # Mapeo y verificación de assets existentes
├── middleware/
│   ├── auth.js                 # Middleware de validación de tokens y sesión
│   ├── permissions.js          # Control de acceso basado en roles (RBAC)
│   ├── validation.js           # Validación y sanitización de formularios
│   └── error-handler.js        # Manejador centralizado de errores
├── routes/
│   ├── public.routes.js        # API pública, CMS visible y cotizador
│   ├── auth.routes.js          # Login, sesión y perfil
│   ├── cms.routes.js           # Submódulos del CMS y botón de publicación
│   ├── clients.routes.js       # CRUD de clientes e historial
│   ├── repairs.routes.js       # Órdenes de trabajo, 11 estados y fotos
│   ├── budgets.routes.js       # Presupuestos, cálculo y PDF
│   ├── inventory.routes.js     # Repuestos, alertas y movimientos
│   ├── suppliers.routes.js     # Proveedores de piezas
│   ├── payments.routes.js      # Caja chica, cobros y balances
│   ├── employees.routes.js     # Técnicos y roles
│   ├── reports.routes.js       # Reportes y exportación CSV
│   └── settings.routes.js      # Parámetros del negocio y notificaciones
├── services/
│   ├── firestore.service.js    # Capa de datos dual (Cloud Firestore + Local)
│   ├── storage.service.js      # Almacenamiento de fotos (Cloud + Local)
│   ├── pdf.service.js          # Generador de Presupuestos PDF con PDFKit
│   └── notification.service.js # Alertas internas y enlaces WhatsApp
├── scripts/
│   ├── setup.js                # Inicializador automático del sistema
│   ├── create-admin.js         # Creación/reseteo seguro de administrador
│   └── check-firebase.js       # Diagnóstico de servicios Firebase
├── public/
│   ├── index.html              # Portada comercial completa
│   ├── servicios.html          # Catálogo de servicios detallado
│   ├── nosotros.html           # Presentación e infraestructura
│   ├── contacto.html           # Datos de contacto y mapa
│   ├── seguimiento.html        # Portal público para clientes
│   ├── admin/                  # Panel privado administrativo
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── clientes.html
│   │   ├── reparaciones.html
│   │   ├── presupuestos.html
│   │   ├── inventario.html
│   │   ├── proveedores.html
│   │   ├── caja.html
│   │   ├── empleados.html
│   │   ├── reportes.html
│   │   ├── configuracion.html
│   │   └── cms.html
│   ├── css/                    # Estilos con paleta negra y dorada
│   ├── js/                     # Lógica frontend Vanilla JS modular
│   └── assets/                 # Imágenes originales preservadas
├── package.json
├── server.js
├── .env
├── .env.example
└── README.md
```

---

## 7. Licencia y Créditos
Desarrollado para **Hidraulica del oeste A.B & Cremalleras de Dirección**.
Todos los derechos reservados © 2026.

