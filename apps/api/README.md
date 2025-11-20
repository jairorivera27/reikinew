# API Backend - Plataforma OKR/CRM

Backend desarrollado con NestJS, Prisma y PostgreSQL.

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

3. Configurar base de datos:
```bash
# Generar cliente de Prisma
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:migrate

# (Opcional) Abrir Prisma Studio
npm run prisma:studio
```

4. Iniciar servidor de desarrollo:
```bash
npm run start:dev
```

La API estará disponible en `http://localhost:4000/api`

## Estructura

- `src/auth/` - Autenticación y autorización
- `src/users/` - Gestión de usuarios
- `src/okr/` - Módulo de OKR
- `src/crm/` - Módulo CRM (Companies, Contacts, Opportunities, Activities)
- `src/quote/` - Módulo de cotizaciones
- `src/contract/` - Módulo de contratos
- `src/marketing/` - Módulo de marketing
- `src/google-drive/` - Integración con Google Drive
- `src/prisma/` - Servicio de Prisma

## Endpoints principales

- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registro
- `GET /api/okr` - Listar OKRs
- `GET /api/opportunities` - Listar oportunidades
- `GET /api/quotes` - Listar cotizaciones
- `GET /api/contracts` - Listar contratos
- `GET /api/marketing/campaigns` - Listar campañas



