import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { FeedbackStatus } from '../common/types/enums';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async create(createFeedbackDto: CreateFeedbackDto, createdById: string) {
    return this.prisma.feedback.create({
      data: {
        ...createFeedbackDto,
        createdById,
        status: createFeedbackDto.status || FeedbackStatus.PENDIENTE,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(userId: string, userRoles: string[]) {
    const isAdmin = userRoles.includes('ADMIN');

    // Si es admin, puede ver todos los feedbacks
    if (isAdmin) {
      return this.prisma.feedback.findMany({
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Si no es admin, solo puede ver los feedbacks donde es destinatario
    return this.prisma.feedback.findMany({
      where: {
        recipientId: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, userRoles: string[]) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!feedback) {
      throw new NotFoundException(`Feedback con ID ${id} no encontrado`);
    }

    const isAdmin = userRoles.includes('ADMIN');
    const isRecipient = feedback.recipientId === userId;
    const isCreator = feedback.createdById === userId;

    // Solo admin o destinatario pueden ver el feedback
    if (!isAdmin && !isRecipient && !isCreator) {
      throw new ForbiddenException('No tienes permiso para ver este feedback');
    }

    return feedback;
  }

  async update(id: string, updateFeedbackDto: UpdateFeedbackDto, userId: string, userRoles: string[]) {
    const feedback = await this.findOne(id, userId, userRoles);

    const isAdmin = userRoles.includes('ADMIN');
    const isRecipient = feedback.recipientId === userId;

    // Solo admin o destinatario pueden actualizar
    if (!isAdmin && !isRecipient) {
      throw new ForbiddenException('No tienes permiso para actualizar este feedback');
    }

    // Si el destinatario está respondiendo, actualizar response y respondedAt
    const updateData: any = { ...updateFeedbackDto };
    if (updateFeedbackDto.response && isRecipient && !feedback.response) {
      updateData.respondedAt = new Date();
    }

    return this.prisma.feedback.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string, userRoles: string[]) {
    const feedback = await this.findOne(id, userId, userRoles);

    const isAdmin = userRoles.includes('ADMIN');
    const isCreator = feedback.createdById === userId;

    // Solo admin o creador pueden eliminar
    if (!isAdmin && !isCreator) {
      throw new ForbiddenException('No tienes permiso para eliminar este feedback');
    }

    return this.prisma.feedback.delete({
      where: { id },
    });
  }

  // Métricas de feedback por área
  async getFeedbackMetrics(area?: string) {
    const where = area ? { area } : {};

    const total = await this.prisma.feedback.count({ where });
    const byStatus = await this.prisma.feedback.groupBy({
      by: ['status'],
      where,
      _count: true,
    });
    const byProcess = await this.prisma.feedback.groupBy({
      by: ['process'],
      where,
      _count: true,
    });

    const pending = await this.prisma.feedback.count({
      where: { ...where, status: FeedbackStatus.PENDIENTE },
    });
    const resolved = await this.prisma.feedback.count({
      where: { ...where, status: FeedbackStatus.RESUELTO },
    });

    return {
      total,
      pending,
      resolved,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byProcess: byProcess.reduce((acc, item) => {
        acc[item.process] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}


