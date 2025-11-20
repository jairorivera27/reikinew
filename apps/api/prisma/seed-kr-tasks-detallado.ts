import { PrismaClient } from '@prisma/client';
import { TaskStatus } from '../src/common/types/enums';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creando tareas detalladas para los Key Results...');

  // Obtener todos los Key Results del área administrativa
  const okrs = await prisma.oKR.findMany({
    where: {
      area: 'ADMINISTRATIVO',
      isActive: true,
    },
    include: {
      keyResults: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (okrs.length === 0) {
    console.log('⚠️  No se encontraron OKR del área administrativa.');
    return;
  }

  // Mapeo de tareas por Key Result (basado en el orden de creación)
  const tasksByKR: Record<string, string[]> = {
    // OKR 1 - KR 1: Sistema documental
    'kr1_1': [
      'Estructura de carpetas maestro',
      'Manual de nomenclatura de archivos',
      'Carpeta de Clientes (plantilla)',
      'Carpeta de Proveedores (plantilla)',
      'Carpeta de Finanzas (plantilla)',
      'Carpeta de Recursos Humanos (plantilla)',
      'Carpeta de Permisos y Regulaciones',
      'Carpeta de Contratos',
      'Carpeta de Ingeniería / Técnicos',
      'Respaldo automático activado',
    ],
    // OKR 1 - KR 2: Procesos administrativos
    'kr1_2': [
      'Proceso de gestión documental',
      'Proceso de compras',
      'Proceso de control de inventario administrativo',
      'Proceso de verificación y registro de proveedores',
      'Proceso de facturación',
      'Proceso de cobranza',
      'Proceso de reembolsos y gastos',
      'Proceso de permisos y licencias',
      'Proceso de onboarding de empleados',
      'Proceso de control de vacaciones/asistencia',
    ],
    // OKR 1 - KR 3: Solicitudes internas
    'kr1_3': [
      'Registro semanal de solicitudes internas',
      'Indicador de tiempo promedio de respuesta',
      'Plantilla de solicitud interna',
      'Dashboard simple (Excel/Notion)',
      'Reporte mensual de desempeño',
    ],
    // OKR 2 - KR 1: Conciliaciones bancarias
    'kr2_1': [
      'Flujo de caja semanal',
      'Formato de conciliación bancaria',
      'Reportes financieros mensuales',
      'Registro de ingresos/egresos',
      'Dashboard financiero simple',
    ],
    // OKR 2 - KR 2: Reportes financieros
    'kr2_2': [
      'Reporte del Mes 1',
      'Reporte del Mes 2',
      'Reporte del Mes 3',
    ],
    // OKR 2 - KR 3: Reducción de costos
    'kr2_3': [
      'Base de proveedores homologados',
      'Comparativo de precios mensual',
      'Tabla histórica de costos',
      'Informe de ahorros acumulados',
      'Política de compras',
      'Ordenes de compra estandarizadas',
    ],
    // OKR 3 - KR 1: Onboarding
    'kr3_1': [
      'Checklist de onboarding',
      'Carta de bienvenida',
      'Política de acceso y uso de herramientas',
      'Contratos y documentos legales',
      'Inducción general de la empresa',
    ],
    // OKR 3 - KR 2: Políticas internas
    'kr3_2': [
      'Política de asistencia',
      'Política de vacaciones',
      'Política de permisos',
      'Reglamento disciplinario básico',
      'Manual de convivencia',
      'Política de uso de equipos e información',
    ],
    // OKR 3 - KR 3: Carpetas de personal
    'kr3_3': [
      'Contrato',
      'Copia de identificación',
      'Documentación personal (según país)',
      'Hoja de datos / ficha del colaborador',
      'Historial de evaluaciones y asistencias',
    ],
  };

  let totalTasks = 0;
  let krIndex = 0;

  for (const okr of okrs) {
    console.log(`\n📋 OKR: ${okr.title}`);

    for (const kr of okr.keyResults) {
      const key = `kr${okrs.indexOf(okr) + 1}_${okr.keyResults.indexOf(kr) + 1}`;
      const tasks = tasksByKR[key] || [];

      if (tasks.length === 0) {
        console.log(`  ⚠️  ${kr.title}: No hay tareas definidas`);
        continue;
      }

      console.log(`  📌 ${kr.title} (${tasks.length} tareas)`);

      // Calcular el peso de cada tarea
      const weight = 100 / tasks.length;

      for (let i = 0; i < tasks.length; i++) {
        const taskTitle = tasks[i];

        // Verificar si la tarea ya existe
        const existingTask = await prisma.kRTask.findFirst({
          where: {
            krId: kr.id,
            title: taskTitle,
          },
        });

        if (existingTask) {
          console.log(`    ⏭️  Ya existe: ${taskTitle}`);
          continue;
        }

        await prisma.kRTask.create({
          data: {
            krId: kr.id,
            title: taskTitle,
            status: TaskStatus.PENDIENTE,
            weight: weight,
            order: i + 1,
          },
        });

        console.log(`    ✅ ${i + 1}. ${taskTitle}`);
        totalTasks++;
      }

      // Actualizar el progreso del KR
      await updateKrProgress(kr.id);
    }
  }

  console.log('');
  console.log('========================================');
  console.log('✅ Tareas creadas exitosamente!');
  console.log('========================================');
  console.log(`Total tareas creadas: ${totalTasks}`);
  console.log('');
}

async function updateKrProgress(krId: string) {
  const kr = await prisma.keyResult.findUnique({
    where: { id: krId },
    include: { tasks: true },
  });

  if (!kr || !kr.tasks || kr.tasks.length === 0) {
    return;
  }

  const totalWeight = kr.tasks.reduce((sum, task) => sum + task.weight, 0);
  const completedWeight = kr.tasks
    .filter((task) => task.status === TaskStatus.COMPLETADO)
    .reduce((sum, task) => sum + task.weight, 0);

  const progress = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;

  await prisma.keyResult.update({
    where: { id: krId },
    data: {
      currentValue: Math.round(progress * 100) / 100,
    },
  });
}

main()
  .catch((e) => {
    console.error('❌ Error creando tareas:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


