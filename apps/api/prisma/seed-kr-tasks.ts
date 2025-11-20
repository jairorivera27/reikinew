import { PrismaClient } from '@prisma/client';
import { TaskStatus } from '../src/common/types/enums';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creando tareas para los Key Results del área administrativa...');

  // Obtener todos los Key Results del área administrativa
  const okrs = await prisma.oKR.findMany({
    where: {
      area: 'ADMINISTRATIVO',
      isActive: true,
    },
    include: {
      keyResults: true,
    },
  });

  if (okrs.length === 0) {
    console.log('⚠️  No se encontraron OKR del área administrativa. Ejecuta primero seed-okr-administrativo.ts');
    return;
  }

  let totalTasks = 0;

  for (const okr of okrs) {
    console.log(`\n📋 Procesando OKR: ${okr.title}`);

    for (const kr of okr.keyResults) {
      console.log(`  📌 Key Result: ${kr.title}`);

      // Extraer tareas de la descripción
      const tasks = extractTasksFromDescription(kr.title, kr.description || '');

      if (tasks.length === 0) {
        console.log(`    ⚠️  No se encontraron tareas en la descripción`);
        continue;
      }

      // Calcular el peso de cada tarea (distribución equitativa)
      const weight = 100 / tasks.length;

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        
        // Verificar si la tarea ya existe
        const existingTask = await prisma.kRTask.findFirst({
          where: {
            krId: kr.id,
            title: task,
          },
        });

        if (existingTask) {
          console.log(`    ⏭️  Tarea ya existe: ${task}`);
          continue;
        }

        await prisma.kRTask.create({
          data: {
            krId: kr.id,
            title: task,
            status: TaskStatus.PENDIENTE,
            weight: weight,
            order: i + 1,
          },
        });

        console.log(`    ✅ Tarea creada: ${task}`);
        totalTasks++;
      }
    }
  }

  // Actualizar el progreso de todos los KRs
  console.log('\n🔄 Actualizando progreso de Key Results...');
  for (const okr of okrs) {
    for (const kr of okr.keyResults) {
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

function extractTasksFromDescription(krTitle: string, description: string): string[] {
  const tasks: string[] = [];

  // Patrones para extraer tareas numeradas
  const patterns = [
    /(\d+)\.\s*([^\n]+)/g, // 1. Tarea
    /^(\d+)\.\s*([^\n]+)$/gm, // 1. Tarea (multilínea)
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(description)) !== null) {
      const task = match[2].trim();
      if (task && !task.includes('%') && !task.includes('Cada')) {
        tasks.push(task);
      }
    }
  }

  // Si no se encontraron tareas numeradas, intentar extraer de listas
  if (tasks.length === 0) {
    const lines = description.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.length > 5 && !trimmed.includes('%') && !trimmed.includes('Cada')) {
        // Verificar si parece una tarea (no es un encabezado)
        if (!trimmed.includes('requeridos') && !trimmed.includes('Entregables') && !trimmed.includes('Documentos')) {
          tasks.push(trimmed);
        }
      }
    }
  }

  return tasks;
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


