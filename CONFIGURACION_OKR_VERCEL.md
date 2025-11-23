# 🚀 Configuración: Plataforma OKR en reikisolar.com.co/okr

## 📋 Objetivo

Configurar la plataforma Next.js OKR/CRM para que funcione en `reikisolar.com.co/okr` usando Vercel.

## 🎯 Estrategia: Proyecto Vercel Separado

La mejor forma de hacer esto en Vercel es crear **un proyecto separado** para Next.js y usar **rewrites** en el proyecto principal de Astro para enrutar `/okr` al deployment de Next.js.

## 📝 Pasos para Configurar

### Opción A: Proyecto Vercel Separado (RECOMENDADO)

#### 1. Crear Nuevo Proyecto en Vercel para Next.js

1. Ve a https://vercel.com/new
2. Importa el mismo repositorio: `https://github.com/jairorivera27/reikinew`
3. Configura el proyecto:
   - **Project Name**: `reikinew-okr` (o el nombre que prefieras)
   - **Root Directory**: `apps/web`
   - **Framework Preset**: `Next.js`
   - **Build Command**: `npm run build` (o déjalo en blanco, Vercel lo detecta)
   - **Output Directory**: `.next` (o déjalo en blanco)
   - **Install Command**: `npm install`

4. **Variables de Entorno**:
   ```
   NEXT_PUBLIC_BASE_PATH=/okr
   NEXT_PUBLIC_API_URL=https://reikisolar.com.co
   NODE_ENV=production
   ```

5. **Domains**:
   - Agrega el dominio: `reikisolar.com.co`
   - O deja que se conecte automáticamente al proyecto principal

#### 2. Configurar Rewrites en el Proyecto Principal (Astro)

Actualiza `vercel.json` en la raíz para agregar rewrites:

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

**Nota**: Reemplaza `reikinew-okr.vercel.app` con la URL real del proyecto Next.js en Vercel.

### Opción B: Monorepo con Rewrites (Alternativa)

Si prefieres mantener todo en un solo proyecto, puedes usar rewrites, pero Next.js necesita un servidor Node.js, así que esta opción es más compleja.

## 🔧 Cambios Realizados en el Código

### 1. `apps/web/next.config.js`
- Cambiado `basePath` de `/OKR` a `/okr` (minúsculas)
- Mantiene compatibilidad con variable de entorno

### 2. `apps/web/middleware.ts`
- Cambiado `basePath` por defecto de `/OKR` a `/okr`

### 3. `apps/web/vercel.json` (NUEVO)
- Configuración específica para Next.js en Vercel
- Rewrites para manejar el path `/okr`

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

## 📝 Variables de Entorno Requeridas

### En Vercel (Proyecto Next.js)

**Settings → Environment Variables**:
```
NEXT_PUBLIC_BASE_PATH=/okr
NEXT_PUBLIC_API_URL=https://reikisolar.com.co
NODE_ENV=production
```

## ✅ Verificación

Después de configurar:

1. ✅ La plataforma carga en `reikisolar.com.co/okr`
2. ✅ Las rutas internas funcionan: `/okr/login`, `/okr/dashboard`, etc.
3. ✅ Los assets (CSS, JS) se cargan correctamente desde `/okr/_next/...`
4. ✅ La API responde correctamente
5. ✅ El login redirige correctamente después de autenticación

## 🔗 URLs Esperadas

- **Login**: `reikisolar.com.co/okr/login`
- **Dashboard**: `reikisolar.com.co/okr/dashboard`
- **OKR**: `reikisolar.com.co/okr/okr`
- **CRM**: `reikisolar.com.co/okr/crm`
- **Marketing**: `reikisolar.com.co/okr/marketing`
- **Admin**: `reikisolar.com.co/okr/admin`

## 📚 Referencias

- [Vercel - Monorepos](https://vercel.com/docs/monorepos)
- [Next.js - Base Path](https://nextjs.org/docs/app/api-reference/next-config-js/basePath)
- [Vercel - Rewrites](https://vercel.com/docs/concepts/edge-network/rewrites)

