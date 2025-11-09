# Configuración SEO para Reiki Energía Solar

Este documento explica cómo está configurado el SEO en el proyecto y cómo agregar nuevas rutas al sitemap.

## Archivos creados

### 1. `src/pages/sitemap.xml.ts`
Genera dinámicamente el sitemap.xml con todas las páginas del sitio.

**Rutas incluidas:**
- Páginas estáticas: `/`, `/contacto`, `/servicios`, `/tienda`, `/blog`, `/quienes-somos`, `/mapa-solar`
- Páginas dinámicas de servicios: `/servicios/[slug]`
- Páginas dinámicas de blog: `/blog/[slug]`

**Para agregar nuevas rutas dinámicas:**

```typescript
// Ejemplo: Agregar productos dinámicos
const productos = await getCollection('productos');
const productoPages = productos.map(producto => ({
  url: `${site}/tienda/${producto.slug}`,
  lastmod: producto.data.updatedAt || new Date().toISOString(),
  changefreq: 'weekly',
  priority: '0.8'
}));

// Agregar al array allPages
const allPages = [...staticPages, ...servicioPages, ...blogPages, ...productoPages];
```

### 2. `src/pages/robots.txt.ts`
Genera el archivo robots.txt que indica a los buscadores qué pueden indexar.

**Configuración actual:**
- Permite indexar todas las páginas (`Allow: /`)
- Bloquea acceso a `/api/` y `/_astro/`
- Indica la ubicación del sitemap

**Para modificar:**
Edita el contenido del string `robotsTxt` en el archivo.

### 3. `src/components/SEO.astro`
Componente reutilizable para agregar metadatos SEO a las páginas.

**Uso básico:**
```astro
---
import SEO from '../components/SEO.astro';
---

<html>
  <head>
    <SEO 
      title="Título de la página"
      description="Descripción de la página"
      canonical="/ruta-de-la-pagina"
    />
  </head>
</html>
```

**Props disponibles:**
- `title` (requerido): Título de la página
- `description` (requerido): Meta descripción
- `canonical` (opcional): URL canónica (por defecto usa la URL actual)
- `ogImage` (opcional): Imagen para Open Graph (por defecto: `/images/og-default.jpg`)
- `ogType` (opcional): Tipo de contenido OG (por defecto: `website`)
- `noindex` (opcional): Si es `true`, agrega `noindex, nofollow` (por defecto: `false`)

## Configuración del dominio

**Importante:** Actualiza el dominio en estos archivos:

1. `astro.config.mjs` - Línea 5: `site: 'https://tu-dominio.com'`
2. `src/pages/sitemap.xml.ts` - Línea 20: `const site = 'https://tu-dominio.com';`
3. `src/pages/robots.txt.ts` - Línea 18: `const site = 'https://tu-dominio.com';`
4. `src/components/SEO.astro` - Línea 30: `const site = 'https://tu-dominio.com';`

## Verificación

Después de hacer build, verifica que los archivos se generen correctamente:

1. **Sitemap:** `https://tu-dominio.com/sitemap.xml`
2. **Robots.txt:** `https://tu-dominio.com/robots.txt`

## Próximos pasos

1. Crear una imagen Open Graph por defecto en `/public/images/og-default.jpg`
2. Agregar imágenes Open Graph específicas para cada página importante
3. Configurar Google Search Console y enviar el sitemap
4. Verificar que todas las páginas tengan metadatos SEO completos

## Ejemplo de implementación completa

```astro
---
// src/pages/ejemplo.astro
import SEO from '../components/SEO.astro';
---

<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ejemplo | Reiki Energía Solar</title>
    
    <SEO 
      title="Ejemplo"
      description="Esta es una página de ejemplo con SEO optimizado"
      canonical="/ejemplo"
      ogImage="/images/ejemplo-og.jpg"
    />
  </head>
  <body>
    <!-- Contenido -->
  </body>
</html>
```

