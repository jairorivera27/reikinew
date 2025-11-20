# Arquitectura de la Plataforma Interna OKR/CRM

## 📋 Resumen Ejecutivo

Plataforma interna SaaS B2B para gestión integral de:
- **OKR** (Objetivos y Resultados Clave) por área y persona
- **CRM Comercial** con pipeline y customer journey
- **Marketing** con seguimiento de campañas y ROI
- **Administración** de contratos y facturación

**URL:** `reikisolar.com.co/OKR`

---

## 🏗️ Stack Tecnológico

### Frontend
- **Next.js 14+** (App Router) - Framework React con SSR/SSG
- **React 19** - Biblioteca UI
- **TypeScript** - Tipado estático
- **TailwindCSS** - Estilos utility-first
- **shadcn/ui** - Componentes UI modernos y accesibles
- **Recharts** - Gráficos y visualizaciones
- **React Hook Form + Zod** - Formularios y validación
- **TanStack Query (React Query)** - Gestión de estado del servidor

**Justificación:**
- Next.js App Router ofrece excelente rendimiento y SEO
- shadcn/ui proporciona componentes profesionales sin dependencias pesadas
- TypeScript garantiza type-safety end-to-end
- TailwindCSS permite desarrollo rápido y mantenible

### Backend
- **NestJS** - Framework Node.js con arquitectura modular
- **TypeScript** - Tipado estático
- **Prisma ORM** - ORM type-safe y moderno
- **PostgreSQL** - Base de datos relacional robusta
- **Passport.js + JWT** - Autenticación
- **Class Validator** - Validación de DTOs
- **Nodemailer** - Envío de emails
- **PDFKit / PDFMake** - Generación de PDFs
- **Docx** - Generación de documentos Word

**Justificación:**
- NestJS ofrece arquitectura modular escalable (similar a Angular)
- Prisma genera tipos TypeScript automáticamente desde el schema
- PostgreSQL es robusto para relaciones complejas y transacciones
- NestJS tiene excelente soporte para testing y documentación automática

### Integraciones
- **Google Drive API v3** - Gestión de documentos
- **Google OAuth 2.0** - Autenticación opcional
- **Service Account** - Para acceso programático a Drive

### Infraestructura
- **API REST** - Estándar, fácil de consumir y documentar
- **Swagger/OpenAPI** - Documentación automática de API

**Justificación REST vs GraphQL:**
- REST es más simple para equipos pequeños
- Mejor soporte de herramientas (Postman, Swagger)
- Caché HTTP más predecible
- GraphQL añade complejidad innecesaria para este caso

---

## 📐 Arquitectura de Módulos

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  OKR     │  │   CRM    │  │ Marketing│  │ Admin   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                    ┌─────▼─────┐
                    │   API     │
                    │  Gateway  │
                    └─────┬─────┘
                          │
┌─────────────────────────▼─────────────────────────────────┐
│              Backend (NestJS)                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │  Auth    │  │   OKR    │  │   CRM    │  │ Marketing│  │
│  │  Module  │  │  Module  │  │  Module  │  │  Module  │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Quote   │  │ Contract │  │  Google  │               │
│  │  Module  │  │  Module  │  │  Drive   │               │
│  └──────────┘  └──────────┘  │  Service │               │
│                               └──────────┘               │
└───────────────────────────────────────────────────────────┘
                          │
                    ┌─────▼─────┐
                    │ PostgreSQL │
                    └────────────┘
                          │
                    ┌─────▼─────┐
                    │Google Drive│
                    └────────────┘
```

---

## 🗄️ Schema de Base de Datos

### Entidades Principales

#### 1. **User & Auth**
- `User` - Usuarios del sistema
- `Role` - Roles (Admin, Comercial, Marketing, Administrativo, Dirección)
- `UserRole` - Relación muchos a muchos
- `Area` - Áreas de la empresa

#### 2. **OKR Module**
- `OKR` - Objetivos y Resultados Clave
- `KeyResult` - Resultados clave (KRs)
- `OKRUpdate` - Historial de actualizaciones

#### 3. **CRM Module**
- `Company` - Empresas/Clientes
- `Contact` - Contactos de empresas
- `Opportunity` - Oportunidades de venta
- `OpportunityStage` - Etapas del pipeline
- `Activity` - Actividades comerciales

#### 4. **Quote Module**
- `Quote` - Cotizaciones
- `QuoteItem` - Ítems de cotización
- `QuoteViewLog` - Tracking de visualizaciones

#### 5. **Contract Module**
- `Contract` - Contratos
- `AdminTask` - Tareas administrativas

#### 6. **Marketing Module**
- `Campaign` - Campañas de marketing
- `CampaignMetrics` - Métricas de campañas

#### 7. **Google Drive Integration**
- `GoogleDriveFile` - Referencias a archivos en Drive

---

## 📁 Estructura de Carpetas

```
REIKINEW/
├── apps/
│   ├── web/                    # Frontend Next.js
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── okr/
│   │   │   │   ├── crm/
│   │   │   │   ├── marketing/
│   │   │   │   ├── admin/
│   │   │   │   └── dashboard/
│   │   │   └── api/            # API Routes de Next.js (opcional)
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   ├── okr/
│   │   │   ├── crm/
│   │   │   ├── marketing/
│   │   │   └── admin/
│   │   ├── lib/
│   │   └── hooks/
│   └── api/                    # Backend NestJS
│       ├── src/
│       │   ├── auth/
│       │   ├── okr/
│       │   ├── crm/
│       │   ├── marketing/
│       │   ├── quote/
│       │   ├── contract/
│       │   ├── google-drive/
│       │   ├── common/
│       │   └── main.ts
│       └── prisma/
│           └── schema.prisma
├── packages/
│   └── shared/                 # Código compartido (tipos, utils)
│       └── src/
│           ├── types/
│           └── utils/
├── .env.example
├── package.json                # Monorepo root
└── README.md
```

---

## 🔐 Autenticación y Autorización

### Roles
1. **Admin** - Acceso total
2. **Dirección** - Vista ejecutiva, todas las métricas
3. **Comercial** - CRM, oportunidades, cotizaciones
4. **Marketing** - Campañas, métricas, leads
5. **Administrativo** - Contratos, facturación

### Permisos por Módulo
- **OKR**: Lectura todos, escritura según área asignada
- **CRM**: Lectura todos, escritura según responsable
- **Marketing**: Lectura todos, escritura Marketing
- **Contratos**: Lectura todos, escritura Administrativo

---

## 🚀 Plan de Implementación por Fases

### **Fase 1: Fundación (Semana 1)**
- ✅ Setup del proyecto (monorepo o estructura separada)
- ✅ Configuración de Prisma y schema inicial
- ✅ Autenticación básica (JWT)
- ✅ Estructura base de frontend y backend

### **Fase 2: Módulo OKR (Semana 2)**
- ✅ CRUD completo de OKR y KRs
- ✅ Dashboard de OKR por área y usuario
- ✅ Sistema de actualizaciones y historial

### **Fase 3: Módulo CRM Base (Semana 3)**
- ✅ CRUD de Companies, Contacts, Opportunities
- ✅ Pipeline Kanban
- ✅ Actividades comerciales

### **Fase 4: Cotizaciones (Semana 4)**
- ✅ Generación de cotizaciones desde oportunidades
- ✅ Generación de PDF
- ✅ Tracking de visualizaciones
- ✅ Integración Google Drive

### **Fase 5: Contratos y Administración (Semana 5)**
- ✅ Flujo de negocio ganado → contrato
- ✅ Generación de documentos
- ✅ Panel administrativo
- ✅ Tareas administrativas

### **Fase 6: Marketing (Semana 6)**
- ✅ CRUD de campañas
- ✅ Métricas y ROI
- ✅ Integración con CRM (origen de leads)

### **Fase 7: Dashboards y Métricas (Semana 7)**
- ✅ Dashboard ejecutivo
- ✅ Gráficos y visualizaciones
- ✅ Reportes

### **Fase 8: Pulido y Testing (Semana 8)**
- ✅ Testing de integración
- ✅ Optimizaciones
- ✅ Documentación
- ✅ Deploy

---

## 🔄 Flujos Principales

### Flujo 1: Lead → Oportunidad → Cotización → Contrato
```
Lead → Contacto → Oportunidad (Pipeline) → Cotización → 
Negocio Ganado → Contrato → Facturación
```

### Flujo 2: OKR → Actualización → Dashboard
```
Crear OKR → Asignar KRs → Actualizar progreso → 
Visualizar en dashboard por área/usuario
```

### Flujo 3: Campaña → Lead → Oportunidad
```
Crear Campaña → Generar Leads → Asignar Origen → 
Crear Oportunidad → Medir ROI
```

---

## 📊 Métricas Clave a Medir

1. **OKR**
   - Progreso por área (%)
   - Progreso por persona
   - OKRs en riesgo

2. **CRM**
   - Valor del pipeline por etapa
   - Tasa de conversión
   - Tiempo promedio en cada etapa
   - Proyección mensual

3. **Marketing**
   - ROI por campaña
   - Leads generados por canal
   - Costo por lead
   - Tasa de conversión lead → oportunidad

4. **Administración**
   - Contratos pendientes
   - Facturación proyectada
   - Tiempo promedio de cierre

---

## 🔧 Tecnologías Adicionales

- **Docker** (opcional) - Para desarrollo y deploy
- **GitHub Actions** - CI/CD
- **Sentry** - Monitoreo de errores
- **Vercel** (Frontend) / **Railway/Render** (Backend) - Hosting

---

## 📝 Próximos Pasos

1. Crear schema Prisma completo
2. Setup inicial del proyecto
3. Implementar autenticación
4. Desarrollar módulos en orden de prioridad



