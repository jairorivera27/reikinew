# Guía de Instalación - Plataforma OKR/CRM

## Requisitos Previos

- Node.js 18+ y npm
- PostgreSQL 14+
- Cuenta de Google Cloud con Google Drive API habilitada
- Service Account de Google Cloud con permisos de Drive

## Instalación Paso a Paso

### 1. Clonar y Configurar el Proyecto

```bash
# Ya estás en el directorio del proyecto
cd REIKINEW
```

### 2. Configurar Base de Datos PostgreSQL

```bash
# Crear base de datos
createdb reiki_okr

# O usando psql
psql -U postgres
CREATE DATABASE reiki_okr;
\q
```

### 3. Configurar Backend (API)

```bash
cd apps/api

# Instalar dependencias
npm install

# Copiar archivo de entorno
cp .env.example .env

# Editar .env con tus credenciales:
# - DATABASE_URL: URL de conexión a PostgreSQL
# - JWT_SECRET: Clave secreta para JWT (generar una aleatoria)
# - GOOGLE_SERVICE_ACCOUNT_KEY_FILE: Ruta al archivo JSON de Service Account
```

**Ejemplo de .env:**
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/reiki_okr?schema=public"
JWT_SECRET="tu-clave-secreta-super-segura-aqui"
JWT_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="http://localhost:3000"
GOOGLE_SERVICE_ACCOUNT_KEY_FILE="./google-service-account.json"
```

### 4. Configurar Google Drive API

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google Drive
4. Crea una Service Account:
   - Ve a "IAM & Admin" > "Service Accounts"
   - Crea una nueva Service Account
   - Descarga el archivo JSON de credenciales
   - Colócalo en `apps/api/google-service-account.json`
5. Comparte las carpetas de Drive con el email de la Service Account (si es necesario)

### 5. Ejecutar Migraciones de Base de Datos

```bash
cd apps/api

# Generar cliente de Prisma
npm run prisma:generate

# Crear migraciones
npm run prisma:migrate

# (Opcional) Abrir Prisma Studio para ver la base de datos
npm run prisma:studio
```

### 6. Iniciar Backend

```bash
cd apps/api
npm run start:dev
```

El backend estará disponible en `http://localhost:4000/api`

### 7. Configurar Frontend (Web)

```bash
cd apps/web

# Instalar dependencias
npm install

# Crear archivo .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
```

### 8. Iniciar Frontend

```bash
cd apps/web
npm run dev
```

El frontend estará disponible en `http://localhost:3000`

### 9. Acceder a la Plataforma

1. Abre `http://localhost:3000` en tu navegador
2. Serás redirigido a `/login`
3. Para crear el primer usuario, puedes usar el endpoint de registro o crear uno directamente en la base de datos

### 10. Crear Usuario Inicial

**Opción A: Usando el endpoint de registro**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@reikisolar.com.co",
    "password": "password123",
    "name": "Administrador",
    "roleIds": []
  }'
```

**Opción B: Crear roles primero y luego usuario**

1. Abre Prisma Studio: `cd apps/api && npm run prisma:studio`
2. Crea roles en la tabla `Role`:
   - ADMIN
   - DIRECCION
   - COMERCIAL
   - MARKETING
   - ADMINISTRATIVO
3. Crea un usuario en la tabla `User`
4. Crea una relación en `UserRole` entre el usuario y el rol ADMIN

## Estructura de URLs

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000/api`
- Prisma Studio: Se abre automáticamente al ejecutar `npm run prisma:studio`

## Comandos Útiles

### Backend
```bash
cd apps/api
npm run start:dev      # Desarrollo
npm run build          # Compilar
npm run start:prod     # Producción
npm run prisma:studio  # Abrir Prisma Studio
npm run prisma:migrate # Ejecutar migraciones
```

### Frontend
```bash
cd apps/web
npm run dev     # Desarrollo
npm run build   # Compilar
npm run start   # Producción
```

## Solución de Problemas

### Error de conexión a la base de datos
- Verifica que PostgreSQL esté corriendo
- Verifica la URL en `.env`
- Verifica que la base de datos exista

### Error de Google Drive API
- Verifica que el archivo JSON de Service Account esté en la ruta correcta
- Verifica que la API de Drive esté habilitada
- Verifica los permisos de la Service Account

### Error de CORS
- Verifica que `FRONTEND_URL` en `.env` del backend coincida con la URL del frontend

## Próximos Pasos

1. Crear usuarios y roles
2. Configurar áreas y OKRs iniciales
3. Importar datos de clientes y oportunidades
4. Configurar integraciones adicionales

## Soporte

Para más información, consulta:
- `ARQUITECTURA_OKR_PLATFORM.md` - Documentación de arquitectura
- `apps/api/README.md` - Documentación del backend
- `prisma/schema.prisma` - Schema de base de datos



