import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creando OKR del área administrativa...');

  // Obtener el usuario administrativo
  const adminUser = await prisma.user.findUnique({
    where: { email: 'dir.admon@reikisolar.com.co' },
  });

  if (!adminUser) {
    throw new Error('Usuario administrativo no encontrado. Ejecuta primero el seed principal.');
  }

  console.log(`✅ Usuario encontrado: ${adminUser.email}`);

  // Fechas para el trimestre actual
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-03-31');

  // ============================================
  // OKR 1: Crear una operación administrativa eficiente
  // ============================================
  console.log('');
  console.log('📋 Creando OKR 1: Operación administrativa eficiente...');

  const okr1 = await prisma.oKR.create({
    data: {
      title: 'Crear una operación administrativa eficiente',
      description: 'Establecer un sistema administrativo completamente ordenado y funcional.',
      area: 'ADMINISTRATIVO',
      period: 'TRIMESTRAL',
      startDate,
      endDate,
      ownerId: adminUser.id,
      keyResults: {
        create: [
          {
            title: 'Implementar el sistema documental con 100% de los archivos organizados',
            description: `Documentos requeridos (10 / 10 = 100%):
1. Estructura de carpetas maestro
2. Manual de nomenclatura de archivos
3. Carpeta de Clientes (plantilla)
4. Carpeta de Proveedores (plantilla)
5. Carpeta de Finanzas (plantilla)
6. Carpeta de Recursos Humanos (plantilla)
7. Carpeta de Permisos y Regulaciones
8. Carpeta de Contratos
9. Carpeta de Ingeniería / Técnicos
10. Respaldo automático activado

Cada documento vale 10%.`,
            type: 'PORCENTAJE',
            targetValue: 100,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Estandarizar 10 procesos administrativos clave',
            description: `Procesos requeridos (10 / 10 = 100%):
1. Proceso de gestión documental
2. Proceso de compras
3. Proceso de control de inventario administrativo
4. Proceso de verificación y registro de proveedores
5. Proceso de facturación
6. Proceso de cobranza
7. Proceso de reembolsos y gastos
8. Proceso de permisos y licencias
9. Proceso de onboarding de empleados
10. Proceso de control de vacaciones/asistencia

Cada proceso vale 10%.`,
            type: 'PORCENTAJE',
            targetValue: 100,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Responder a solicitudes internas en menos de 24 horas',
            description: `Elementos para medir cumplimiento (5 / 5 = 100%):
1. Registro semanal de solicitudes internas
2. Indicador de tiempo promedio de respuesta
3. Plantilla de solicitud interna
4. Dashboard simple (Excel/Notion)
5. Reporte mensual de desempeño

Cada elemento vale 20%.
BONUS: Si la respuesta promedio mensual < 24 h → +20%`,
            type: 'PORCENTAJE',
            targetValue: 100,
            currentValue: 0,
            unit: '%',
          },
        ],
      },
    },
    include: {
      keyResults: true,
    },
  });

  console.log(`   ✅ OKR 1 creado con ${okr1.keyResults.length} Key Results`);

  // ============================================
  // OKR 2: Profesionalizar la gestión financiera
  // ============================================
  console.log('');
  console.log('📋 Creando OKR 2: Profesionalizar la gestión financiera...');

  const okr2 = await prisma.oKR.create({
    data: {
      title: 'Profesionalizar la gestión financiera',
      description: 'Tener un control financiero preciso, predecible y ordenado.',
      area: 'ADMINISTRATIVO',
      period: 'TRIMESTRAL',
      startDate,
      endDate,
      ownerId: adminUser.id,
      keyResults: {
        create: [
          {
            title: 'Conciliaciones bancarias mensuales antes del día 5 de cada mes',
            description: `Documentos / entregables (5 / 5 = 100%):
1. Flujo de caja semanal
2. Formato de conciliación bancaria
3. Reportes financieros mensuales
4. Registro de ingresos/egresos
5. Dashboard financiero simple

Cada documento vale 20%.
BONUS: Si la conciliación se entrega antes del día 5 → +10%`,
            type: 'PORCENTAJE',
            targetValue: 100,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Emitir reporte financiero mensual sin retraso durante 3 meses consecutivos',
            description: `Entregables (3 / 3 = 100%):
1. Reporte del Mes 1
2. Reporte del Mes 2
3. Reporte del Mes 3

Cada mes vale 33.3%.`,
            type: 'PORCENTAJE',
            targetValue: 100,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Reducir 10% los costos mediante control de proveedores y compras',
            description: `Documentos necesarios (6 / 6 = 100%):
1. Base de proveedores homologados
2. Comparativo de precios mensual
3. Tabla histórica de costos
4. Informe de ahorros acumulados
5. Política de compras
6. Ordenes de compra estandarizadas

Cada documento vale 16.6%.
BONUS: Si se logra la reducción del 10% o más → +20%`,
            type: 'PORCENTAJE',
            targetValue: 100,
            currentValue: 0,
            unit: '%',
          },
        ],
      },
    },
    include: {
      keyResults: true,
    },
  });

  console.log(`   ✅ OKR 2 creado con ${okr2.keyResults.length} Key Results`);

  // ============================================
  // OKR 3: Estructurar Recursos Humanos
  // ============================================
  console.log('');
  console.log('📋 Creando OKR 3: Estructurar Recursos Humanos...');

  const okr3 = await prisma.oKR.create({
    data: {
      title: 'Estructurar Recursos Humanos',
      description: 'Construir una base sólida de procesos de RRHH desde cero.',
      area: 'ADMINISTRATIVO',
      period: 'TRIMESTRAL',
      startDate,
      endDate,
      ownerId: adminUser.id,
      keyResults: {
        create: [
          {
            title: 'Implementar checklist de onboarding y aplicarlo al 100% de los ingresos',
            description: `Documentos requeridos (5 / 5 = 100%):
1. Checklist de onboarding
2. Carta de bienvenida
3. Política de acceso y uso de herramientas
4. Contratos y documentos legales
5. Inducción general de la empresa

Cada documento vale 20%.`,
            type: 'PORCENTAJE',
            targetValue: 100,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Crear y documentar 6 políticas internas clave',
            description: `Políticas requeridas (6 / 6 = 100%):
1. Política de asistencia
2. Política de vacaciones
3. Política de permisos
4. Reglamento disciplinario básico
5. Manual de convivencia
6. Política de uso de equipos e información

Cada política vale ~16.6%.`,
            type: 'PORCENTAJE',
            targetValue: 100,
            currentValue: 0,
            unit: '%',
          },
          {
            title: 'Crear carpeta individual de personal para el 100% de los empleados',
            description: `Documentos por empleado (5 / 5 = 100%):
1. Contrato
2. Copia de identificación
3. Documentación personal (según país)
4. Hoja de datos / ficha del colaborador
5. Historial de evaluaciones y asistencias

Cada documento por empleado vale 20%.
Se promedia sobre el total de empleados.`,
            type: 'PORCENTAJE',
            targetValue: 100,
            currentValue: 0,
            unit: '%',
          },
        ],
      },
    },
    include: {
      keyResults: true,
    },
  });

  console.log(`   ✅ OKR 3 creado con ${okr3.keyResults.length} Key Results`);

  console.log('');
  console.log('========================================');
  console.log('✅ OKR del área administrativa creados!');
  console.log('========================================');
  console.log('');
  console.log(`Total OKR creados: 3`);
  console.log(`Total Key Results creados: ${okr1.keyResults.length + okr2.keyResults.length + okr3.keyResults.length}`);
  console.log('');
  console.log('OKR creados:');
  console.log(`  1. ${okr1.title}`);
  console.log(`  2. ${okr2.title}`);
  console.log(`  3. ${okr3.title}`);
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


