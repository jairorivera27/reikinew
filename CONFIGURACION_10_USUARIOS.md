# Configuración para 10 Usuarios - Plataforma OKR/CRM

## 📋 Resumen

Esta guía contiene todas las configuraciones necesarias para que la plataforma funcione correctamente con un máximo de **10 usuarios concurrentes**.

---

## 🔐 1. Variables de Entorno - Backend (`apps/api/.env`)

```env
# ============================================
# BASE DE DATOS
# ============================================
# Para 10 usuarios, SQLite es suficiente, pero PostgreSQL es recomendado
DATABASE_URL="postgresql://usuario:password@localhost:5432/reiki_okr?schema=public"
# O si prefieres SQLite (más simple, menos recursos):
# DATABASE_URL="file:./prisma/dev.db"

# ============================================
# AUTENTICACIÓN JWT
# ============================================
# IMPORTANTE: Genera una clave secreta segura (mínimo 32 caracteres)
# Puedes generar una con: openssl rand -base64 32
JWT_SECRET="tu-clave-secreta-super-segura-minimo-32-caracteres-cambiar-en-produccion"
JWT_EXPIRES_IN="7d"  # Token válido por 7 días

# ============================================
# SERVIDOR
# ============================================
PORT=4000
NODE_ENV=production
FRONTEND_URL="https://reikisolar.com.co"

# ============================================
# CORS (Configuración de seguridad)
# ============================================
# Solo permitir acceso desde el dominio de producción
CORS_ORIGIN="https://reikisolar.com.co"

# ============================================
# GOOGLE DRIVE (Opcional - solo si usas integración)
# ============================================
GOOGLE_SERVICE_ACCOUNT_KEY_FILE="./google-service-account.json"

# ============================================
# OPTIMIZACIONES PARA 10 USUARIOS
# ============================================
# Pool de conexiones de base de datos (suficiente para 10 usuarios)
DB_POOL_SIZE=5
DB_POOL_TIMEOUT=10000

# Rate limiting (opcional, pero recomendado)
RATE_LIMIT_TTL=60  # Ventana de tiempo en segundos
RATE_LIMIT_MAX=100  # Máximo de requests por ventana
```

---

## 🌐 2. Variables de Entorno - Frontend (`apps/web/.env.production`)

```env
# ============================================
# API BACKEND
# ============================================
NEXT_PUBLIC_API_URL=https://reikisolar.com.co/api
NEXT_PUBLIC_BASE_PATH=/OKR

# ============================================
# ENTORNO
# ============================================
NODE_ENV=production

# ============================================
# OPTIMIZACIONES
# ============================================
# Desactivar telemetría de Next.js
NEXT_TELEMETRY_DISABLED=1
```

---

## 🗄️ 3. Configuración de Base de Datos

### Opción A: PostgreSQL (Recomendado)

**Ventajas:**
- Mejor rendimiento
- Soporte para transacciones complejas
- Escalabilidad futura
- Mejor para producción

**Configuración mínima:**
```sql
-- Crear base de datos
CREATE DATABASE reiki_okr;

-- Usuario con permisos
CREATE USER reiki_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE reiki_okr TO reiki_user;
```

**Configuración de Prisma:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Opción B: SQLite (Más simple)

**Ventajas:**
- No requiere servidor de base de datos
- Más fácil de configurar
- Suficiente para 10 usuarios

**Configuración:**
```env
DATABASE_URL="file:./prisma/dev.db"
```

**Nota:** Para producción con SQLite, asegúrate de tener backups regulares.

---

## ⚙️ 4. Configuración del Servidor (NestJS)

### Archivo: `apps/api/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Optimizaciones para 10 usuarios
    logger: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['log', 'error', 'warn', 'debug'],
  });

  // CORS - Solo permitir el dominio de producción
  app.enableCors({
    origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'https://reikisolar.com.co',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Prefijo global
  app.setGlobalPrefix('api');

  // Configuración de seguridad básica
  app.set('trust proxy', 1); // Si estás detrás de un proxy (Nginx/Apache)

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 API corriendo en http://localhost:${port}/api`);
  console.log(`👥 Configurado para máximo 10 usuarios concurrentes`);
}

bootstrap();
```

---

## 🚀 5. Configuración de Next.js

### Archivo: `apps/web/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/OKR';
const isProduction = process.env.NODE_ENV === 'production';

const nextConfig = {
  reactStrictMode: true,
  basePath: basePath,
  assetPrefix: basePath,
  
  // Para producción en servidor propio
  output: 'standalone',
  
  // Optimizaciones
  compress: true,
  poweredByHeader: false, // Ocultar header X-Powered-By por seguridad
  
  // Configuración de imágenes
  images: {
    unoptimized: false, // Habilitar optimización de imágenes
    domains: ['reikisolar.com.co'],
  },
  
  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## 🔒 6. Configuración de Seguridad

### 6.1. JWT Secret

**Generar una clave segura:**
```bash
# En Linux/Mac
openssl rand -base64 32

# En Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Usar en `.env`:**
```env
JWT_SECRET="la_clave_generada_aqui"
```

### 6.2. Contraseñas de Usuarios

**Requisitos mínimos:**
- Mínimo 8 caracteres
- Al menos 1 mayúscula
- Al menos 1 número
- Al menos 1 carácter especial

**Recomendación:** Usar un gestor de contraseñas para generar contraseñas seguras.

---

## 📊 7. Configuración de Prisma (Base de Datos)

### Archivo: `apps/api/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  // Optimizaciones para producción
  previewFeatures = []
}

datasource db {
  provider = "postgresql"  // o "sqlite"
  url      = env("DATABASE_URL")
  // Pool de conexiones optimizado para 10 usuarios
  relationMode = "prisma"
}

// ... resto del schema
```

### Configuración del Cliente Prisma

**Archivo: `apps/api/src/prisma/prisma.service.ts`**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'production' 
        ? ['error', 'warn'] 
        : ['query', 'error', 'warn', 'info'],
      // Optimizaciones para 10 usuarios
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

---

## 🌐 8. Configuración del Servidor Web (Nginx)

### Configuración para `/OKR` y `/api`

```nginx
# Frontend Next.js en /OKR
location /OKR {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # Timeouts optimizados para 10 usuarios
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}

# Backend API en /api
location /api {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # Buffer sizes (suficiente para 10 usuarios)
    proxy_buffering on;
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;
}

# Headers de seguridad
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

---

## 🔄 9. Gestión de Procesos (PM2)

### Configuración: `ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'reiki-api',
      script: './apps/api/dist/main.js',
      instances: 1, // 1 instancia es suficiente para 10 usuarios
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M', // Reiniciar si usa más de 500MB
    },
    {
      name: 'reiki-web',
      script: './apps/web/.next/standalone/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
    },
  ],
};
```

**Comandos PM2:**
```bash
# Iniciar aplicaciones
pm2 start ecosystem.config.js

# Ver estado
pm2 status

# Ver logs
pm2 logs

# Reiniciar
pm2 restart all

# Detener
pm2 stop all

# Guardar configuración para auto-inicio
pm2 save
pm2 startup
```

---

## 💾 10. Backup de Base de Datos

### Script de Backup: `backup-db.sh`

```bash
#!/bin/bash
# Backup diario de la base de datos

BACKUP_DIR="/backups/reiki-okr"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="reiki_okr"

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
pg_dump -U reiki_user -d $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Comprimir
gzip $BACKUP_DIR/backup_$DATE.sql

# Mantener solo los últimos 7 días
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completado: backup_$DATE.sql.gz"
```

**Para SQLite:**
```bash
#!/bin/bash
BACKUP_DIR="/backups/reiki-okr"
DATE=$(date +%Y%m%d_%H%M%S)
DB_FILE="./apps/api/prisma/dev.db"

mkdir -p $BACKUP_DIR
cp $DB_FILE $BACKUP_DIR/backup_$DATE.db

# Comprimir
gzip $BACKUP_DIR/backup_$DATE.db

# Mantener solo los últimos 7 días
find $BACKUP_DIR -name "backup_*.db.gz" -mtime +7 -delete
```

**Programar con cron:**
```bash
# Editar crontab
crontab -e

# Agregar línea para backup diario a las 2 AM
0 2 * * * /ruta/al/script/backup-db.sh
```

---

## 📈 11. Monitoreo Básico

### Health Check Endpoint

**Agregar en `apps/api/src/app.controller.ts`:**

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
```

**Verificar salud:**
```bash
curl https://reikisolar.com.co/api/health
```

---

## ✅ 12. Checklist de Configuración

### Antes de Producción:

- [ ] Variables de entorno configuradas correctamente
- [ ] JWT_SECRET generado y seguro (mínimo 32 caracteres)
- [ ] Base de datos creada y migraciones aplicadas
- [ ] Usuarios iniciales creados (seed ejecutado)
- [ ] Servidor web (Nginx/Apache) configurado
- [ ] SSL/HTTPS configurado
- [ ] PM2 configurado y aplicaciones iniciadas
- [ ] Backups programados
- [ ] Health check funcionando
- [ ] CORS configurado correctamente
- [ ] Headers de seguridad configurados
- [ ] Logs configurados
- [ ] Firewall configurado (solo puertos necesarios)

---

## 🎯 13. Recursos del Servidor Recomendados

Para 10 usuarios concurrentes:

**Mínimo:**
- CPU: 1 core
- RAM: 1 GB
- Disco: 10 GB

**Recomendado:**
- CPU: 2 cores
- RAM: 2 GB
- Disco: 20 GB

**Con estas especificaciones, la plataforma funcionará sin problemas para 10 usuarios.**

---

## 🔧 14. Comandos de Despliegue

```bash
# 1. Instalar dependencias
cd apps/api && npm ci
cd ../web && npm ci

# 2. Generar Prisma Client
cd ../api && npm run prisma:generate

# 3. Aplicar migraciones
npm run prisma:migrate

# 4. Poblar datos iniciales
npm run prisma:seed

# 5. Build de producción
npm run build
cd ../web && npm run build

# 6. Iniciar con PM2
pm2 start ecosystem.config.js

# 7. Verificar
pm2 status
curl http://localhost:4000/api/health
```

---

## 📞 15. Soporte y Mantenimiento

### Logs importantes:
- Backend: `./logs/api-error.log` y `./logs/api-out.log`
- Frontend: `./logs/web-error.log` y `./logs/web-out.log`
- Nginx: `/var/log/nginx/error.log`

### Comandos útiles:
```bash
# Ver logs en tiempo real
pm2 logs

# Reiniciar servicios
pm2 restart all

# Ver uso de recursos
pm2 monit

# Verificar conexión a base de datos
cd apps/api && npx prisma studio
```

---

## 🎉 Conclusión

Con estas configuraciones, la plataforma estará optimizada para **10 usuarios concurrentes** con:
- ✅ Seguridad básica implementada
- ✅ Rendimiento optimizado
- ✅ Backups automáticos
- ✅ Monitoreo básico
- ✅ Gestión de procesos con PM2

**La plataforma estará lista para producción.**

