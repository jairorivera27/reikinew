import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  // Companies
  async createCompany(createCompanyDto: CreateCompanyDto) {
    return this.prisma.company.create({
      data: createCompanyDto,
      include: {
        contacts: true,
        opportunities: true,
      },
    });
  }

  // Crear cliente rápido (con contacto inicial)
  async createQuickCustomer(data: {
    companyName: string;
    contactName: string;
    email?: string;
    phone?: string;
    sector?: string;
    notes?: string;
  }) {
    const company = await this.prisma.company.create({
      data: {
        name: data.companyName,
        sector: data.sector,
        notes: data.notes,
        contacts: {
          create: {
            firstName: data.contactName.split(' ')[0] || data.contactName,
            lastName: data.contactName.split(' ').slice(1).join(' ') || '',
            email: data.email,
            phone: data.phone,
            isPrimary: true,
          },
        },
      },
      include: {
        contacts: true,
      },
    });

    return company;
  }

  async findAllCompanies() {
    return this.prisma.company.findMany({
      include: {
        contacts: true,
        opportunities: {
          include: {
            owner: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCompanyById(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        contacts: true,
        opportunities: {
          include: {
            owner: true,
            quotes: true,
          },
        },
        activities: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }

    return company;
  }

  async updateCompany(id: string, updateCompanyDto: UpdateCompanyDto) {
    await this.findCompanyById(id);
    return this.prisma.company.update({
      where: { id },
      data: updateCompanyDto,
    });
  }

  async deleteCompany(id: string) {
    await this.findCompanyById(id);
    return this.prisma.company.delete({
      where: { id },
    });
  }

  // Contacts
  async createContact(createContactDto: CreateContactDto) {
    return this.prisma.contact.create({
      data: createContactDto,
      include: {
        company: true,
      },
    });
  }

  async findAllContacts(companyId?: string) {
    return this.prisma.contact.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        company: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findContactById(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        company: true,
        activities: true,
      },
    });

    if (!contact) {
      throw new NotFoundException(`Contacto con ID ${id} no encontrado`);
    }

    return contact;
  }

  async updateContact(id: string, updateContactDto: UpdateContactDto) {
    await this.findContactById(id);
    return this.prisma.contact.update({
      where: { id },
      data: updateContactDto,
    });
  }

  async deleteContact(id: string) {
    await this.findContactById(id);
    return this.prisma.contact.delete({
      where: { id },
    });
  }

  // Opportunities
  async createOpportunity(createOpportunityDto: CreateOpportunityDto) {
    return this.prisma.opportunity.create({
      data: createOpportunityDto,
      include: {
        company: true,
        contact: true,
        owner: true,
        campaign: true,
      },
    });
  }

  async findAllOpportunities(filters?: {
    stage?: string;
    ownerId?: string;
    companyId?: string;
  }) {
    return this.prisma.opportunity.findMany({
      where: {
        ...(filters?.stage && { stage: filters.stage as any }),
        ...(filters?.ownerId && { ownerId: filters.ownerId }),
        ...(filters?.companyId && { companyId: filters.companyId }),
      },
      include: {
        company: true,
        contact: true,
        owner: true,
        campaign: true,
        quotes: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOpportunityById(id: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        company: true,
        contact: true,
        owner: true,
        campaign: true,
        activities: {
          include: {
            user: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        quotes: {
          include: {
            items: true,
          },
        },
        contract: true,
      },
    });

    if (!opportunity) {
      throw new NotFoundException(`Oportunidad con ID ${id} no encontrada`);
    }

    return opportunity;
  }

  async updateOpportunity(id: string, updateOpportunityDto: UpdateOpportunityDto, userId?: string) {
    const oldOpportunity = await this.findOpportunityById(id);
    
    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: updateOpportunityDto,
      include: {
        company: true,
        owner: true,
      },
    });

    // Registrar cambios en AuditLog
    if (userId) {
      await this.logChanges('OPPORTUNITY', id, oldOpportunity, updateOpportunityDto, userId);
    }

    return updated;
  }

  async deleteOpportunity(id: string) {
    await this.findOpportunityById(id);
    return this.prisma.opportunity.delete({
      where: { id },
    });
  }

  // Pipeline metrics
  async getPipelineMetrics() {
    const opportunities = await this.prisma.opportunity.findMany({
      include: {
        company: true,
        owner: true,
      },
    });

    const byStage = opportunities.reduce((acc, opp) => {
      acc[opp.stage] = (acc[opp.stage] || 0) + opp.estimatedValue;
      return acc;
    }, {} as Record<string, number>);

    const totalValue = opportunities.reduce((sum, opp) => sum + opp.estimatedValue, 0);
    const weightedValue = opportunities.reduce(
      (sum, opp) => sum + opp.estimatedValue * (opp.probability / 100),
      0,
    );

    return {
      byStage,
      totalValue,
      weightedValue,
      totalCount: opportunities.length,
    };
  }

  // Métricas de Cotizaciones
  async getQuoteMetrics() {
    const quotes = await this.prisma.quote.findMany({
      include: {
        opportunity: {
          include: {
            company: true,
          },
        },
        viewLogs: true,
      },
    });

    const byStatus = quotes.reduce((acc, quote) => {
      acc[quote.status] = (acc[quote.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalValue = quotes.reduce((sum, quote) => sum + quote.total, 0);
    const sentQuotes = quotes.filter((q) => q.sentAt !== null).length;
    const viewedQuotes = quotes.filter((q) => q.viewLogs.length > 0).length;
    const acceptedQuotes = quotes.filter((q) => q.status === 'ACEPTADA').length;

    const conversionRate = sentQuotes > 0 ? (acceptedQuotes / sentQuotes) * 100 : 0;
    const viewRate = sentQuotes > 0 ? (viewedQuotes / sentQuotes) * 100 : 0;

    // Tiempo promedio de respuesta
    const quotesWithResponse = quotes.filter((q) => q.sentAt && q.viewedAt);
    const avgResponseTime = quotesWithResponse.length > 0
      ? quotesWithResponse.reduce((sum, q) => {
          const time = new Date(q.viewedAt!).getTime() - new Date(q.sentAt!).getTime();
          return sum + time / (1000 * 60 * 60); // En horas
        }, 0) / quotesWithResponse.length
      : 0;

    return {
      total: quotes.length,
      byStatus,
      totalValue,
      sent: sentQuotes,
      viewed: viewedQuotes,
      accepted: acceptedQuotes,
      conversionRate: Math.round(conversionRate * 100) / 100,
      viewRate: Math.round(viewRate * 100) / 100,
      avgResponseTimeHours: Math.round(avgResponseTime * 100) / 100,
    };
  }

  // Métricas de Emails/Correos
  async getEmailMetrics() {
    const activities = await this.prisma.activity.findMany({
      where: {
        type: 'EMAIL',
      },
      include: {
        opportunity: true,
        company: true,
        contact: true,
      },
    });

    const sent = activities.length;
    const responded = activities.filter((a) => a.result && a.result.includes('RESPONDIDO')).length;
    const opened = activities.filter((a) => a.result && a.result.includes('ABIERTO')).length;

    const responseRate = sent > 0 ? (responded / sent) * 100 : 0;
    const openRate = sent > 0 ? (opened / sent) * 100 : 0;

    // Por oportunidad
    const byOpportunity = activities.reduce((acc, act) => {
      if (act.opportunityId) {
        acc[act.opportunityId] = (acc[act.opportunityId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      total: sent,
      responded,
      opened,
      responseRate: Math.round(responseRate * 100) / 100,
      openRate: Math.round(openRate * 100) / 100,
      byOpportunity,
    };
  }

  // Métricas de Prospectos
  async getProspectMetrics() {
    const opportunities = await this.prisma.opportunity.findMany({
      where: {
        stage: {
          in: ['PROSPECCION', 'CALIFICACION'],
        },
      },
      include: {
        company: true,
        activities: true,
      },
    });

    const total = opportunities.length;
    const qualified = opportunities.filter((o) => o.stage === 'CALIFICACION').length;
    const converted = opportunities.filter((o) => o.stage !== 'PROSPECCION' && o.stage !== 'CALIFICACION').length;

    const qualificationRate = total > 0 ? (qualified / total) * 100 : 0;
    const conversionRate = total > 0 ? (converted / total) * 100 : 0;

    // Tiempo promedio de calificación
    const qualifiedOpps = opportunities.filter((o) => o.stage === 'CALIFICACION');
    const avgQualificationTime = qualifiedOpps.length > 0
      ? qualifiedOpps.reduce((sum, opp) => {
          const activities = opp.activities.filter((a) => a.type === 'LLAMADA' || a.type === 'REUNION');
          if (activities.length > 0) {
            const firstActivity = activities[0];
            const time = new Date(opp.updatedAt).getTime() - new Date(opp.createdAt).getTime();
            return sum + time / (1000 * 60 * 60 * 24); // En días
          }
          return sum;
        }, 0) / qualifiedOpps.length
      : 0;

    // Por fuente
    const bySource = opportunities.reduce((acc, opp) => {
      const source = opp.source || 'OTRO';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      qualified,
      converted,
      qualificationRate: Math.round(qualificationRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgQualificationTimeDays: Math.round(avgQualificationTime * 100) / 100,
      bySource,
    };
  }

  // Métricas de Clientes
  async getCustomerMetrics() {
    const companies = await this.prisma.company.findMany({
      include: {
        opportunities: {
          where: {
            stage: 'GANADA',
          },
        },
        contacts: true,
      },
    });

    const total = companies.length;
    const withOpportunities = companies.filter((c) => c.opportunities.length > 0).length;
    const activeCustomers = companies.filter((c) => {
      const recentOpps = c.opportunities.filter((o) => {
        const oppDate = o.actualCloseDate || o.createdAt;
        const daysSince = (new Date().getTime() - new Date(oppDate).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 90; // Últimos 90 días
      });
      return recentOpps.length > 0;
    }).length;

    const totalContacts = companies.reduce((sum, c) => sum + c.contacts.length, 0);
    const avgContactsPerCompany = total > 0 ? totalContacts / total : 0;

    return {
      total,
      withOpportunities,
      activeCustomers,
      totalContacts,
      avgContactsPerCompany: Math.round(avgContactsPerCompany * 100) / 100,
    };
  }

  // Activities
  async createActivity(createActivityDto: CreateActivityDto) {
    return this.prisma.activity.create({
      data: createActivityDto,
      include: {
        user: true,
        opportunity: true,
        company: true,
        contact: true,
      },
    });
  }

  async findAllActivities(filters?: {
    opportunityId?: string;
    userId?: string;
    companyId?: string;
  }) {
    return this.prisma.activity.findMany({
      where: {
        ...(filters?.opportunityId && { opportunityId: filters.opportunityId }),
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.companyId && { companyId: filters.companyId }),
      },
      include: {
        user: true,
        opportunity: true,
        company: true,
        contact: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActivityById(id: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: {
        user: true,
        opportunity: true,
        company: true,
        contact: true,
      },
    });

    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada`);
    }

    return activity;
  }

  async updateActivity(id: string, updateActivityDto: UpdateActivityDto) {
    await this.findActivityById(id);
    return this.prisma.activity.update({
      where: { id },
      data: updateActivityDto,
    });
  }

  async deleteActivity(id: string) {
    await this.findActivityById(id);
    return this.prisma.activity.delete({
      where: { id },
    });
  }

  // Notes
  async createNote(createNoteDto: any, userId: string) {
    return this.prisma.note.create({
      data: {
        ...createNoteDto,
        userId,
      },
      include: {
        user: true,
        opportunity: true,
        company: true,
        contact: true,
      },
    });
  }

  async findAllNotes(filters?: {
    opportunityId?: string;
    companyId?: string;
    contactId?: string;
    userId?: string;
  }) {
    return this.prisma.note.findMany({
      where: {
        ...(filters?.opportunityId && { opportunityId: filters.opportunityId }),
        ...(filters?.companyId && { companyId: filters.companyId }),
        ...(filters?.contactId && { contactId: filters.contactId }),
        ...(filters?.userId && { userId: filters.userId }),
      },
      include: {
        user: true,
        opportunity: true,
        company: true,
        contact: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateNote(id: string, updateNoteDto: any) {
    return this.prisma.note.update({
      where: { id },
      data: updateNoteDto,
      include: {
        user: true,
      },
    });
  }

  async deleteNote(id: string) {
    return this.prisma.note.delete({
      where: { id },
    });
  }

  // Reminders
  async createReminder(createReminderDto: any, userId: string) {
    return this.prisma.reminder.create({
      data: {
        ...createReminderDto,
        userId,
        dueDate: new Date(createReminderDto.dueDate),
      },
      include: {
        user: true,
        opportunity: true,
        company: true,
        contact: true,
      },
    });
  }

  async findAllReminders(filters?: {
    opportunityId?: string;
    companyId?: string;
    contactId?: string;
    userId?: string;
    isCompleted?: boolean;
  }) {
    return this.prisma.reminder.findMany({
      where: {
        ...(filters?.opportunityId && { opportunityId: filters.opportunityId }),
        ...(filters?.companyId && { companyId: filters.companyId }),
        ...(filters?.contactId && { contactId: filters.contactId }),
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.isCompleted !== undefined && { isCompleted: filters.isCompleted }),
      },
      include: {
        user: true,
        opportunity: true,
        company: true,
        contact: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async updateReminder(id: string, updateReminderDto: any) {
    const updateData: any = { ...updateReminderDto };
    if (updateReminderDto.dueDate) {
      updateData.dueDate = new Date(updateReminderDto.dueDate);
    }
    if (updateReminderDto.completedAt) {
      updateData.completedAt = new Date(updateReminderDto.completedAt);
    }
    if (updateReminderDto.isCompleted && !updateData.completedAt) {
      updateData.completedAt = new Date();
    }

    return this.prisma.reminder.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
      },
    });
  }

  async deleteReminder(id: string) {
    return this.prisma.reminder.delete({
      where: { id },
    });
  }

  // Customer Journey / Timeline
  async getCustomerJourney(entityType: string, entityId: string) {
    const activities = await this.prisma.activity.findMany({
      where: {
        ...(entityType === 'OPPORTUNITY' && { opportunityId: entityId }),
        ...(entityType === 'COMPANY' && { companyId: entityId }),
        ...(entityType === 'CONTACT' && { contactId: entityId }),
      },
      include: {
        user: true,
        opportunity: true,
        company: true,
        contact: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const notes = await this.prisma.note.findMany({
      where: {
        ...(entityType === 'OPPORTUNITY' && { opportunityId: entityId }),
        ...(entityType === 'COMPANY' && { companyId: entityId }),
        ...(entityType === 'CONTACT' && { contactId: entityId }),
      },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const reminders = await this.prisma.reminder.findMany({
      where: {
        ...(entityType === 'OPPORTUNITY' && { opportunityId: entityId }),
        ...(entityType === 'COMPANY' && { companyId: entityId }),
        ...(entityType === 'CONTACT' && { contactId: entityId }),
      },
      include: {
        user: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    // Combinar y ordenar por fecha
    const timeline = [
      ...activities.map((a) => ({ type: 'ACTIVITY', data: a, date: a.createdAt })),
      ...notes.map((n) => ({ type: 'NOTE', data: n, date: n.createdAt })),
      ...reminders.map((r) => ({ type: 'REMINDER', data: r, date: r.dueDate })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return timeline;
  }

  // Forecast y Proyecciones
  async getForecast(period: 'MONTHLY' | 'QUARTERLY' = 'MONTHLY') {
    const opportunities = await this.prisma.opportunity.findMany({
      where: {
        stage: {
          notIn: ['PERDIDA', 'GANADA'],
        },
      },
      include: {
        owner: true,
        company: true,
      },
    });

    const now = new Date();
    const endDate = new Date(now);
    if (period === 'MONTHLY') {
      endDate.setMonth(now.getMonth() + 1);
    } else {
      endDate.setMonth(now.getMonth() + 3);
    }

    // Forecast basado en probabilidad
    const forecast = opportunities
      .filter((opp) => {
        if (!opp.expectedCloseDate) return false;
        const closeDate = new Date(opp.expectedCloseDate);
        return closeDate <= endDate && closeDate >= now;
      })
      .reduce(
        (acc, opp) => {
          const weightedValue = opp.estimatedValue * (opp.probability / 100);
          acc.total += opp.estimatedValue;
          acc.weighted += weightedValue;
          acc.count += 1;
          return acc;
        },
        { total: 0, weighted: 0, count: 0 },
      );

    // Análisis por etapa
    const byStage = opportunities.reduce((acc, opp) => {
      if (!acc[opp.stage]) {
        acc[opp.stage] = { total: 0, weighted: 0, count: 0 };
      }
      const weightedValue = opp.estimatedValue * (opp.probability / 100);
      acc[opp.stage].total += opp.estimatedValue;
      acc[opp.stage].weighted += weightedValue;
      acc[opp.stage].count += 1;
      return acc;
    }, {} as Record<string, { total: number; weighted: number; count: number }>);

    return {
      period,
      forecast,
      byStage,
      opportunities: opportunities.length,
    };
  }

  // Análisis de Ciclo de Ventas
  async getSalesCycleAnalysis() {
    const opportunities = await this.prisma.opportunity.findMany({
      where: {
        actualCloseDate: { not: null },
        stage: 'GANADA',
      },
      include: {
        activities: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const cycleTimes: Record<string, number[]> = {};

    for (const opp of opportunities) {
      if (!opp.createdAt || !opp.actualCloseDate) continue;

      const totalDays =
        (new Date(opp.actualCloseDate).getTime() - new Date(opp.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);

      // Calcular tiempo por etapa basado en actividades
      const stageChanges = opp.activities.filter((a) => a.type === 'NOTA' && a.result?.includes('STAGE'));
      // Simplificado: tiempo total / número de etapas
      const avgDaysPerStage = totalDays / 5; // Asumiendo 5 etapas promedio

      if (!cycleTimes[opp.stage]) {
        cycleTimes[opp.stage] = [];
      }
      cycleTimes[opp.stage].push(totalDays);
    }

    const analysis: Record<string, any> = {};
    for (const [stage, times] of Object.entries(cycleTimes)) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      analysis[stage] = {
        average: Math.round(avg),
        min: Math.round(min),
        max: Math.round(max),
        count: times.length,
      };
    }

    const overallAvg =
      opportunities.length > 0
        ? opportunities.reduce((sum, opp) => {
            if (!opp.createdAt || !opp.actualCloseDate) return sum;
            const days =
              (new Date(opp.actualCloseDate).getTime() - new Date(opp.createdAt).getTime()) /
              (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / opportunities.length
        : 0;

    return {
      overallAverage: Math.round(overallAvg),
      byStage: analysis,
      totalAnalyzed: opportunities.length,
    };
  }

  // AuditLog - Registrar cambios
  private async logChanges(
    entityType: string,
    entityId: string,
    oldData: any,
    newData: any,
    userId: string,
  ) {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    for (const [key, newValue] of Object.entries(newData)) {
      if (oldData[key] !== newValue && key !== 'updatedAt') {
        changes.push({
          field: key,
          oldValue: oldData[key],
          newValue: newValue,
        });
      }
    }

    // Registrar cada cambio
    for (const change of changes) {
      await this.prisma.auditLog.create({
        data: {
          entityType,
          entityId,
          action: 'UPDATE',
          fieldName: change.field,
          oldValue: change.oldValue ? String(change.oldValue) : null,
          newValue: change.newValue ? String(change.newValue) : null,
          userId,
        },
      });
    }

    // Si cambió el stage, registrar como acción especial
    if (newData.stage && oldData.stage !== newData.stage) {
      await this.prisma.auditLog.create({
        data: {
          entityType,
          entityId,
          action: 'STAGE_CHANGE',
          fieldName: 'stage',
          oldValue: oldData.stage,
          newValue: newData.stage,
          userId,
        },
      });
    }
  }

  // Obtener historial de cambios
  async getAuditLog(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}


