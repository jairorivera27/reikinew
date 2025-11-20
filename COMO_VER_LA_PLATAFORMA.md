# 🚀 CÓMO VER LA PLATAFORMA OKR/CRM

## Pasos Rápidos para Ejecutar

### 1️⃣ Instalar Dependencias del Backend

Abre PowerShell o Terminal en la carpeta del proyecto y ejecuta:

```powershell
cd apps\api
npm install
```

### 2️⃣ Instalar Dependencias del Frontend

En otra ventana de PowerShell o Terminal:

```powershell
cd apps\web
npm install
```

### 3️⃣ Configurar Base de Datos

**IMPORTANTE:** Necesitas tener PostgreSQL instalado y corriendo.

1. Crea una base de datos:
```sql
CREATE DATABASE reiki_okr;
```

2. Crea el archivo `.env` en `apps/api/`:
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/reiki_okr?schema=public"
JWT_SECRET="tu-clave-secreta-super-segura-aqui"
JWT_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="http://localhost:3000"
```

3. Genera el cliente de Prisma y ejecuta migraciones:
```powershell
cd apps\api
npm run prisma:generate
npm run prisma:migrate
```

### 4️⃣ Iniciar el Backend

En una ventana de PowerShell:

```powershell
cd apps\api
npm run start:dev
```

El backend estará en: **http://localhost:4000/api**

### 5️⃣ Iniciar el Frontend

En OTRA ventana de PowerShell:

```powershell
cd apps\web
npm run dev
```

El frontend estará en: **http://localhost:3000**

### 6️⃣ Acceder a la Plataforma

1. Abre tu navegador
2. Ve a: **http://localhost:3000**
3. Serás redirigido a `/login`
4. Para crear tu primer usuario, puedes:
   - Usar el endpoint de registro (ver abajo)
   - O crear uno directamente en la base de datos

### 7️⃣ Crear Usuario Inicial

**Opción A: Usando el endpoint de registro**

Abre otra terminal y ejecuta:

```powershell
curl -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"admin@reikisolar.com.co\",\"password\":\"password123\",\"name\":\"Administrador\"}"
```

**Opción B: Usando Prisma Studio**

```powershell
cd apps\api
npm run prisma:studio
```

Esto abrirá una interfaz web donde puedes:
1. Crear roles en la tabla `Role`
2. Crear un usuario en la tabla `User`
3. Asignar el rol al usuario en `UserRole`

---

## 📍 URLs Importantes

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000/api
- **Prisma Studio:** Se abre automáticamente al ejecutar `npm run prisma:studio`

---

## ⚠️ Requisitos Previos

1. **Node.js 18+** instalado
2. **PostgreSQL 14+** instalado y corriendo
3. **npm** (viene con Node.js)

---

## 🔧 Solución de Problemas

### Error: "No se puede conectar a la base de datos"
- Verifica que PostgreSQL esté corriendo
- Verifica la URL en el archivo `.env`
- Verifica que la base de datos `reiki_okr` exista

### Error: "Module not found"
- Ejecuta `npm install` en ambas carpetas (`apps/api` y `apps/web`)

### Error: "Port already in use"
- Cambia el puerto en el archivo `.env` del backend
- O cierra la aplicación que está usando el puerto

---

## 📝 Notas Importantes

- **Google Drive:** La integración con Google Drive requiere configuración adicional (ver `INSTALACION_PLATAFORMA_OKR.md`)
- **Primera vez:** La primera vez que ejecutas las migraciones, se crearán todas las tablas automáticamente
- **Datos de prueba:** Puedes crear datos de prueba usando Prisma Studio o directamente desde la interfaz

---

## 🎯 Una vez que esté corriendo:

1. Ve a http://localhost:3000
2. Inicia sesión con tu usuario
3. Explora los módulos:
   - **Dashboard** - Vista general
   - **OKR** - Objetivos y Resultados Clave
   - **CRM** - Pipeline y oportunidades
   - **Marketing** - Campañas
   - **Administración** - Contratos

¡Listo! 🎉



