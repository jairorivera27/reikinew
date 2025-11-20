import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOkrDto } from './dto/create-okr.dto';
import { UpdateOkrDto } from './dto/update-okr.dto';
import { CreateKeyResultDto } from './dto/create-key-result.dto';
import { UpdateKeyResultDto } from './dto/update-key-result.dto';
import { CreateOkrUpdateDto } from './dto/create-okr-update.dto';
import { CreateKrTaskDto } from './dto/create-kr-task.dto';
import { UpdateKrTaskDto } from './dto/update-kr-task.dto';
import { TaskStatus } from '../common/types/enums';

@Injectable()
export class OkrService {
  constructor(private prisma: PrismaService) {}

  // OKR CRUD
  async create(createOkrDto: CreateOkrDto) {
    return this.prisma.oKR.create({
      data: createOkrDto,
      include: {
        owner: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
        keyResults: {
          include: {
            tasks: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
  }

  async findAll(filters?: { area?: string; period?: string; ownerId?: string }) {
    return this.prisma.oKR.findMany({
      where: {
        ...(filters?.area && { area: filters.area as any }),
        ...(filters?.period && { period: filters.period as any }),
        ...(filters?.ownerId && { ownerId: filters.ownerId }),
        isActive: true,
      },
      include: {
        owner: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
        keyResults: {
          include: {
            tasks: {
              orderBy: { order: 'asc' },
            },
          },
        },
        updates: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const okr = await this.prisma.oKR.findUnique({
      where: { id },
      include: {
        owner: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
        keyResults: {
          include: {
            tasks: {
              orderBy: { order: 'asc' },
            },
          },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: true,
          },
        },
      },
    });

    if (!okr) {
      throw new NotFoundException(`OKR con ID ${id} no encontrado`);
    }

    return okr;
  }

  async update(id: string, updateOkrDto: UpdateOkrDto) {
    await this.findOne(id);
    return this.prisma.oKR.update({
      where: { id },
      data: updateOkrDto,
      include: {
        owner: true,
        keyResults: {
          include: {
            tasks: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.oKR.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Key Results
  async createKeyResult(okrId: string, createKeyResultDto: CreateKeyResultDto) {
    await this.findOne(okrId);
    return this.prisma.keyResult.create({
      data: {
        ...createKeyResultDto,
        okrId,
      },
    });
  }

  async updateKeyResult(id: string, updateKeyResultDto: UpdateKeyResultDto) {
    return this.prisma.keyResult.update({
      where: { id },
      data: updateKeyResultDto,
    });
  }

  async deleteKeyResult(id: string) {
    return this.prisma.keyResult.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Updates
  async createUpdate(createOkrUpdateDto: CreateOkrUpdateDto) {
    return this.prisma.oKRUpdate.create({
      data: createOkrUpdateDto,
      include: {
        user: true,
        okr: true,
      },
    });
  }

  // KR Tasks
  async createKrTask(krId: string, createKrTaskDto: CreateKrTaskDto) {
    // Verificar que el KR existe
    const kr = await this.prisma.keyResult.findUnique({
      where: { id: krId },
    });

    if (!kr) {
      throw new NotFoundException(`Key Result con ID ${krId} no encontrado`);
    }

    const task = await this.prisma.kRTask.create({
      data: {
        ...createKrTaskDto,
        krId,
        status: createKrTaskDto.status || TaskStatus.PENDIENTE,
        weight: createKrTaskDto.weight || 1.0,
      },
    });

    // Actualizar el currentValue del KR basado en las tareas completadas
    await this.updateKrProgressFromTasks(krId);

    return task;
  }

  async updateKrTask(id: string, updateKrTaskDto: UpdateKrTaskDto) {
    const task = await this.prisma.kRTask.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException(`Tarea con ID ${id} no encontrada`);
    }

    const updateData: any = { ...updateKrTaskDto };
    
    // Si se marca como completado, establecer fecha de completado
    if (updateKrTaskDto.status === TaskStatus.COMPLETADO && !task.completedAt) {
      updateData.completedAt = new Date();
    } else if (updateKrTaskDto.status !== TaskStatus.COMPLETADO) {
      updateData.completedAt = null;
    }

    const updatedTask = await this.prisma.kRTask.update({
      where: { id },
      data: updateData,
    });

    // Actualizar el currentValue del KR basado en las tareas completadas
    await this.updateKrProgressFromTasks(task.krId);

    return updatedTask;
  }

  async deleteKrTask(id: string) {
    const task = await this.prisma.kRTask.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException(`Tarea con ID ${id} no encontrada`);
    }

    await this.prisma.kRTask.delete({
      where: { id },
    });

    // Actualizar el currentValue del KR basado en las tareas completadas
    await this.updateKrProgressFromTasks(task.krId);

    return { message: 'Tarea eliminada correctamente' };
  }

  // Actualizar el progreso del KR basado en las tareas completadas
  private async updateKrProgressFromTasks(krId: string) {
    const kr = await this.prisma.keyResult.findUnique({
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

    await this.prisma.keyResult.update({
      where: { id: krId },
      data: {
        currentValue: Math.round(progress * 100) / 100, // Redondear a 2 decimales
      },
    });
  }

  // Dashboard metrics
  async getDashboardMetrics(area?: string) {
    const okrs = await this.prisma.oKR.findMany({
      where: {
        isActive: true,
        ...(area && { area: area as any }),
      },
      include: {
        keyResults: {
          include: {
            tasks: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    const totalOkrs = okrs.length;
    const totalKrs = okrs.reduce((acc, okr) => acc + okr.keyResults.length, 0);
    const completedKrs = okrs.reduce(
      (acc, okr) =>
        acc +
        okr.keyResults.filter(
          (kr) => kr.currentValue && kr.targetValue && kr.currentValue >= kr.targetValue,
        ).length,
      0,
    );

    const averageProgress =
      okrs.length > 0
        ? okrs.reduce((acc, okr) => {
            const krProgress =
              okr.keyResults.length > 0
                ? okr.keyResults.reduce((sum, kr) => {
                    if (kr.targetValue && kr.currentValue) {
                      return sum + (kr.currentValue / kr.targetValue) * 100;
                    }
                    return sum;
                  }, 0) / okr.keyResults.length
                : 0;
            return acc + krProgress;
          }, 0) / okrs.length
        : 0;

    return {
      totalOkrs,
      totalKrs,
      completedKrs,
      averageProgress: Math.round(averageProgress),
    };
  }
}


