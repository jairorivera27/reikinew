# ✅ Solución Completa: Error de Build en Vercel

## 📋 Resumen del Problema

### Error Original
```
🔗 Combinando sitio Astro y plataforma Next.js...
✅ Sitio Astro copiado
❌ ERROR: No se encontró apps/web/out/
Error: Process completed with exit code 1.
```

### Error en el Navegador
```
404: NOT_FOUND
File not found
The site configured at this address does not contain the requested file.
For root URLs you must provide an index.html file.
```

## 🔍 Análisis del Problema

### 1. Estructura del Monorepo

El repositorio tiene una estructura de monorepo con dos proyectos principales:

```
REIKINEW/
├── package.json          # Proyecto Astro (raíz) - Landing "Reiki Energía Solar"
├── astro.config.mjs      # Configuración Astro
├── src/                  # Código fuente Astro
├── dist/                 # OUTPUT: Build de Astro (genera index.html)
│
├── apps/
│   ├── api/              # Backend NestJS (no relevante para Vercel)
│   └── web/               # Frontend Next.js OKR/CRM
│       ├── package.json
│       ├── next.config.js
│       ├── middleware.ts
│       └── out/          # OUTPUT: Solo se genera con output: 'export' y GITHUB_PAGES=true
```

### 2. Por Qué Ocurría el Error

**Problema Principal**: Vercel estaba intentando construir **ambos proyectos** (Astro + Next.js) y combinarlos, pero:

1. **Next.js no genera `apps/web/out/`** porque:
   - La configuración actual usa `output: 'standalone'` (no `export`)
   - `output: 'export'` solo se activa cuando `GITHUB_PAGES='true'`
   - El middleware (`apps/web/middleware.ts`) es incompatible con export estático
   - Next.js está configurado para servidor propio, no para export estático

2. **Vercel detecta automáticamente múltiples proyectos** en monorepos y puede intentar construir todos, causando conflictos.

3. **El sitio devolvía 404** porque:
   - Vercel no sabía qué directorio usar como output
   - O estaba buscando en `apps/web/out/` en lugar de `dist/`

## ✅ Solución Implementada

### Opción Elegida: Solo Desplegar Astro (RECOMENDADO)

El sitio Astro es el landing principal y se despliega en la raíz del dominio (`https://reikinew.vercel.app`). La plataforma Next.js OKR/CRM se mantiene para despliegue en servidor propio o en un proyecto separado de Vercel.

### Archivos Creados/Modificados

#### 1. `vercel.json` (NUEVO)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": null,
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "ignoreCommand": "git diff --quiet HEAD^ HEAD apps/",
  "rewrites": [...],
  "headers": [...]
}
```

**Propósito**: Configura Vercel para:
- Construir solo el proyecto Astro (raíz)
- Usar `dist/` como directorio de salida
- Ignorar cambios en `apps/` para evitar builds innecesarios

#### 2. `CONFIGURACION_VERCEL.md` (NUEVO)
Documentación completa sobre cómo configurar Vercel en el panel, incluyendo:
- Pasos detallados de configuración
- Solución de problemas comunes
- Comandos para probar localmente

#### 3. `astro.config.mjs` (SIN CAMBIOS - Ya estaba correcto)
```javascript
export default defineConfig({
  output: 'static',  // Genera sitio estático
  site: 'https://reikisolar.com.co',
  // ... genera dist/index.html correctamente
});
```

#### 4. `package.json` (SIN CAMBIOS - Ya estaba correcto)
```json
{
  "scripts": {
    "build": "astro build"  // Genera dist/
  }
}
```

## 🎯 Configuración Requerida en Vercel

### Pasos en el Panel de Vercel

1. **Ve a tu proyecto**: https://vercel.com/alexander-rivera-s-projects/reikinew/settings

2. **Settings → General → Build & Development Settings**:
   ```
   Framework Preset: Other (o Astro si está disponible)
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   Root Directory: ./
   ```

3. **Settings → Git → Ignored Build Step**:
   ```
   git diff --quiet HEAD^ HEAD apps/
   ```
   Esto evita que Vercel reconstruya cuando solo cambian archivos en `apps/`.

4. **Settings → Environment Variables**:
   - No se requieren variables de entorno para el sitio Astro estático

### Verificación

Después de configurar, haz un nuevo deploy:
1. Ve a **Deployments**
2. Haz clic en **Redeploy** en el último deployment
3. O haz push a `main` para trigger automático

## 🏗️ Flujo de Build

### Antes (Fallaba)
```
1. Vercel detecta monorepo
2. Intenta construir Astro → dist/ ✅
3. Intenta construir Next.js → apps/web/out/ ❌ (no existe)
4. Intenta combinar dist/ + apps/web/out/ ❌
5. Error: No se encontró apps/web/out/
```

### Ahora (Funciona)
```
1. Vercel lee vercel.json
2. Construye solo Astro → dist/ ✅
3. Sirve dist/ como sitio estático ✅
4. index.html disponible en raíz ✅
```

## 📁 Estructura de Outputs

### Astro (Raíz) - Se despliega en Vercel
```
dist/
├── index.html          # ✅ Página principal
├── blog/
│   └── [slug].html
├── tienda/
│   └── index.html
├── servicios/
│   └── [slug].html
└── _assets/            # CSS, JS, imágenes
```

### Next.js (apps/web) - NO se despliega en Vercel
```
apps/web/
├── .next/              # Build standalone (para servidor)
│   └── standalone/
└── out/                # Solo si GITHUB_PAGES=true (no se usa)
```

## 🧪 Cómo Probar Localmente

### Build del Sitio Astro

```bash
# Desde la raíz del proyecto
npm install
npm run build

# Verificar que se generó dist/index.html
ls dist/index.html  # Linux/Mac
dir dist\index.html # Windows

# Preview local
npm run preview
# Abre http://localhost:4321
```

### Verificar Estructura

```bash
# Verificar que dist/ contiene index.html
ls -la dist/        # Linux/Mac
dir dist\           # Windows

# Debe mostrar:
# - index.html
# - blog/
# - tienda/
# - _assets/
```

## 🔧 Solución de Problemas

### Error: "No se encontró apps/web/out/"

**Causa**: Vercel está intentando construir Next.js.

**Solución**:
1. Verifica que `vercel.json` existe en la raíz
2. Verifica que **Root Directory** en Vercel sea `.` (raíz)
3. Verifica que **Build Command** sea `npm run build` (no `cd apps/web && npm run build`)
4. Verifica que **Output Directory** sea `dist` (no `apps/web/out`)
5. Agrega el **Ignored Build Step** mencionado arriba

### Error: "404: NOT_FOUND"

**Causa**: Vercel no encuentra `index.html` en el directorio de salida.

**Solución**:
1. Verifica que `npm run build` genere `dist/index.html` localmente
2. Verifica que **Output Directory** sea exactamente `dist` (sin barra final)
3. Revisa los logs de build en Vercel para ver si hay errores

### Error: "Build failed"

**Causa**: Dependencias desincronizadas o errores de build.

**Solución**:
1. Verifica que `package-lock.json` esté actualizado
2. Ejecuta `npm run build` localmente para ver errores
3. Revisa los logs de build en Vercel
4. Asegúrate de que todas las dependencias estén en `package.json`

## 📝 Resumen de Cambios

### Archivos Creados
- ✅ `vercel.json` - Configuración de Vercel
- ✅ `CONFIGURACION_VERCEL.md` - Documentación de configuración
- ✅ `SOLUCION_VERCEL_BUILD.md` - Este documento

### Archivos Modificados
- ❌ Ninguno (todos los archivos de configuración ya estaban correctos)

### Archivos Sin Cambios (Ya Correctos)
- ✅ `astro.config.mjs` - Configuración de Astro correcta
- ✅ `package.json` - Scripts de build correctos
- ✅ `apps/web/next.config.js` - Configuración de Next.js correcta (para servidor propio)

## 🎯 Resultado Esperado

### ✅ Después de Configurar Vercel

1. **Build exitoso**: El pipeline deja de fallar con el error `No se encontró apps/web/out/`
2. **Sitio funcionando**: https://reikinew.vercel.app muestra el landing principal (Astro)
3. **Sin 404**: El sitio carga correctamente con `index.html` en la raíz
4. **Builds rápidos**: Solo se construye Astro, no Next.js

### 📊 Comparación: Antes vs Ahora

| Aspecto | ANTES | AHORA |
|---------|-------|-------|
| **Build en Vercel** | Intenta Astro + Next.js | Solo Astro |
| **Output Directory** | Indefinido/incorrecto | `dist/` |
| **Error** | ❌ `apps/web/out/` no encontrado | ✅ Build exitoso |
| **Sitio** | ❌ 404 | ✅ Funciona |
| **Tiempo de Build** | Lento (intenta ambos) | Rápido (solo Astro) |

## 🔗 URLs y Deployment

- **Sitio Principal (Astro)**: https://reikinew.vercel.app
- **Plataforma OKR/CRM (Next.js)**: Se despliega en servidor propio o proyecto separado de Vercel

## 📚 Referencias

- [Documentación de Vercel - Monorepos](https://vercel.com/docs/monorepos)
- [Documentación de Astro - Deployment](https://docs.astro.build/en/guides/deploy/vercel/)
- [Documentación de Next.js - Static Exports](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

---

## ✅ Checklist Final

- [x] `vercel.json` creado y configurado
- [x] Documentación de configuración creada
- [x] Configuración de Astro verificada (ya estaba correcta)
- [x] Scripts de build verificados (ya estaban correctos)
- [ ] **ACCIÓN REQUERIDA**: Configurar Vercel en el panel según `CONFIGURACION_VERCEL.md`
- [ ] **ACCIÓN REQUERIDA**: Hacer nuevo deploy en Vercel
- [ ] **ACCIÓN REQUERIDA**: Verificar que https://reikinew.vercel.app funciona


