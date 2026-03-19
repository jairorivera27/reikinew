# ✅ Configuración Final: Vercel Solo Construye Astro

## 📋 Resumen de Cambios

### Estructura del Proyecto Identificada

**Proyecto Astro (Landing Principal)**:
- **Ubicación**: Raíz del repositorio (`/`)
- **package.json**: Raíz (`package.json`)
- **Configuración**: `astro.config.mjs` en la raíz
- **Código fuente**: `src/` en la raíz
- **Comando de build**: `npm run build` (desde la raíz)
- **Output**: `dist/` (genera `dist/index.html`)

**Proyecto Next.js (OKR/CRM)**:
- **Ubicación**: `apps/web/`
- **Estado**: **EXCLUIDO** del build de Vercel
- **Uso**: Se despliega en servidor propio o proyecto Vercel separado

## 🔧 Archivos Modificados

### 1. `vercel.json` (SIMPLIFICADO)

**Antes**: Tenía `rewrites` y `headers` que podían interferir

**Ahora**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": null
}
```

**Propósito**: Configuración mínima y clara para que Vercel:
- Construya solo Astro desde la raíz
- Use `dist/` como directorio de salida
- No intente detectar automáticamente otros frameworks

### 2. `.vercelignore` (NUEVO)

```
apps/
node_modules/
.next/
dist/
.vercel/
```

**Propósito**: Ignora `apps/` para que Vercel no intente construir Next.js automáticamente.

### 3. `package.json` (ACTUALIZADO)

**Cambio**: Agregado comentario descriptivo:
```json
"description": "Sitio web principal (Astro). La plataforma Next.js OKR/CRM en apps/web se despliega en servidor propio o proyecto Vercel separado."
```

**Propósito**: Documentar que Next.js no forma parte del build de Vercel.

### 4. `.github/workflows/deploy.yml` (SIN CAMBIOS)

El workflow de GitHub Actions ya estaba correcto:
- Solo construye Astro
- No intenta construir Next.js
- No busca `apps/web/out/`

## 🎯 Configuración en el Panel de Vercel

**IMPORTANTE**: Verifica que en el panel de Vercel esté configurado:

**Settings → General → Build & Development Settings**:
- **Framework Preset**: `Other` (o `Astro` si está disponible)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Root Directory**: `.` (raíz del repositorio)

**Settings → Git → Ignored Build Step**:
```
git diff --quiet HEAD^ HEAD apps/
```

Esto evita que Vercel reconstruya cuando solo cambian archivos en `apps/`.

## 🧪 Comando para Probar Build Localmente

Para probar el build del sitio Astro de la misma forma que en Vercel:

```bash
# Desde la raíz del repositorio
npm install
npm run build

# Verificar que se generó dist/index.html
ls dist/index.html  # Linux/Mac
dir dist\index.html # Windows

# Preview local (opcional)
npm run preview
# Abre http://localhost:4321
```

## 📊 Flujo de Build

### Antes (Fallaba)
```
1. Vercel detecta monorepo
2. Intenta construir Astro → dist/ ✅
3. Intenta construir Next.js → apps/web/out/ ❌ (no existe)
4. Intenta combinar ambos ❌
5. Error: No se encontró apps/web/out/
6. 404: No hay index.html servido
```

### Ahora (Funciona)
```
1. Vercel lee vercel.json
2. .vercelignore excluye apps/
3. Construye solo Astro → dist/ ✅
4. Sirve dist/ como sitio estático ✅
5. index.html disponible en raíz ✅
```

## ✅ Resultado Esperado

- ✅ El pipeline deja de fallar con el error `No se encontró apps/web/out/`
- ✅ El sitio https://reikinew.vercel.app muestra el landing principal (Astro)
- ✅ Sin 404: el sitio carga con `index.html` válido
- ✅ Builds más rápidos: solo se construye Astro, no Next.js

## 🔍 Verificación

Después de hacer push de estos cambios:

1. **Vercel detectará automáticamente** el cambio y hará un nuevo deployment
2. **Revisa los logs** del deployment en Vercel:
   - Debe mostrar: `Building Astro site...`
   - NO debe mostrar: `Building Next.js...`
   - Debe mostrar: `Output directory: dist`
3. **Verifica el sitio**: https://reikinew.vercel.app debe cargar correctamente

## 📝 Notas Técnicas

### Por Qué Funciona Ahora

**Antes**:  
Vercel detectaba el monorepo e intentaba construir ambos proyectos. Parte del flujo esperaba un `next export` que generara `apps/web/out/`, pero con la configuración actual de Next.js (usando `output: 'standalone'` para servidor propio) esa carpeta nunca se generaba, rompiendo el pipeline y dejando al proyecto sin `index.html` servido correctamente.

**Ahora**:  
`vercel.json` y `.vercelignore` indican a Vercel que:
- Solo construya el proyecto **Astro** (en la raíz)
- Use el comando de build de Astro (`npm run build`)
- Sirva la carpeta `dist/`, donde Astro genera `index.html` correctamente
- Ignore completamente `apps/` para evitar detectar Next.js

La plataforma Next.js OKR/CRM queda desacoplada del pipeline de Vercel, lista para:
- Desplegarse en un proyecto Vercel separado, **o**
- Ejecutarse en un servidor propio, según preferencia.


