# Plataforma Interna OKR/CRM - Reiki Solar

Plataforma SaaS B2B completa para gestión integral de:
- **OKR** (Objetivos y Resultados Clave)
- **CRM Comercial** con pipeline y customer journey
- **Marketing** con seguimiento de campañas y ROI
- **Administración** de contratos y facturación

**URL:** `reikisolar.com.co/OKR`

---

## 🚀 Características Principales

### Módulo OKR
- Crear OKR Anuales, Trimestrales y Mensuales
- Definir Resultados Clave (KRs) con métricas numéricas, porcentajes o cualitativas
- Dashboard por área y por usuario
- Historial de actualizaciones y progreso

### Módulo CRM
- Gestión de empresas y contactos
- Pipeline de oportunidades con etapas configurables
- Actividades comerciales (llamadas, reuniones, emails, visitas)
- Vista Kanban del pipeline
- Métricas y proyecciones de cierre

### Módulo de Cotizaciones
- Generar cotizaciones desde oportunidades
- Generación automática de PDF
- Tracking de visualizaciones (cuándo el cliente abre la cotización)
- Envío por email
- Link público con token único
- Integración con Google Drive para almacenamiento

### Módulo de Contratos
- Generación automática desde oportunidades ganadas
- Plantillas de contrato
- Gestión de estados (Borrador, Enviado, Aprobado, Firmado)
- Tareas administrativas asociadas
- Seguimiento de facturación y pagos

### Módulo de Marketing
- Gestión de campañas por canal
- Métricas de ROI por campaña
- Relación con leads y oportunidades
- Dashboard de métricas de marketing

---

## 🏗️ Arquitectura

### Stack Tecnológico

**Frontend:**
- Next.js 14+ (App Router)
- React 19 + TypeScript
- TailwindCSS
- TanStack Query (React Query)
- React Hook Form + Zod

**Backend:**
- NestJS + TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Google Drive API

**Integraciones:**
- Google Drive API v3 (Service Account)
- Generación de PDFs (PDFKit)
- Generación de documentos (docx)

### Estructura del Proyecto

```
REIKINEW/
├── apps/
│   ├── api/              # Backend NestJS
│   │   ├── src/
│   │   │   ├── auth/     # Autenticación
│   │   │   ├── users/    # Usuarios
│   │   │   ├── okr/      # Módulo OKR
│   │   │   ├── crm/      # Módulo CRM
│   │   │   ├── quote/    # Cotizaciones
│   │   │   ├── contract/ # Contratos
│   │   │   ├── marketing/# Marketing
│   │   │   └── google-drive/ # Integración Drive
│   │   └── prisma/
│   │       └── schema.prisma
│   └── web/              # Frontend Next.js
│       ├── app/
│       │   ├── (auth)/   # Páginas de autenticación
│       │   └── (dashboard)/ # Páginas del dashboard
│       └── components/   # Componentes React
├── prisma/
│   └── schema.prisma     # Schema de base de datos
└── docs/                 # Documentación
```

---

## 📊 Schema de Base de Datos

El schema incluye las siguientes entidades principales:

- **User, Role, UserRole** - Gestión de usuarios y roles
- **OKR, KeyResult, OKRUpdate** - Módulo OKR
- **Company, Contact, Opportunity, Activity** - Módulo CRM
- **Quote, QuoteItem, QuoteViewLog** - Cotizaciones
- **Contract, AdminTask** - Contratos y administración
- **Campaign, CampaignMetrics** - Marketing
- **GoogleDriveFile** - Referencias a archivos en Drive

Ver `prisma/schema.prisma` para el schema completo.

---

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- PostgreSQL 14+
- Cuenta de Google Cloud con Drive API habilitada

### Instalación

1. **Configurar Backend:**
```bash
cd apps/api
npm install
cp .env.example .env
# Editar .env con tus credenciales
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

2. **Configurar Frontend:**
```bash
cd apps/web
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm run dev
```

3. **Acceder:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api

Para instrucciones detalladas, ver `INSTALACION_PLATAFORMA_OKR.md`.

---

## 📚 Documentación

- **ARQUITECTURA_OKR_PLATFORM.md** - Arquitectura completa y decisiones técnicas
- **INSTALACION_PLATAFORMA_OKR.md** - Guía de instalación paso a paso
- **apps/api/README.md** - Documentación del backend
- **prisma/schema.prisma** - Schema de base de datos

---

## 🔐 Autenticación y Roles

### Roles Disponibles
- **ADMIN** - Acceso total
- **DIRECCION** - Vista ejecutiva, todas las métricas
- **COMERCIAL** - CRM, oportunidades, cotizaciones
- **MARKETING** - Campañas, métricas, leads
- **ADMINISTRATIVO** - Contratos, facturación

### Endpoints de Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registro
- `POST /api/auth/profile` - Obtener perfil (requiere autenticación)

---

## 🔄 Flujos Principales

### 1. Lead → Oportunidad → Cotización → Contrato
```
Lead → Contacto → Oportunidad (Pipeline) → Cotización → 
Negocio Ganado → Contrato → Facturación
```

### 2. OKR → Actualización → Dashboard
```
Crear OKR → Asignar KRs → Actualizar progreso → 
Visualizar en dashboard por área/usuario
```

### 3. Campaña → Lead → Oportunidad
```
Crear Campaña → Generar Leads → Asignar Origen → 
Crear Oportunidad → Medir ROI
```

---

## 📈 Métricas Clave

### OKR
- Progreso por área (%)
- Progreso por persona
- OKRs en riesgo

### CRM
- Valor del pipeline por etapa
- Tasa de conversión
- Tiempo promedio en cada etapa
- Proyección mensual

### Marketing
- ROI por campaña
- Leads generados por canal
- Costo por lead
- Tasa de conversión lead → oportunidad

### Administración
- Contratos pendientes
- Facturación proyectada
- Tiempo promedio de cierre

---

## 🛠️ Desarrollo

### Comandos Backend
```bash
cd apps/api
npm run start:dev      # Desarrollo
npm run build          # Compilar
npm run start:prod     # Producción
npm run prisma:studio  # Abrir Prisma Studio
npm run prisma:migrate # Ejecutar migraciones
```

### Comandos Frontend
```bash
cd apps/web
npm run dev     # Desarrollo
npm run build   # Compilar
npm run start   # Producción
```

---

## 🔧 Configuración de Google Drive

1. Crear proyecto en Google Cloud Console
2. Habilitar Google Drive API
3. Crear Service Account
4. Descargar archivo JSON de credenciales
5. Colocar en `apps/api/google-service-account.json`
6. Configurar `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` en `.env`

---

## 📝 Próximos Pasos

- [ ] Implementar componentes UI completos (shadcn/ui)
- [ ] Agregar gráficos y visualizaciones (Recharts)
- [ ] Implementar envío de emails
- [ ] Agregar tests unitarios e integración
- [ ] Optimizar rendimiento
- [ ] Agregar documentación de API (Swagger)
- [ ] Implementar notificaciones en tiempo real
- [ ] Agregar exportación de reportes

---

## 📄 Licencia

Propietario - Reiki Solar

---

## 👥 Soporte

Para más información o soporte, consulta la documentación en los archivos `.md` del proyecto.



