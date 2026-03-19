# 🎯 Resumen: Qué se Necesita para que la Plataforma Funcione

## ✅ Pasos Rápidos (5 minutos)

### 1. Crear archivo de configuración del backend
Crea el archivo `apps/api/.env` con este contenido:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="reiki-solar-secret-key-change-in-production-2024"
JWT_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="http://localhost:3000"
```

### 2. Configurar la base de datos
```powershell
cd apps\api
npm run prisma:generate
npx prisma db push
npm run prisma:seed
```

### 3. Iniciar los servicios
```powershell
# Desde la raíz del proyecto
.\INICIAR_TODO.ps1
```

O manualmente:
- **Terminal 1:** `cd apps\api && npm run start:dev`
- **Terminal 2:** `cd apps\web && npm run dev`

### 4. Acceder a la plataforma
- **URL:** http://localhost:3000/login
- **Email:** `admin@reikisolar.com.co`
- **Contraseña:** `admin123`

---

## 📋 Checklist Completo

### ✅ Requisitos Previos
- [ ] Node.js instalado (v18 o superior)
- [ ] npm instalado
- [ ] Puertos 3000 y 4000 disponibles

### ✅ Configuración del Backend
- [ ] Archivo `apps/api/.env` creado
- [ ] Dependencias instaladas (`npm install` en `apps/api`)
- [ ] Prisma Client generado (`npm run prisma:generate`)
- [ ] Base de datos creada (`npx prisma db push`)
- [ ] Datos iniciales poblados (`npm run prisma:seed`)

### ✅ Configuración del Frontend
- [ ] Dependencias instaladas (`npm install` en `apps/web`)
- [ ] (Opcional) Archivo `apps/web/.env.local` creado

### ✅ Servicios Corriendo
- [ ] Backend corriendo en http://localhost:4000
- [ ] Frontend corriendo en http://localhost:3000

---

## 🔍 Verificación Rápida

### ¿El backend está corriendo?
Abre en tu navegador: http://localhost:4000/api
- Si ves una respuesta (aunque sea un 404), el backend está corriendo ✅
- Si no carga, el backend no está corriendo ❌

### ¿El frontend está corriendo?
Abre en tu navegador: http://localhost:3000
- Si ves la página, el frontend está corriendo ✅
- Si no carga, el frontend no está corriendo ❌

### ¿Puedes hacer login?
- Si ves "Error al iniciar sesión", verifica:
  1. El backend está corriendo
  2. La base de datos tiene usuarios (ejecuta `npm run prisma:seed`)
  3. Las credenciales son correctas

---

## 🚨 Problemas Comunes

### "Error al iniciar sesión"
**Causa:** Backend no está corriendo o base de datos sin usuarios
**Solución:**
1. Verifica que el backend esté corriendo (http://localhost:4000/api)
2. Ejecuta: `cd apps\api && npm run prisma:seed`

### "Cannot find module '@prisma/client'"
**Causa:** Prisma Client no generado
**Solución:** `cd apps\api && npm run prisma:generate`

### "Database is locked"
**Causa:** Base de datos en uso
**Solución:** Cierra todas las conexiones y ejecuta `npx prisma db push` de nuevo

### "Port 4000 already in use"
**Causa:** Otro proceso usando el puerto
**Solución:** Cierra el proceso o cambia el puerto en `.env`

---

## 📚 Documentación Completa

Para más detalles, consulta:
- `REQUISITOS_PLATAFORMA.md` - Guía completa de requisitos
- `INSTALACION_PLATAFORMA_OKR.md` - Guía de instalación detallada

---

## 🎯 Orden de Ejecución Recomendado

1. **Primera vez:**
   ```powershell
   .\INICIAR_COMPLETO.ps1  # Configura todo
   .\INICIAR_TODO.ps1      # Inicia los servicios
   ```

2. **Siguientes veces:**
   ```powershell
   .\INICIAR_TODO.ps1      # Solo inicia los servicios
   ```

---

## 📞 Soporte

Si sigues teniendo problemas:
1. Revisa los logs en las ventanas de PowerShell
2. Verifica que todos los archivos `.env` estén creados
3. Asegúrate de que Node.js esté instalado y en el PATH
4. Verifica que los puertos 3000 y 4000 estén libres


