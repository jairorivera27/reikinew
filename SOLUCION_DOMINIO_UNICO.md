# ✅ Solución: Dominio Único con Rewrites

## 📋 Problema

Vercel NO permite que múltiples proyectos compartan el mismo dominio directamente. Cuando agregas el dominio a un proyecto, se quita del otro.

## ✅ Solución: Rewrites en el Proyecto Principal

**Estrategia**: 
- El dominio `reikisolar.com.co` permanece **solo** en el proyecto Astro
- Usamos **rewrites** en `vercel.json` para enrutar `/okr` al proyecto Next.js
- El proyecto Next.js NO necesita el dominio, solo su URL de Vercel

## 🎯 Configuración

### 1. Proyecto Astro (Principal) - `reikinew`
- **Dominio**: `reikisolar.com.co` ✅ (permanece aquí)
- **Root Directory**: `.` (raíz)
- **Output**: `dist/`

### 2. Proyecto Next.js (OKR) - `reikinew-okr`
- **Dominio**: NO agregar `reikisolar.com.co` ❌
- **URL Vercel**: `reikinew-okr.vercel.app` (o la que Vercel asigne)
- **Root Directory**: `apps/web`
- **Output**: `.next/`

### 3. Rewrites en `vercel.json` (Raíz)

He actualizado `vercel.json` con rewrites:

```json
{
  "rewrites": [
    {
      "source": "/okr/:path*",
      "destination": "https://reikinew-okr.vercel.app/okr/:path*"
    },
    {
      "source": "/okr",
      "destination": "https://reikinew-okr.vercel.app/okr"
    }
  ]
}
```

**IMPORTANTE**: Reemplaza `reikinew-okr.vercel.app` con la URL real del proyecto Next.js.

## 📝 Pasos en Vercel

### Paso 1: Crear Proyecto Next.js (sin dominio)

1. Ve a: https://vercel.com/new
2. Importa: `https://github.com/jairorivera27/reikinew`
3. Configura:
   - **Project Name**: `reikinew-okr`
   - **Root Directory**: `apps/web` ⚠️
   - **Framework**: Next.js
   - **Domains**: NO agregues `reikisolar.com.co` ❌
   - Deja que use su URL de Vercel: `reikinew-okr.vercel.app`

4. **Variables de Entorno**:
   ```
   NEXT_PUBLIC_BASE_PATH=/okr
   NEXT_PUBLIC_API_URL=https://reikisolar.com.co
   NODE_ENV=production
   ```

5. **Anota la URL del proyecto**: `https://reikinew-okr.vercel.app` (o la que Vercel asigne)

### Paso 2: Actualizar Rewrites en el Proyecto Principal

1. Ve al proyecto Astro: https://vercel.com/alexander-rivera-s-projects/reikinew
2. Ve a Settings → General
3. O mejor: Actualiza `vercel.json` en el código (ya lo hice)
4. Reemplaza `reikinew-okr.vercel.app` con la URL real del proyecto Next.js
5. Haz commit y push

### Paso 3: Verificar

Después del deployment:
- `reikisolar.com.co/` → Proyecto Astro ✅
- `reikisolar.com.co/okr` → Proyecto Next.js (vía rewrite) ✅

## 🔍 Cómo Funciona

```
Usuario visita: reikisolar.com.co/okr/login
         ↓
Vercel (proyecto Astro) detecta /okr/*
         ↓
Rewrite en vercel.json redirige a: reikinew-okr.vercel.app/okr/login
         ↓
Proyecto Next.js sirve la página
         ↓
Usuario ve la plataforma OKR
```

## ✅ Ventajas de Esta Solución

1. ✅ Solo un proyecto tiene el dominio (más simple)
2. ✅ No hay conflictos de dominio
3. ✅ Rewrites transparentes para el usuario
4. ✅ Fácil de mantener

## 🐛 Si No Funciona

1. **Verifica la URL del proyecto Next.js**: Debe ser la correcta en `vercel.json`
2. **Verifica que el proyecto Next.js esté desplegado**: Debe tener al menos un deployment exitoso
3. **Verifica variables de entorno**: `NEXT_PUBLIC_BASE_PATH=/okr` debe estar configurado
4. **Limpia cache**: En Vercel, Settings → Clear Build Cache

