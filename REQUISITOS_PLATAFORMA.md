# 📋 Requisitos para que la Plataforma OKR/CRM Funcione Correctamente

## ✅ Checklist de Requisitos

### 1. **Variables de Entorno del Backend** (`apps/api/.env`)

Crea el archivo `apps/api/.env` con las siguientes variables:

```env
# Base de datos
DATABASE_URL="file:./prisma/dev.db"

# JWT (Autenticación)
JWT_SECRET="tu-clave-secreta-super-segura-cambiar-en-produccion"
JWT_EXPIRES_IN="7d"

# Servidor
PORT=4000
FRONTEND_URL="http://localhost:3000"

# Google Drive (Opcional - solo si usas integración con Drive)
GOOGLE_SERVICE_ACCOUNT_KEY_FILE="./path/to/service-account-key.json"
```

**⚠️ IMPORTANTE:** 
- El archivo `.env` debe estar en `apps/api/.env`
- `JWT_SECRET` debe ser una cadena larga y aleatoria en producción
- `DATABASE_URL` apunta a SQLite local (temporalmente)

### 2. **Variables de Entorno del Frontend** (`apps/web/.env.local`)

Crea el archivo `apps/web/.env.local` con:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_BASE_PATH=/OKR
```

**Nota:** En desarrollo local, puedes usar `NEXT_PUBLIC_BASE_PATH=""` para evitar el prefijo `/OKR`.

### 3. **Base de Datos**

#### 3.1. Instalar dependencias de Prisma
```bash
cd apps/api
npm install
```

#### 3.2. Generar el cliente de Prisma
```bash
npm run prisma:generate
```

#### 3.3. Aplicar el esquema a la base de datos
```bash
npm run prisma:migrate
# O si prefieres aplicar directamente sin migraciones:
npx prisma db push
```

#### 3.4. Poblar datos iniciales (seed)
```bash
npm run prisma:seed
```

Esto creará:
- ✅ Roles: ADMIN, DIRECCION, COMERCIAL, MARKETING, ADMINISTRATIVO
- ✅ Usuario administrador:
  - **Email:** `admin@reikisolar.com.co`
  - **Contraseña:** `admin123`

### 4. **Dependencias del Backend**

Asegúrate de que todas las dependencias estén instaladas:

```bash
cd apps/api
npm install
```

**Dependencias críticas:**
- `@nestjs/core`, `@nestjs/common` - Framework NestJS
- `@prisma/client` - Cliente de Prisma
- `bcrypt` - Hash de contraseñas
- `@nestjs/jwt`, `passport-jwt` - Autenticación JWT
- `passport-local` - Autenticación local
- `class-validator`, `class-transformer` - Validación de DTOs

### 5. **Dependencias del Frontend**

```bash
cd apps/web
npm install
```

**Dependencias críticas:**
- `next`, `react`, `react-dom` - Framework Next.js
- `axios` - Cliente HTTP
- `tailwindcss` - Estilos
- `@tanstack/react-query` - Gestión de estado del servidor

### 6. **Puertos Disponibles**

Asegúrate de que estos puertos estén libres:
- **Backend:** `4000` (http://localhost:4000)
- **Frontend:** `3000` (http://localhost:3000)

### 7. **Iniciar los Servicios**

#### Opción A: Script Automático (Recomendado)
```powershell
.\INICIAR_TODO.ps1
```

#### Opción B: Manual

**Terminal 1 - Backend:**
```bash
cd apps/api
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd apps/web
npm run dev
```

### 8. **Verificar que Todo Funciona**

#### 8.1. Backend
- Abre: http://localhost:4000/api
- Deberías ver una respuesta (puede ser un 404, pero significa que el servidor está corriendo)

#### 8.2. Frontend
- Abre: http://localhost:3000/login
- Deberías ver la página de login

#### 8.3. Login
- **Email:** `admin@reikisolar.com.co`
- **Contraseña:** `admin123`

### 9. **Problemas Comunes y Soluciones**

#### ❌ Error: "Cannot find module '@prisma/client'"
**Solución:**
```bash
cd apps/api
npm install
npm run prisma:generate
```

#### ❌ Error: "Database is locked"
**Solución:**
- Cierra todas las conexiones a la base de datos
- Elimina `apps/api/prisma/dev.db` y `apps/api/prisma/dev.db-journal`
- Ejecuta: `npx prisma db push`
- Ejecuta: `npm run prisma:seed`

#### ❌ Error: "Error al iniciar sesión"
**Causas posibles:**
1. Backend no está corriendo → Inicia el backend
2. Base de datos no tiene usuarios → Ejecuta `npm run prisma:seed`
3. Variables de entorno incorrectas → Verifica `apps/api/.env`
4. Puerto incorrecto → Verifica que el backend esté en el puerto 4000

#### ❌ Error: "CORS policy"
**Solución:**
- Verifica que `FRONTEND_URL` en `apps/api/.env` sea `http://localhost:3000`
- Reinicia el backend

#### ❌ Error: "JWT_SECRET is not defined"
**Solución:**
- Crea `apps/api/.env` con `JWT_SECRET="tu-clave-secreta"`

### 10. **Integración con Google Drive (Opcional)**

Si quieres usar la integración con Google Drive:

1. **Crear Service Account en Google Cloud:**
   - Ve a [Google Cloud Console](https://console.cloud.google.com/)
   - Crea un proyecto o selecciona uno existente
   - Habilita la API de Google Drive
   - Crea una Service Account
   - Descarga el archivo JSON de credenciales

2. **Configurar en el backend:**
   - Coloca el archivo JSON en `apps/api/` (o la ruta que prefieras)
   - Actualiza `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` en `.env`

3. **Compartir carpeta en Drive:**
   - Crea una carpeta en Google Drive
   - Compártela con el email de la Service Account (ej: `tu-service-account@proyecto.iam.gserviceaccount.com`)
   - Dale permisos de "Editor"

### 11. **Estructura de Archivos Esperada**

```
REIKINEW/
├── apps/
│   ├── api/
│   │   ├── .env                    ← CREAR ESTE ARCHIVO
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── dev.db              ← Se crea automáticamente
│   │   │   └── seed.ts
│   │   ├── src/
│   │   └── package.json
│   └── web/
│       ├── .env.local              ← CREAR ESTE ARCHIVO (opcional)
│       ├── app/
│       └── package.json
└── INICIAR_TODO.ps1
```

### 12. **Orden de Ejecución Recomendado**

1. ✅ Crear archivos `.env` (backend y frontend)
2. ✅ Instalar dependencias: `npm install` en ambos proyectos
3. ✅ Generar Prisma Client: `cd apps/api && npm run prisma:generate`
4. ✅ Aplicar esquema: `npx prisma db push`
5. ✅ Poblar datos: `npm run prisma:seed`
6. ✅ Iniciar backend: `npm run start:dev`
7. ✅ Iniciar frontend: `cd apps/web && npm run dev`
8. ✅ Abrir navegador: http://localhost:3000/login

---

## 🚀 Script Rápido de Inicio

Crea un archivo `INICIAR_COMPLETO.ps1` en la raíz del proyecto:

```powershell
# Verificar y crear .env del backend si no existe
if (-not (Test-Path "apps\api\.env")) {
    @"
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="reiki-solar-secret-key-change-in-production-$(Get-Random)"
JWT_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="http://localhost:3000"
"@ | Out-File -FilePath "apps\api\.env" -Encoding UTF8
    Write-Host "✅ Archivo .env del backend creado" -ForegroundColor Green
}

# Instalar dependencias
Write-Host "📦 Instalando dependencias del backend..." -ForegroundColor Cyan
cd apps\api
npm install
npm run prisma:generate
npx prisma db push
npm run prisma:seed

Write-Host "📦 Instalando dependencias del frontend..." -ForegroundColor Cyan
cd ..\web
npm install

Write-Host "✅ Todo listo! Ejecuta .\INICIAR_TODO.ps1 para iniciar los servicios" -ForegroundColor Green
```

---

## 📞 Credenciales por Defecto

- **Email:** `admin@reikisolar.com.co`
- **Contraseña:** `admin123`
- **Rol:** ADMIN (acceso total)

**⚠️ IMPORTANTE:** Cambia estas credenciales en producción.


