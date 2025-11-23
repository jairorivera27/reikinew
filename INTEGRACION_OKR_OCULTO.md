# 🔒 Integración OKR Oculto en reikisolar.com.co

## 📋 Objetivo

Integrar la plataforma OKR dentro del mismo proyecto Vercel como una página más del sitio, pero **oculta** (sin enlaces visibles en el menú público). Solo accesible por URL directa: `reikisolar.com.co/okr`

## ✅ Solución Implementada

### 1. Build Combinado

El build ahora construye **ambos proyectos** y los combina en un solo `dist/`:

```bash
npm run build
```

Esto ejecuta:
1. `build:astro` → Construye Astro en `dist/`
2. `build:okr` → Construye Next.js como estático en `apps/web/out/`
3. `combine` → Copia `apps/web/out/` a `dist/okr/`

### 2. Configuración de Next.js

- **Export Estático**: Next.js se construye con `output: 'export'` cuando `STATIC_EXPORT=true`
- **BasePath**: Configurado como `/okr`
- **Middleware**: Se deshabilita temporalmente durante el build (incompatible con export estático)

### 3. Estructura Final

```
dist/
├── index.html          # Página principal Astro
├── blog/               # Blog Astro
├── tienda/             # Tienda Astro
├── okr/                # Plataforma OKR (OCULTA)
│   ├── index.html
│   ├── dashboard/
│   ├── login/
│   └── _next/          # Assets de Next.js
└── ...
```

## 🔧 Archivos Modificados

### 1. `package.json` (Raíz)
- Agregado script `build` que construye ambos proyectos
- Agregado `build:astro` para construir solo Astro
- Agregado `build:okr` para construir Next.js como estático
- Agregado `combine` para combinar ambos builds

### 2. `apps/web/next.config.js`
- Modificado para usar `STATIC_EXPORT=true` para export estático
- Mantiene `basePath: '/okr'`

### 3. `scripts/combine-builds.js` (NUEVO)
- Script que combina los builds de Astro y Next.js
- Deshabilita middleware temporalmente (incompatible con export estático)
- Copia `apps/web/out/` a `dist/okr/`

### 4. `vercel.json`
- Simplificado (sin rewrites, todo está en `dist/`)
- Build command: `npm run build`
- Output directory: `dist`

## 🚀 Cómo Funciona

### En Vercel

1. **Build**: Vercel ejecuta `npm run build`
2. **Astro**: Se construye en `dist/`
3. **Next.js**: Se construye como estático en `apps/web/out/`
4. **Combinación**: El script copia `apps/web/out/` a `dist/okr/`
5. **Deployment**: Vercel sirve todo desde `dist/`

### URLs Resultantes

- `reikisolar.com.co/` → Sitio Astro (página principal)
- `reikisolar.com.co/blog` → Blog Astro
- `reikisolar.com.co/tienda` → Tienda Astro
- `reikisolar.com.co/okr` → **Plataforma OKR (OCULTA)** ✅
- `reikisolar.com.co/okr/login` → Login OKR
- `reikisolar.com.co/okr/dashboard` → Dashboard OKR

## 🔒 Cómo Mantenerlo Oculto

### 1. No Agregar Enlaces en el Menú

Asegúrate de que **ningún componente de Astro** tenga enlaces a `/okr`:

- ✅ No en `Header.astro`
- ✅ No en `Footer.astro`
- ✅ No en ningún componente de navegación

### 2. Acceso Solo por URL Directa

La plataforma solo será accesible si alguien conoce la URL exacta:
- `reikisolar.com.co/okr`
- `reikisolar.com.co/okr/login`
- etc.

### 3. (Opcional) Protección Adicional

Si quieres más seguridad, puedes:
- Agregar autenticación en el nivel de Vercel (Edge Middleware)
- O usar autenticación dentro de la app Next.js

## 🧪 Pruebas Locales

```bash
# Construir ambos proyectos
npm run build

# Verificar que dist/okr/ existe
ls dist/okr/

# Iniciar preview
npm run preview
```

Luego accede a:
- `http://localhost:4321/` → Sitio Astro
- `http://localhost:4321/okr` → Plataforma OKR

## ⚠️ Limitaciones del Export Estático

### Middleware Deshabilitado

El middleware de Next.js se deshabilita durante el build porque es incompatible con export estático. Esto significa:

- ❌ No hay redirecciones automáticas en el servidor
- ✅ Las redirecciones se manejan en el cliente (JavaScript)

### API Routes

Las API routes de Next.js (`/api/*`) **NO funcionan** con export estático. Si necesitas API:

- Usa el backend NestJS en `apps/api/`
- O crea API routes en Astro (`src/pages/api/*`)

## 📝 Variables de Entorno en Vercel

No necesitas variables de entorno especiales. El build detecta automáticamente que debe hacer export estático.

## ✅ Verificación

Después del deployment:

1. ✅ `reikisolar.com.co/` → Funciona (Astro)
2. ✅ `reikisolar.com.co/okr` → Funciona (Next.js, oculto)
3. ✅ No hay enlaces visibles a `/okr` en el sitio público
4. ✅ Solo accesible por URL directa

## 🎯 Resumen

- ✅ OKR integrado en el mismo proyecto
- ✅ Oculto (sin enlaces visibles)
- ✅ Accesible solo por URL directa: `reikisolar.com.co/okr`
- ✅ Todo en un solo deployment de Vercel
- ✅ Sin necesidad de proyecto separado

