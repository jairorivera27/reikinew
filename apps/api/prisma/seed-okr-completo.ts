import { PrismaClient } from '@prisma/client';
import { TaskStatus } from '../src/common/types/enums';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creando OKR completos para todas las áreas...');

  // Fechas para el trimestre actual
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-03-31');

  // ============================================
  // ÁREA COMERCIAL
  // ============================================
  console.log('\n📊 Creando OKR del ÁREA COMERCIAL...');

  const comercialUser = await prisma.user.findUnique({
    where: { email: 'comercial@reikisolar.com.co' },
  });

  if (!comercialUser) {
    throw new Error('Usuario comercial no encontrado');
  }

  // OKR 1: Incrementar el volumen de ventas
  const okrComercial1 = await prisma.oKR.create({
    data: {
      title: 'Incrementar el volumen de ventas',
      description: 'Aumentar los ingresos por ventas en un 30% trimestral',
      area: 'COMERCIAL',
      period: 'TRIMESTRAL',
      startDate,
      endDate,
      ownerId: comercialUser.id,
      keyResults: {
        create: [
          {
            title: 'Cerrar 15 oportunidades con valor total de $500,000',
            description: 'Meta: 15 oportunidades ganadas con valor acumulado de $500,000',
            type: 'NUMERICO',
            targetValue: 500000,
            currentValue: 0,
            unit: 'USD',
          },
          {
            title: 'Aumentar la tasa de conversión de leads a oportunidades en 25%',
            description: 'Pasar de X% a Y% de conversión',
            type: 'PORCENTAJE',
            targetValue: 25,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Reducir el tiempo promedio del ciclo de ventas en 10 días',
            description: 'De X días a Y días promedio',
            type: 'NUMERICO',
            targetValue: 10,
            currentValue: 0,
            unit: 'días',
          },
          {
            title: 'Aumentar el valor promedio de las oportunidades ganadas en 15%',
            description: 'Incrementar el ticket promedio',
            type: 'PORCENTAJE',
            targetValue: 15,
            currentValue: 0,
            unit: '%',
          },
        ],
      },
    },
    include: { keyResults: true },
  });

  console.log(`   ✅ OKR 1 creado: ${okrComercial1.title}`);

  // OKR 2: Mejorar la gestión del pipeline
  const okrComercial2 = await prisma.oKR.create({
    data: {
      title: 'Mejorar la gestión del pipeline',
      description: 'Tener un pipeline saludable y predecible',
      area: 'COMERCIAL',
      period: 'TRIMESTRAL',
      startDate,
      endDate,
      ownerId: comercialUser.id,
      keyResults: {
        create: [
          {
            title: 'Mantener pipeline con valor mínimo de $1,500,000',
            description: 'Pipeline debe ser 3x la meta mensual',
            type: 'NUMERICO',
            targetValue: 1500000,
            currentValue: 0,
            unit: 'USD',
          },
          {
            title: 'Tener al menos 8 oportunidades en etapa de negociación',
            description: 'Mínimo 8 oportunidades activas en negociación',
            type: 'NUMERICO',
            targetValue: 8,
            currentValue: 0,
            unit: 'oportunidades',
          },
          {
            title: 'Reducir oportunidades estancadas a menos del 10%',
            description: 'Oportunidades sin actividad >30 días',
            type: 'PORCENTAJE',
            targetValue: 10,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Aumentar la precisión del forecast en 20%',
            description: 'Mejorar la exactitud de las proyecciones',
            type: 'PORCENTAJE',
            targetValue: 20,
            currentValue: 0,
            unit: '%',
          },
        ],
      },
    },
    include: { keyResults: true },
  });

  console.log(`   ✅ OKR 2 creado: ${okrComercial2.title}`);

  // OKR 3: Profesionalizar el proceso comercial
  const okrComercial3 = await prisma.oKR.create({
    data: {
      title: 'Profesionalizar el proceso comercial',
      description: 'Estandarizar y optimizar el proceso de ventas',
      area: 'COMERCIAL',
      period: 'TRIMESTRAL',
      startDate,
      endDate,
      ownerId: comercialUser.id,
      keyResults: {
        create: [
          {
            title: 'Documentar 5 procesos comerciales clave',
            description: 'Procesos: prospección, calificación, presentación, negociación, cierre',
            type: 'NUMERICO',
            targetValue: 5,
            currentValue: 0,
            unit: 'procesos',
          },
          {
            title: 'Capacitar al 100% del equipo en el nuevo proceso',
            description: 'Todos los comerciales capacitados',
            type: 'PORCENTAJE',
            targetValue: 100,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Implementar CRM con uso del 100% del equipo',
            description: 'Adopción completa del CRM',
            type: 'PORCENTAJE',
            targetValue: 100,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Reducir tiempo administrativo en 30%',
            description: 'Menos tiempo en tareas administrativas',
            type: 'PORCENTAJE',
            targetValue: 30,
            currentValue: 0,
            unit: '%',
          },
        ],
      },
    },
    include: { keyResults: true },
  });

  console.log(`   ✅ OKR 3 creado: ${okrComercial3.title}`);

  // ============================================
  // ÁREA MARKETING
  // ============================================
  console.log('\n📊 Creando OKR del ÁREA MARKETING...');

  const marketingUser = await prisma.user.findUnique({
    where: { email: 'marketing@reikisolar.com.co' },
  });

  if (!marketingUser) {
    throw new Error('Usuario marketing no encontrado');
  }

  // OKR 1: Generar leads calificados
  const okrMarketing1 = await prisma.oKR.create({
    data: {
      title: 'Generar leads calificados',
      description: 'Aumentar el número de leads calificados para el equipo comercial',
      area: 'MARKETING',
      period: 'TRIMESTRAL',
      startDate,
      endDate,
      ownerId: marketingUser.id,
      keyResults: {
        create: [
          {
            title: 'Generar 50 leads calificados por mes',
            description: 'Meta mensual de 50 leads calificados',
            type: 'NUMERICO',
            targetValue: 50,
            currentValue: 0,
            unit: 'leads/mes',
          },
          {
            title: 'Aumentar la tasa de conversión de visitantes a leads en 20%',
            description: 'Mejorar conversión del sitio web',
            type: 'PORCENTAJE',
            targetValue: 20,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Reducir el costo por lead (CPL) en 25%',
            description: 'Optimizar inversión en generación de leads',
            type: 'PORCENTAJE',
            targetValue: 25,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Aumentar la calidad de leads (tasa de conversión lead→oportunidad) en 30%',
            description: 'Mejorar scoring y calificación de leads',
            type: 'PORCENTAJE',
            targetValue: 30,
            currentValue: 0,
            unit: '%',
          },
        ],
      },
    },
    include: { keyResults: true },
  });

  console.log(`   ✅ OKR 1 creado: ${okrMarketing1.title}`);

  // OKR 2: Mejorar el ROI de las campañas
  const okrMarketing2 = await prisma.oKR.create({
    data: {
      title: 'Mejorar el ROI de las campañas',
      description: 'Maximizar el retorno de inversión en marketing',
      area: 'MARKETING',
      period: 'TRIMESTRAL',
      startDate,
      endDate,
      ownerId: marketingUser.id,
      keyResults: {
        create: [
          {
            title: 'Alcanzar ROI promedio de 300% en todas las campañas',
            description: 'ROI mínimo de 300%',
            type: 'PORCENTAJE',
            targetValue: 300,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Reducir el costo por adquisición (CAC) en 20%',
            description: 'Optimizar inversión por cliente adquirido',
            type: 'PORCENTAJE',
            targetValue: 20,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Aumentar el valor de vida del cliente (LTV) en 25%',
            description: 'Incrementar valor a largo plazo',
            type: 'PORCENTAJE',
            targetValue: 25,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Mejorar la tasa de conversión de campañas en 15%',
            description: 'Aumentar efectividad de campañas',
            type: 'PORCENTAJE',
            targetValue: 15,
            currentValue: 0,
            unit: '%',
          },
        ],
      },
    },
    include: { keyResults: true },
  });

  console.log(`   ✅ OKR 2 creado: ${okrMarketing2.title}`);

  // OKR 3: Construir marca y contenido
  const okrMarketing3 = await prisma.oKR.create({
    data: {
      title: 'Construir marca y contenido',
      description: 'Posicionar la marca y generar contenido de valor',
      area: 'MARKETING',
      period: 'TRIMESTRAL',
      startDate,
      endDate,
      ownerId: marketingUser.id,
      keyResults: {
        create: [
          {
            title: 'Publicar 12 piezas de contenido por mes',
            description: 'Blog, redes sociales, casos de estudio',
            type: 'NUMERICO',
            targetValue: 12,
            currentValue: 0,
            unit: 'piezas/mes',
          },
          {
            title: 'Aumentar el engagement en redes sociales en 40%',
            description: 'Mejorar interacción en redes',
            type: 'PORCENTAJE',
            targetValue: 40,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Aumentar el tráfico orgánico del sitio web en 50%',
            description: 'Crecimiento de tráfico SEO',
            type: 'PORCENTAJE',
            targetValue: 50,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Mejorar el NPS (Net Promoter Score) en 10 puntos',
            description: 'Aumentar satisfacción y recomendación',
            type: 'NUMERICO',
            targetValue: 10,
            currentValue: 0,
            unit: 'puntos',
          },
        ],
      },
    },
    include: { keyResults: true },
  });

  console.log(`   ✅ OKR 3 creado: ${okrMarketing3.title}`);

  // ============================================
  // ÁREA DIRECCIÓN
  // ============================================
  console.log('\n📊 Creando OKR del ÁREA DIRECCIÓN...');

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@reikisolar.com.co' },
  });

  if (!adminUser) {
    throw new Error('Usuario admin no encontrado');
  }

  // OKR 1: Crecimiento sostenible del negocio
  const okrDireccion1 = await prisma.oKR.create({
    data: {
      title: 'Crecimiento sostenible del negocio',
      description: 'Alcanzar crecimiento rentable y sostenible',
      area: 'DIRECCION',
      period: 'TRIMESTRAL',
      startDate,
      endDate,
      ownerId: adminUser.id,
      keyResults: {
        create: [
          {
            title: 'Aumentar ingresos en 30% trimestral',
            description: 'Crecimiento de ingresos Q1',
            type: 'PORCENTAJE',
            targetValue: 30,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Mantener margen de ganancia en 25%',
            description: 'Margen mínimo del 25%',
            type: 'PORCENTAJE',
            targetValue: 25,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Aumentar la base de clientes en 20%',
            description: 'Crecimiento de clientes activos',
            type: 'PORCENTAJE',
            targetValue: 20,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Mejorar la retención de clientes en 15%',
            description: 'Reducir churn y aumentar retención',
            type: 'PORCENTAJE',
            targetValue: 15,
            currentValue: 0,
            unit: '%',
          },
        ],
      },
    },
    include: { keyResults: true },
  });

  console.log(`   ✅ OKR 1 creado: ${okrDireccion1.title}`);

  // OKR 2: Optimizar operaciones
  const okrDireccion2 = await prisma.oKR.create({
    data: {
      title: 'Optimizar operaciones',
      description: 'Mejorar la eficiencia operativa en todas las áreas',
      area: 'DIRECCION',
      period: 'TRIMESTRAL',
      startDate,
      endDate,
      ownerId: adminUser.id,
      keyResults: {
        create: [
          {
            title: 'Reducir costos operativos en 15%',
            description: 'Optimización de costos',
            type: 'PORCENTAJE',
            targetValue: 15,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Mejorar la satisfacción del cliente (NPS) en 15 puntos',
            description: 'Aumentar Net Promoter Score',
            type: 'NUMERICO',
            targetValue: 15,
            currentValue: 0,
            unit: 'puntos',
          },
          {
            title: 'Aumentar la productividad del equipo en 20%',
            description: 'Mejorar eficiencia del equipo',
            type: 'PORCENTAJE',
            targetValue: 20,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Implementar 10 mejoras de procesos',
            description: 'Optimizaciones en todas las áreas',
            type: 'NUMERICO',
            targetValue: 10,
            currentValue: 0,
            unit: 'mejoras',
          },
        ],
      },
    },
    include: { keyResults: true },
  });

  console.log(`   ✅ OKR 2 creado: ${okrDireccion2.title}`);

  // OKR 3: Desarrollo del equipo
  const okrDireccion3 = await prisma.oKR.create({
    data: {
      title: 'Desarrollo del equipo',
      description: 'Construir un equipo de alto rendimiento',
      area: 'DIRECCION',
      period: 'TRIMESTRAL',
      startDate,
      endDate,
      ownerId: adminUser.id,
      keyResults: {
        create: [
          {
            title: 'Capacitar al 100% del equipo en habilidades clave',
            description: 'Capacitación completa del equipo',
            type: 'PORCENTAJE',
            targetValue: 100,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Mejorar la satisfacción del equipo en 20 puntos',
            description: 'Aumentar satisfacción laboral',
            type: 'NUMERICO',
            targetValue: 20,
            currentValue: 0,
            unit: 'puntos',
          },
          {
            title: 'Reducir la rotación de personal en 30%',
            description: 'Retener talento',
            type: 'PORCENTAJE',
            targetValue: 30,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Implementar programa de desarrollo profesional',
            description: 'Plan de carrera y desarrollo',
            type: 'NUMERICO',
            targetValue: 1,
            currentValue: 0,
            unit: 'programa',
          },
        ],
      },
    },
    include: { keyResults: true },
  });

  console.log(`   ✅ OKR 3 creado: ${okrDireccion3.title}`);

  console.log('');
  console.log('========================================');
  console.log('✅ OKR completos creados!');
  console.log('========================================');
  console.log(`Total OKR creados: 9`);
  console.log(`  - Comercial: 3 OKR`);
  console.log(`  - Marketing: 3 OKR`);
  console.log(`  - Dirección: 3 OKR`);
  console.log(`  - Administrativo: 3 OKR (ya existentes)`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error creando OKR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


