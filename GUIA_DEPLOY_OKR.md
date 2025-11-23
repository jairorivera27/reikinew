# 📘 Guía Completa: Desplegar OKR en reikisolar.com.co/okr

## 🎯 Objetivo

Configurar la plataforma Next.js OKR/CRM para que funcione en `reikisolar.com.co/okr` usando Vercel.

## ✅ Cambios Realizados en el Código

He actualizado todos los archivos para usar `/okr` (minúsculas) en lugar de `/OKR`:

1. ✅ `apps/web/next.config.js` - basePath cambiado a `/okr`
2. ✅ `apps/web/middleware.ts` - basePath cambiado a `/okr`
3. ✅ `apps/web/lib/base-path.ts` - valores por defecto cambiados a `/okr`
4. ✅ `apps/web/lib/api.ts` - basePath cambiado a `/okr`
5. ✅ `apps/web/components/layout/dashboard-layout.tsx` - basePath cambiado a `/okr`
6. ✅ `apps/web/components/layout/sidebar.tsx` - basePath cambiado a `/okr`
7. ✅ `apps/web/vercel.json` - Configuración para Next.js en Vercel

## 🚀 Pasos para Configurar en Vercel

### Paso 1: Crear Proyecto Vercel para Next.js

1. **Ve a**: https://vercel.com/new
2. **Importa el repositorio**: `https://github.com/jairorivera27/reikinew`
3. **Configura el proyecto**:
   ```
   Project Name: reikinew-okr (o el nombre que prefieras)
   Root Directory: apps/web ⚠️ IMPORTANTE
   Framework Preset: Next.js (Vercel lo detecta automáticamente)
   Build Command: (déjalo en blanco)
   Output Directory: (déjalo en blanco)
   Install Command: npm install
   ```

4. **Variables de Entorno** (Settings → Environment Variables):
   ```
   NEXT_PUBLIC_BASE_PATH=/okr
   NEXT_PUBLIC_API_URL=https://reikisolar.com.co
   NODE_ENV=production
   ```

5. **Domains** (Settings → Domains):
   - Agrega: `reikisolar.com.co`
   - Esto conectará el proyecto Next.js al mismo dominio que Astro

### Paso 2: Verificar que Ambos Proyectos Están en el Mismo Dominio

- **Proyecto Astro**: `reikinew` → `reikisolar.com.co` (raíz)
- **Proyecto Next.js**: `reikinew-okr` → `reikisolar.com.co` (con basePath `/okr`)

Vercel debería manejar automáticamente el routing si ambos proyectos están conectados al mismo dominio.

### Paso 3: (Opcional) Configurar Rewrites en el Proyecto Principal

Si Vercel no enruta automáticamente, puedes agregar rewrites en `vercel.json` de la raíz:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": null,
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [
    {
      "source": "/okr/:path*",
      "destination": "https://reikinew-okr.vercel.app/okr/:path*"
    }
  ]
}
```

**Nota**: Reemplaza `reikinew-okr.vercel.app` con la URL real del proyecto Next.js.

## 🧪 Pruebas Locales

Para probar localmente con el nuevo path:

```bash
cd apps/web

# Crear/actualizar .env.local
echo "NEXT_PUBLIC_BASE_PATH=/okr" > .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" >> .env.local

# Iniciar servidor
npm run dev
```

Luego accede a: `http://localhost:3000/okr`

## ✅ Verificación

Después de configurar en Vercel:

1. ✅ La plataforma carga en `reikisolar.com.co/okr`
2. ✅ Las rutas funcionan: `/okr/login`, `/okr/dashboard`, etc.
3. ✅ Los assets se cargan desde `/okr/_next/...`
4. ✅ La API responde correctamente

## 🔗 URLs Esperadas

- **Login**: `reikisolar.com.co/okr/login`
- **Dashboard**: `reikisolar.com.co/okr/dashboard`
- **OKR**: `reikisolar.com.co/okr/okr`
- **CRM**: `reikisolar.com.co/okr/crm`
- **Marketing**: `reikisolar.com.co/okr/marketing`
- **Admin**: `reikisolar.com.co/okr/admin`

## 📝 Resumen de Configuración

### Proyecto 1: Astro (Raíz)
- **URL Vercel**: `reikinew.vercel.app`
- **Dominio**: `reikisolar.com.co` (raíz)
- **Root Directory**: `.` (raíz)
- **Output**: `dist/`

### Proyecto 2: Next.js OKR/CRM
- **URL Vercel**: `reikinew-okr.vercel.app` (o el nombre que elijas)
- **Dominio**: `reikisolar.com.co` (con basePath `/okr`)
- **Root Directory**: `apps/web`
- **Output**: `.next/`
- **Variables de Entorno**: `NEXT_PUBLIC_BASE_PATH=/okr`

## 🐛 Solución de Problemas

### Error: "404 en /okr"

**Causa**: El proyecto Next.js no está configurado o no está conectado al dominio.

**Solución**:
1. Verifica que el proyecto Next.js esté creado en Vercel
2. Verifica que ambos proyectos estén conectados a `reikisolar.com.co`
3. Verifica que `NEXT_PUBLIC_BASE_PATH=/okr` esté configurado

### Error: "Assets no cargan"

**Causa**: El `basePath` no está configurado correctamente.

**Solución**:
1. Verifica que `NEXT_PUBLIC_BASE_PATH=/okr` esté en las variables de entorno
2. Reconstruye el proyecto Next.js en Vercel

### Error: "API no responde"

**Causa**: La API no está configurada o no está accesible.

**Solución**:
1. Verifica que `NEXT_PUBLIC_API_URL=https://reikisolar.com.co` esté configurado
2. Verifica que el backend esté corriendo y accesible

