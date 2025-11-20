import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus } from '../common/types/enums';

@Injectable()
export class CrmTemplatesService {
  constructor(private prisma: PrismaService) {}

  // Plantilla de tareas para Customer Journey
  async createCustomerJourneyTasks(opportunityId: string, userId: string) {
    const tasks = [
      {
        title: 'Contacto inicial con el cliente',
        description: 'Primer contacto para entender necesidades',
        type: 'LLAMADA',
        scheduledDate: new Date(),
      },
      {
        title: 'Reunión de diagnóstico',
        description: 'Reunión para analizar requerimientos',
        type: 'REUNION',
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // +3 días
      },
      {
        title: 'Envío de propuesta/cotización',
        description: 'Preparar y enviar propuesta formal',
        type: 'EMAIL',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 días
      },
      {
        title: 'Seguimiento de propuesta',
        description: 'Seguimiento después de enviar propuesta',
        type: 'LLAMADA',
        scheduledDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // +10 días
      },
      {
        title: 'Negociación y ajustes',
        description: 'Reunión de negociación si hay ajustes',
        type: 'REUNION',
        scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 días
      },
      {
        title: 'Cierre y firma de contrato',
        description: 'Finalizar negociación y firmar contrato',
        type: 'REUNION',
        scheduledDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // +21 días
      },
    ];

    const createdActivities = [];
    for (const task of tasks) {
      const activity = await this.prisma.activity.create({
        data: {
          opportunityId,
          userId,
          type: task.type,
          title: task.title,
          description: task.description,
          scheduledDate: task.scheduledDate,
        },
      });
      createdActivities.push(activity);
    }

    return createdActivities;
  }

  // Plantilla de tareas para asegurar el negocio
  async createBusinessSecuringTasks(opportunityId: string, userId: string) {
    const tasks = [
      {
        title: 'Verificar viabilidad técnica',
        description: 'Confirmar que el proyecto es técnicamente viable',
        type: 'TAREA',
        scheduledDate: new Date(),
      },
      {
        title: 'Validar presupuesto del cliente',
        description: 'Confirmar que el cliente tiene presupuesto aprobado',
        type: 'LLAMADA',
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Identificar tomador de decisión',
        description: 'Confirmar quién tiene autoridad para aprobar',
        type: 'REUNION',
        scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Presentar caso de éxito similar',
        description: 'Mostrar casos de éxito para generar confianza',
        type: 'EMAIL',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Resolver objeciones',
        description: 'Abordar cualquier objeción o preocupación',
        type: 'REUNION',
        scheduledDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Confirmar términos y condiciones',
        description: 'Revisar y confirmar todos los términos',
        type: 'LLAMADA',
        scheduledDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Solicitar compromiso formal',
        description: 'Obtener compromiso verbal o escrito',
        type: 'REUNION',
        scheduledDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
    ];

    const createdActivities = [];
    for (const task of tasks) {
      const activity = await this.prisma.activity.create({
        data: {
          opportunityId,
          userId,
          type: task.type,
          title: task.title,
          description: task.description,
          scheduledDate: task.scheduledDate,
        },
      });
      createdActivities.push(activity);
    }

    return createdActivities;
  }

  // Plantilla de recordatorios para seguimiento
  async createFollowUpReminders(opportunityId: string, userId: string) {
    const reminders = [
      {
        title: 'Seguimiento de propuesta enviada',
        description: 'Verificar si el cliente ha revisado la propuesta',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // +3 días
      },
      {
        title: 'Recordatorio de seguimiento',
        description: 'Seguimiento activo de la oportunidad',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 días
      },
      {
        title: 'Verificar estado de la negociación',
        description: 'Confirmar avances en la negociación',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 días
      },
    ];

    const createdReminders = [];
    for (const reminder of reminders) {
      const created = await this.prisma.reminder.create({
        data: {
          opportunityId,
          userId,
          title: reminder.title,
          description: reminder.description,
          dueDate: reminder.dueDate,
        },
      });
      createdReminders.push(created);
    }

    return createdReminders;
  }
}

