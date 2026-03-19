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
    category: z.enum(['paneles', 'inversores', 'baterias', 'reflectores', 'controladores', 'protecciones', 'cargadores']),
    price: z.string(),
    specifications: z.array(z.string()),
    brand: z.string().optional(),
    model: z.string().optional(),
    stock: z.enum(['disponible', 'agotado', 'pre-orden']).optional(),
    order: z.number().optional(),
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
