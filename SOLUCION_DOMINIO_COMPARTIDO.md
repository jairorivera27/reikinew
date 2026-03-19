# 🌐 Solución: Dominio Compartido en Vercel

## 📋 Situación

El dominio `reikisolar.com.co` ya está asociado al proyecto Astro (`reikinew`), y quieres agregarlo también al proyecto Next.js OKR (`reikinew-okr`).

## ✅ Solución: Usar el Mismo Dominio en Ambos Proyectos

**SÍ, puedes confirmar la transferencia**. Vercel permite que múltiples proyectos compartan el mismo dominio. El routing se maneja automáticamente:

- **Rutas que no empiezan con `/okr`** → Se sirven desde el proyecto Astro (raíz)
- **Rutas que empiezan con `/okr`** → Se sirven desde el proyecto Next.js

## 🎯 Pasos

### 1. Confirmar la Transferencia del Dominio

Cuando Vercel te pregunte:
> "Este dominio ya está asociado a otro proyecto. Confirme que desea transferir..."

**Responde: SÍ, confirmar**

Esto NO elimina el dominio del proyecto Astro. Ambos proyectos compartirán el dominio.

### 2. Verificar Configuración

Después de confirmar, verifica que:

**Proyecto Astro (`reikinew`)**:
- Settings → Domains → `reikisolar.com.co` ✅

**Proyecto Next.js (`reikinew-okr`)**:
- Settings → Domains → `reikisolar.com.co` ✅

### 3. Configurar Variables de Entorno en Next.js

En el proyecto Next.js (`reikinew-okr`), asegúrate de tener:

```
NEXT_PUBLIC_BASE_PATH=/okr
NEXT_PUBLIC_API_URL=https://reikisolar.com.co
NODE_ENV=production
```

## 🔍 Cómo Funciona el Routing

Vercel maneja automáticamente el routing basado en el `basePath` de Next.js:

```
reikisolar.com.co/          → Proyecto Astro (dist/)
reikisolar.com.co/blog       → Proyecto Astro (dist/blog/)
reikisolar.com.co/okr        → Proyecto Next.js (apps/web)
reikisolar.com.co/okr/login  → Proyecto Next.js (apps/web)
```

## ⚠️ Si Vercel No Enruta Automáticamente

Si después de configurar ambos proyectos, `/okr` no funciona, puedes agregar rewrites en el proyecto Astro.

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

**Nota**: Reemplaza `reikinew-okr.vercel.app` con la URL real del proyecto Next.js.

## ✅ Verificación

Después de confirmar la transferencia:

1. ✅ Ambos proyectos muestran `reikisolar.com.co` en Settings → Domains
2. ✅ El sitio Astro sigue funcionando en `reikisolar.com.co`
3. ✅ La plataforma OKR funciona en `reikisolar.com.co/okr`

## 📝 Nota Importante

**NO hay problema en compartir el dominio**. Vercel está diseñado para esto. El routing se maneja automáticamente basándose en:
- El `basePath` configurado en Next.js (`/okr`)
- Las rutas que no coinciden con el `basePath` van al proyecto Astro


