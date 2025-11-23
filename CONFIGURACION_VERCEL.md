# 🚀 Configuración de Vercel para Reiki Energía Solar

## 📋 Resumen del Problema

El error `❌ ERROR: No se encontró apps/web/out/` ocurría porque Vercel estaba intentando construir tanto el sitio Astro como la aplicación Next.js, pero:

1. **Next.js no genera `out/`** cuando:
   - No se ejecuta el build correctamente
   - El middleware está presente (incompatible con export estático)
   - Hay errores de TypeScript o dependencias
   - La variable de entorno `GITHUB_PAGES` no está configurada

2. **Vercel detecta automáticamente múltiples proyectos** en monorepos y puede intentar construir todos.

## ✅ Solución Implementada

### Opción A: Solo Desplegar Astro (RECOMENDADO)

El sitio Astro es el landing principal y se despliega en la raíz del dominio. La plataforma Next.js OKR/CRM se despliega en un servidor separado.

#### Configuración en el Panel de Vercel

1. **Ve a tu proyecto en Vercel**: https://vercel.com/alexander-rivera-s-projects/reikinew
2. **Settings → General → Build & Development Settings**:
   - **Framework Preset**: `Other` o `Astro` (si está disponible)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
   - **Root Directory**: `.` (raíz del repositorio)

3. **Settings → Git → Ignored Build Step**:
   - Agrega: `git diff --quiet HEAD^ HEAD apps/`
   - Esto evita que Vercel reconstruya cuando solo cambian archivos en `apps/`

4. **Settings → Environment Variables**:
   - No se requieren variables de entorno para el sitio Astro estático

#### Archivos de Configuración

- ✅ `vercel.json` - Configuración principal (ya creado)
- ✅ `astro.config.mjs` - Configuración de Astro (ya correcto)
- ✅ `package.json` - Scripts de build (ya correcto)

### Opción B: Desplegar Ambos (Astro + Next.js)

Si necesitas desplegar ambos proyectos en Vercel, necesitas configurar **dos proyectos separados** en Vercel:

#### Proyecto 1: Sitio Astro (Raíz)
- **Root Directory**: `.` (raíz)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework**: Astro

#### Proyecto 2: Plataforma Next.js OKR/CRM
- **Root Directory**: `apps/web`
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (para App Router) o `out` (para export estático)
- **Framework**: Next.js

**NOTA**: Para Next.js con export estático, necesitas:
1. Configurar `GITHUB_PAGES=true` en las variables de entorno
2. Eliminar o deshabilitar el middleware (`apps/web/middleware.ts`) porque es incompatible con export estático
3. Ajustar `next.config.js` para usar `output: 'export'`

## 🔧 Configuración Actual

### Estructura del Monorepo

```
REIKINEW/
├── package.json          # Proyecto Astro (raíz)
├── astro.config.mjs      # Configuración Astro
├── vercel.json          # Configuración Vercel
├── src/                  # Código fuente Astro
├── dist/                 # OUTPUT: Build de Astro
│
├── apps/
│   ├── api/              # Backend NestJS (no se despliega en Vercel)
│   └── web/               # Frontend Next.js OKR/CRM
│       ├── package.json
│       ├── next.config.js
│       └── middleware.ts  # Incompatible con export estático
```

### Outputs de Build

#### Astro (Raíz)
- **Comando**: `npm run build`
- **Output**: `dist/`
- **Contenido**: `index.html`, páginas estáticas, assets

#### Next.js (apps/web)
- **Comando**: `cd apps/web && npm run build`
- **Output con `standalone`**: `.next/standalone/` (para servidor Node.js)
- **Output con `export`**: `out/` (para sitio estático, requiere `GITHUB_PAGES=true`)

## 🎯 Pasos para Configurar Vercel

### 1. Configurar Proyecto Principal (Astro)

1. Ve a https://vercel.com/alexander-rivera-s-projects/reikinew/settings
2. En **General → Build & Development Settings**:
   ```
   Framework Preset: Other
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   Root Directory: ./
   ```

3. En **Git → Ignored Build Step**:
   ```
   git diff --quiet HEAD^ HEAD apps/
   ```
   Esto evita builds innecesarios cuando solo cambian archivos en `apps/`.

### 2. Verificar Variables de Entorno

No se requieren variables de entorno para el sitio Astro estático, pero si necesitas alguna:
- Ve a **Settings → Environment Variables**
- Agrega las variables necesarias

### 3. Desplegar

1. Haz push a la rama `main`
2. Vercel detectará automáticamente el cambio y desplegará
3. O ve a **Deployments** y haz clic en **Redeploy**

## 🐛 Solución de Problemas

### Error: "No se encontró apps/web/out/"

**Causa**: Vercel está intentando construir Next.js pero no genera `out/`.

**Solución**:
1. Asegúrate de que **Root Directory** esté configurado como `.` (raíz)
2. Verifica que **Build Command** sea `npm run build` (no `cd apps/web && npm run build`)
3. Verifica que **Output Directory** sea `dist` (no `apps/web/out`)
4. Agrega el **Ignored Build Step** mencionado arriba

### Error: "404: NOT_FOUND"

**Causa**: Vercel no encuentra `index.html` en el directorio de salida.

**Solución**:
1. Verifica que `npm run build` genere `dist/index.html`
2. Verifica que **Output Directory** sea exactamente `dist` (sin barra final)
3. Ejecuta `npm run build` localmente y verifica que `dist/index.html` existe

### Error: "Build failed"

**Causa**: Dependencias desincronizadas o errores de build.

**Solución**:
1. Verifica que `package-lock.json` esté actualizado
2. Ejecuta `npm run build` localmente para ver errores
3. Revisa los logs de build en Vercel

## 📝 Comandos Locales para Probar

### Build del Sitio Astro

```bash
# Desde la raíz del proyecto
npm install
npm run build

# Verificar que se generó dist/index.html
ls dist/index.html
```

### Preview Local

```bash
npm run preview
# Abre http://localhost:4321
```

## 🔗 URLs Esperadas

- **Sitio Principal (Astro)**: https://reikinew.vercel.app
- **Plataforma OKR/CRM (Next.js)**: Se despliega en servidor propio o en proyecto separado de Vercel

## 📚 Referencias

- [Documentación de Vercel - Monorepos](https://vercel.com/docs/monorepos)
- [Documentación de Astro - Deployment](https://docs.astro.build/en/guides/deploy/vercel/)
- [Documentación de Next.js - Static Exports](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

