import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creando OKR adicionales para el área COMERCIAL...');

  const comercialUser = await prisma.user.findUnique({
    where: { email: 'comercial@reikisolar.com.co' },
  });

  if (!comercialUser) {
    throw new Error('Usuario comercial no encontrado');
  }

  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-03-31');

  // OKR 4: Optimizar gestión de cotizaciones
  const okrComercial4 = await prisma.oKR.create({
    data: {
      title: 'Optimizar gestión de cotizaciones',
      description: 'Mejorar la eficiencia y efectividad del proceso de cotizaciones',
      area: 'COMERCIAL',
      period: 'TRIMESTRAL',
      startDate,
      endDate,
      ownerId: comercialUser.id,
      keyResults: {
        create: [
          {
            title: 'Generar 30 cotizaciones por mes',
            description: 'Meta mensual de cotizaciones generadas',
            type: 'NUMERICO',
            targetValue: 30,
            currentValue: 0,
            unit: 'cotizaciones/mes',
          },
          {
            title: 'Aumentar tasa de conversión de cotizaciones a oportunidades ganadas en 20%',
            description: 'Mejorar efectividad de las cotizaciones',
            type: 'PORCENTAJE',
            targetValue: 20,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Reducir tiempo de respuesta de cotizaciones a menos de 48 horas',
            description: 'Tiempo desde solicitud hasta envío de cotización',
            type: 'NUMERICO',
            targetValue: 48,
            currentValue: 0,
            unit: 'horas',
          },
          {
            title: 'Aumentar tasa de apertura de cotizaciones enviadas en 30%',
            description: 'Tracking de visualización de cotizaciones',
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

  console.log(`   ✅ OKR 4 creado: ${okrComercial4.title}`);

  // OKR 5: Mejorar comunicación y seguimiento
  const okrComercial5 = await prisma.oKR.create({
    data: {
      title: 'Mejorar comunicación y seguimiento',
      description: 'Optimizar la comunicación con clientes y prospectos',
      area: 'COMERCIAL',
      period: 'TRIMESTRAL',
      startDate,
      endDate,
      ownerId: comercialUser.id,
      keyResults: {
        create: [
          {
            title: 'Enviar 100 correos de seguimiento por mes',
            description: 'Comunicación activa con clientes y prospectos',
            type: 'NUMERICO',
            targetValue: 100,
            currentValue: 0,
            unit: 'correos/mes',
          },
          {
            title: 'Aumentar tasa de respuesta de correos en 25%',
            description: 'Mejorar engagement en comunicaciones',
            type: 'PORCENTAJE',
            targetValue: 25,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Realizar 50 llamadas de seguimiento por mes',
            description: 'Contacto telefónico con clientes y prospectos',
            type: 'NUMERICO',
            targetValue: 50,
            currentValue: 0,
            unit: 'llamadas/mes',
          },
          {
            title: 'Registrar 100% de las interacciones en el CRM',
            description: 'Trazabilidad completa de comunicaciones',
            type: 'PORCENTAJE',
            targetValue: 100,
            currentValue: 0,
            unit: '%',
          },
        ],
      },
    },
    include: { keyResults: true },
  });

  console.log(`   ✅ OKR 5 creado: ${okrComercial5.title}`);

  // OKR 6: Gestionar y calificar prospectos
  const okrComercial6 = await prisma.oKR.create({
    data: {
      title: 'Gestionar y calificar prospectos',
      description: 'Mejorar la gestión y calificación de prospectos',
      area: 'COMERCIAL',
      period: 'TRIMESTRAL',
      startDate,
      endDate,
      ownerId: comercialUser.id,
      keyResults: {
        create: [
          {
            title: 'Calificar 40 prospectos por mes',
            description: 'Prospectos calificados y convertidos a oportunidades',
            type: 'NUMERICO',
            targetValue: 40,
            currentValue: 0,
            unit: 'prospectos/mes',
          },
          {
            title: 'Aumentar tasa de conversión de prospectos a oportunidades en 30%',
            description: 'Mejorar calidad de calificación',
            type: 'PORCENTAJE',
            targetValue: 30,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Reducir tiempo de calificación de prospectos a menos de 5 días',
            description: 'Proceso ágil de calificación',
            type: 'NUMERICO',
            targetValue: 5,
            currentValue: 0,
            unit: 'días',
          },
          {
            title: 'Implementar sistema de scoring de prospectos',
            description: 'Sistema automatizado de calificación',
            type: 'NUMERICO',
            targetValue: 1,
            currentValue: 0,
            unit: 'sistema',
          },
        ],
      },
    },
    include: { keyResults: true },
  });

  console.log(`   ✅ OKR 6 creado: ${okrComercial6.title}`);

  console.log('');
  console.log('========================================');
  console.log('✅ OKR adicionales del área COMERCIAL creados!');
  console.log('========================================');
  console.log(`Total OKR Comercial: 6 (3 originales + 3 nuevos)`);
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


