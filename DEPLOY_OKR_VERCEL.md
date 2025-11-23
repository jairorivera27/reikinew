# 🚀 Despliegue de OKR en reikisolar.com.co/okr con Vercel

## 📋 Resumen

Para que la plataforma OKR funcione en `reikisolar.com.co/okr`, necesitas crear un **proyecto Vercel separado** para Next.js y configurar rewrites en el proyecto principal.

## 🎯 Pasos para Configurar

### 1. Crear Proyecto Vercel para Next.js OKR

1. **Ve a Vercel**: https://vercel.com/new
2. **Importa el repositorio**: `https://github.com/jairorivera27/reikinew`
3. **Configura el proyecto**:
   - **Project Name**: `reikinew-okr` (o el nombre que prefieras)
   - **Root Directory**: `apps/web` ⚠️ **IMPORTANTE**
   - **Framework Preset**: `Next.js` (Vercel lo detecta automáticamente)
   - **Build Command**: (déjalo en blanco, Vercel lo detecta)
   - **Output Directory**: (déjalo en blanco, Vercel lo detecta)
   - **Install Command**: `npm install`

4. **Variables de Entorno** (Settings → Environment Variables):
   ```
   NEXT_PUBLIC_BASE_PATH=/okr
   NEXT_PUBLIC_API_URL=https://reikisolar.com.co
   NODE_ENV=production
   ```

5. **Domains**:
   - Agrega: `reikisolar.com.co`
   - Esto conectará el proyecto Next.js al mismo dominio

### 2. Configurar Rewrites en el Proyecto Principal (Astro)

**IMPORTANTE**: El proyecto principal de Astro ya tiene `vercel.json`. Necesitas agregar rewrites para enrutar `/okr` al proyecto Next.js.

**Opción A: Rewrites a otro proyecto Vercel** (Recomendado)

Actualiza `vercel.json` en la raíz:

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

**Nota**: Reemplaza `reikinew-okr.vercel.app` con la URL real del proyecto Next.js que creaste.

**Opción B: Usar el mismo dominio con rewrites internos**

Si ambos proyectos están en el mismo dominio, Vercel puede manejar los rewrites automáticamente. Pero necesitas configurar el proyecto Next.js para que sepa que está en `/okr`.

## 🔧 Cambios Realizados en el Código

### Archivos Modificados:

1. **`apps/web/next.config.js`**
   - Cambiado `basePath` de `/OKR` a `/okr` (minúsculas)

2. **`apps/web/middleware.ts`**
   - Cambiado `basePath` por defecto de `/OKR` a `/okr`

3. **`apps/web/lib/base-path.ts`**
   - Cambiado valores por defecto de `/OKR` a `/okr`

4. **`apps/web/lib/api.ts`**
   - Cambiado `basePath` de `/OKR` a `/okr`

5. **`apps/web/components/layout/dashboard-layout.tsx`**
   - Cambiado `basePath` de `/OKR` a `/okr`

6. **`apps/web/components/layout/sidebar.tsx`**
   - Cambiado `basePath` de `/OKR` a `/okr`

7. **`apps/web/vercel.json`** (NUEVO)
   - Configuración específica para Next.js en Vercel

## 🧪 Pruebas Locales

Para probar localmente:

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

## 📝 Notas Importantes

1. **Dos proyectos Vercel**: Uno para Astro (raíz) y otro para Next.js (`apps/web`)
2. **Mismo dominio**: Ambos proyectos usan `reikisolar.com.co`
3. **Rewrites**: El proyecto Astro redirige `/okr/*` al proyecto Next.js
4. **Variables de entorno**: Asegúrate de configurar `NEXT_PUBLIC_BASE_PATH=/okr` en el proyecto Next.js

