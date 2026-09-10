import { defineCollection, z } from 'astro:content';

const serviciosCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string(),
    benefits: z.array(z.string()),
    cta: z.object({
      text: z.string(),
      link: z.string(),
    }),
    order: z.number().optional(),
  }),
});

const productosCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string(),
    /** Los ids deben coincidir con src/config/categorias-tienda.json. */
    category: z.enum([
      'paneles',
      'inversores',
      'baterias',
      'reflectores',
      'controladores',
      'protecciones',
      'cargadores',
      'monitoreo',
      'bombeo',
      'accesorios',
    ]),
    price: z.string(),
    /** Precio antes de la rebaja. Si está presente, la ficha muestra el bloque de liquidación. */
    precioAnterior: z.string().optional(),
    /** Descuento en porcentaje entero y positivo (ej. 56 para un -56%). */
    descuentoPct: z.number().int().min(1).max(95).optional(),
    /** Etiqueta de la promoción, ej. "Liquidación". */
    promocion: z.string().optional(),
    /** Banner de la promoción. Provisional hasta cargar la pieza definitiva. */
    promoImagen: z.string().optional(),
    specifications: z.array(z.string()),
    brand: z.string().optional(),
    model: z.string().optional(),
    /** Código del fabricante. Clave de upsert en la importación masiva. */
    sku: z.string().optional(),
    /** Especificación técnica principal tal como viene del catálogo (ej. "48V, 100Ah"). */
    power: z.string().optional(),
    stock: z.enum(['disponible', 'agotado', 'pre-orden']).optional(),
    order: z.number().optional(),
    /** Oculta el producto de la tienda, los listados y el sitemap. */
    draft: z.boolean().optional(),
    /** Marca productos que entraron con logo de marca o placeholder en vez de foto real. */
    imagenPendiente: z.boolean().optional(),
    updatedAt: z.string().optional(),
    /** Orden en el carrusel del inicio (1 = primero). Si no se define, no se prioriza en el carrusel. */
    homeCarouselOrder: z.number().int().min(1).max(24).optional(),
    /** SEO visible en la ficha del producto (no en tarjetas). */
    seoKeywords: z.array(z.string()).max(10).optional(),
    seoDifferentiator: z.string().optional(),
    /** Meta title (máx. 60) y meta description (máx. 155) de la ficha. */
    seoTitle: z.string().max(70).optional(),
    seoDescription: z.string().max(165).optional(),
  }),
});

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string(),
    author: z.string(),
    date: z.string(),
    category: z.string(),
    tags: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
  }),
});

export const collections = {
  'servicios': serviciosCollection,
  'productos': productosCollection,
  'blog': blogCollection,
};
